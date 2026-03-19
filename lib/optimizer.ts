import type { 
  Warehouse, 
  DistributionCenter, 
  DemandForecast, 
  CustomerAllocation,
  AllocationResult,
  WarehouseInventory,
  WarehouseSchedule,
  Rate,
  SKU,
  Vehicle
} from './store'

// City coordinates for distance calculation
const cityCoordinates: Record<string, { lat: number; lon: number }> = {
  // Warehouses (v2 defaults)
  'el paso': { lat: 31.7619, lon: -106.4850 },
  'buena park': { lat: 33.8675, lon: -117.9981 },
  'pooler': { lat: 32.1046, lon: -81.2470 },
  'northampton': { lat: 40.6862, lon: -75.4977 },
  'valley view': { lat: 33.8675, lon: -117.9981 },
  'seabrook': { lat: 32.1046, lon: -81.2470 },
  'cesanek': { lat: 40.6862, lon: -75.4977 },
  // US Cities
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'dallas': { lat: 32.7767, lon: -96.7970 },
  'houston': { lat: 29.7604, lon: -95.3698 },
  'phoenix': { lat: 33.4484, lon: -112.0740 },
  'seattle': { lat: 47.6062, lon: -122.3321 },
  'denver': { lat: 39.7392, lon: -104.9903 },
  'atlanta': { lat: 33.749, lon: -84.388 },
  'miami': { lat: 25.7617, lon: -80.1918 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'detroit': { lat: 42.3314, lon: -83.0458 },
}

function getCoordinates(address: string): { lat: number; lon: number } | null {
  const normalizedAddress = address.toLowerCase().trim()
  
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (normalizedAddress.includes(city)) {
      return coords
    }
  }
  
  return null
}

function calculateDistanceHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface DistanceEntry {
  warehouse: string
  warehouseAddress: string
  dcChannel: string
  dcState: string
  dcAddress: string
  distanceMiles: number
}

export function calculateDistanceMatrix(
  warehouses: Warehouse[],
  distributionCenters: DistributionCenter[]
): DistanceEntry[] {
  const distances: DistanceEntry[] = []
  
  for (const wh of warehouses) {
    const whCoords = getCoordinates(wh.address)
    
    for (const dc of distributionCenters) {
      const dcCoords = getCoordinates(dc.address)
      
      let distance = 500 // Default if geocoding fails
      
      if (whCoords && dcCoords) {
        distance = calculateDistanceHaversine(whCoords.lat, whCoords.lon, dcCoords.lat, dcCoords.lon)
      }
      
      distances.push({
        warehouse: wh.name,
        warehouseAddress: wh.address,
        dcChannel: dc.channel,
        dcState: dc.state,
        dcAddress: dc.address,
        distanceMiles: Math.round(distance * 10) / 10,
      })
    }
  }
  
  return distances
}

export function calculateShippingCost(distance: number, ratePer100Miles: number): number {
  return (distance * ratePer100Miles) / 100
}

// Calculate items per container based on SKU dimensions and vehicle capacity
export function calculateItemsPerContainer(sku: SKU, vehicle: Vehicle): number {
  // Calculate item volume in cubic feet
  const itemVolumeCuFt = (sku.lengthIn * sku.widthIn * sku.heightIn) / 1728 // Convert cu in to cu ft
  
  // Calculate max items by volume
  const maxByVolume = Math.floor(vehicle.maxVolumeCuFt / itemVolumeCuFt)
  
  // Calculate max items by weight
  const maxByWeight = Math.floor(vehicle.maxWeightLbs / sku.weightLbs)
  
  // Return the minimum (limiting factor)
  return Math.min(maxByVolume, maxByWeight)
}

// Calculate cost per unit per mile based on carrier rates
export function calculateRatePerUnitPerMile(
  distance: number,
  rates: Rate[],
  carrierId: string | null,
  sku: SKU,
  vehicle: Vehicle
): { ratePerUnit: number; ratePerMile: number; itemsPerContainer: number } {
  if (!carrierId) {
    return { ratePerUnit: 0, ratePerMile: 0, itemsPerContainer: 0 }
  }
  
  // Find applicable rate rule for this carrier and distance
  const carrierRates = rates.filter(r => r.carrierId === carrierId)
  const applicableRate = carrierRates.find(
    r => distance >= r.minDistance && distance <= r.maxDistance
  )
  
  if (!applicableRate) {
    // Use first rate for this carrier as fallback
    const fallbackRate = carrierRates[0]
    if (!fallbackRate) {
      return { ratePerUnit: 0, ratePerMile: 0, itemsPerContainer: 0 }
    }
  }
  
  const rate = applicableRate || carrierRates[0]
  const itemsPerContainer = calculateItemsPerContainer(sku, vehicle)
  
  if (itemsPerContainer <= 0) {
    return { ratePerUnit: 0, ratePerMile: 0, itemsPerContainer: 0 }
  }
  
  // Calculate total container cost for this trip
  // Total cost = fixed cost + max(rate_per_mile * distance, minimum_charge)
  const variableCost = Math.max(rate.ratePerMile * distance, rate.minimumCharge)
  const totalContainerCost = rate.fixedCost + variableCost
  
  // Cost per unit for the whole trip = total container cost / items per container
  const costPerUnit = totalContainerCost / itemsPerContainer
  
  // Rate per unit per 100 miles (for display/comparison) = (rate_per_mile * 100) / items
  // This should be constant regardless of distance
  const ratePerUnitPer100Miles = (rate.ratePerMile * 100) / itemsPerContainer
  
  return { 
    ratePerUnit: Math.round(ratePerUnitPer100Miles * 10000) / 10000,
    ratePerMile: rate.ratePerMile,
    itemsPerContainer 
  }
}

// Calculate effective market rate from carrier rates
export function calculateEffectiveRate(
  rates: Rate[],
  carrierId: string | null,
  sku: SKU | undefined,
  vehicle: Vehicle | undefined,
  averageDistance: number = 500
): number {
  if (!carrierId || !sku || !vehicle) {
    return 0.20 // Default fallback
  }
  
  const result = calculateRatePerUnitPerMile(averageDistance, rates, carrierId, sku, vehicle)
  return result.ratePerUnit
}

// Calculate available inventory for a specific week
// If selectedWarehouses is provided, unselected warehouses will have zero inventory
export function calculateAvailableInventory(
  week: 3 | 4,
  warehouseInventory: WarehouseInventory[],
  warehouseSchedule: WarehouseSchedule[],
  selectedWarehouses?: string[] // Optional: if provided, only these warehouses have inventory
): { name: string; sku: string; available: number }[] {
  const result: { name: string; sku: string; available: number }[] = []
  
  for (const schedule of warehouseSchedule) {
    // If selectedWarehouses is provided and this warehouse is not selected, set inventory to 0
    if (selectedWarehouses && selectedWarehouses.length > 0 && !selectedWarehouses.includes(schedule.warehouse)) {
      result.push({
        name: schedule.warehouse,
        sku: schedule.sku,
        available: 0,
      })
      continue
    }
    
    const inventoryEntry = warehouseInventory.find(
      inv => inv.warehouseName === schedule.warehouse && inv.skuCode === schedule.sku
    )
    const currentInv = inventoryEntry?.quantityOnHand || 0
    
    let available: number
    if (week === 3) {
      available = currentInv + schedule.incomingWeek3 - schedule.outgoingWeek1 - schedule.outgoingWeek2
    } else {
      available = currentInv + schedule.incomingWeek3 + schedule.incomingWeek4 - schedule.outgoingWeek1 - schedule.outgoingWeek2
    }
    
    result.push({
      name: schedule.warehouse,
      sku: schedule.sku,
      available: Math.max(0, available),
    })
  }
  
  return result
}

// Find applicable rate for a carrier and distance
export function findApplicableRate(
  carrierId: string,
  distanceMiles: number,
  rates: Rate[]
): Rate | null {
  return rates.find(
    r => r.carrierId === carrierId && 
         distanceMiles >= r.minDistance && 
         distanceMiles < r.maxDistance
  ) || null
}

// Calculate unit shipping rate based on carrier rates
export function calculateUnitShippingRate(
  distanceMiles: number,
  carrierId: string | null,
  rates: Rate[],
  unitsPerLoad: number = 1000
): number {
  if (!carrierId) {
    return distanceMiles * 0.002 // Default fallback
  }
  
  const rate = findApplicableRate(carrierId, distanceMiles, rates)
  if (!rate) {
    return distanceMiles * 0.002
  }
  
  // Calculate: variable cost based on distance
  const variableCost = distanceMiles * rate.ratePerMile
  // Apply minimum charge if variable cost is less
  const effectiveVariableCost = Math.max(rate.minimumCharge, variableCost)
  // Total = fixed + variable
  const totalCost = rate.fixedCost + effectiveVariableCost
  
  // Cost per unit = total / units per load
  const costPerUnit = totalCost / unitsPerLoad
  
  return costPerUnit
}

interface AllocationInput {
  product: string
  warehouse: string
  channel: string
  state: string
  demand: number
  costPerUnit: number
  distanceMiles: number
  currentAvailable: number
  itemsPerContainer?: number
  calculationExplanation?: string
}

export interface ExtendedAllocationResult extends AllocationResult {
  itemsPerContainer?: number
  calculationExplanation?: string
}

interface LPResult {
  allocations: ExtendedAllocationResult[]
  totalCost: number
  marketRateExplanation?: string
}

// Greedy LP solver with inventory consideration
function solveLPWithInventory(
  allocationData: AllocationInput[],
  inventory: { name: string; available: number }[],
  warehouses: Warehouse[],
  ignoreCapacity: boolean = false
): LPResult | null {
  if (allocationData.length === 0) {
    return null
  }

  // Group demands by (product, channel, state)
  const demandGroups = new Map<string, { demand: number; routes: number[] }>()
  
  allocationData.forEach((item, idx) => {
    const key = `${item.product}|${item.channel}|${item.state}`
    if (!demandGroups.has(key)) {
      demandGroups.set(key, { demand: item.demand, routes: [] })
    }
    demandGroups.get(key)!.routes.push(idx)
  })

  const allocations: number[] = new Array(allocationData.length).fill(0)
  const inventoryUsed: number[] = new Array(allocationData.length).fill(0)
  const remainingInventory = new Map<string, number>()
  
  inventory.forEach(inv => {
    remainingInventory.set(inv.name, inv.available)
  })

  // For each demand group, allocate to cheapest routes first
  for (const [, group] of demandGroups) {
    let remainingDemand = group.demand
    
    const sortedRoutes = [...group.routes].sort(
      (a, b) => allocationData[a].costPerUnit - allocationData[b].costPerUnit
    )
    
    for (const routeIdx of sortedRoutes) {
      if (remainingDemand <= 0) break
      
      const route = allocationData[routeIdx]
      const warehouseName = route.warehouse
      const warehouseConfig = warehouses.find(w => w.name === warehouseName)
      
      let maxFromWarehouse = remainingDemand
      
      if (!ignoreCapacity && warehouseConfig) {
        const alreadyAllocated = allocations.reduce((sum, alloc, idx) => {
          return allocationData[idx].warehouse === warehouseName ? sum + alloc : sum
        }, 0)
        maxFromWarehouse = Math.min(maxFromWarehouse, warehouseConfig.capacity - alreadyAllocated)
      }
      
      if (maxFromWarehouse <= 0) continue
      
      const availableInv = remainingInventory.get(warehouseName) || 0
      const fromInventory = Math.min(availableInv, maxFromWarehouse)
      
      allocations[routeIdx] = maxFromWarehouse
      inventoryUsed[routeIdx] = fromInventory
      remainingDemand -= maxFromWarehouse
      
      if (fromInventory > 0) {
        remainingInventory.set(warehouseName, availableInv - fromInventory)
      }
    }
  }

  const results: AllocationResult[] = []
  let totalCost = 0
  
  allocationData.forEach((item, idx) => {
    if (allocations[idx] > 0.01) {
      const shipped = allocations[idx] - inventoryUsed[idx]
      const cost = shipped * item.costPerUnit
      totalCost += cost
      
      results.push({
        product: item.product,
        warehouse: item.warehouse,
        channel: item.channel,
        state: item.state,
        allocatedUnits: Math.round(allocations[idx] * 100) / 100,
        allocatedFromInv: Math.round(inventoryUsed[idx] * 100) / 100,
        allocatedShipped: Math.round(shipped * 100) / 100,
        costPerUnit: Math.round(item.costPerUnit * 10000) / 10000,
        distanceMiles: item.distanceMiles,
        totalCost: Math.round(cost * 100) / 100,
        itemsPerContainer: item.itemsPerContainer,
        calculationExplanation: item.calculationExplanation
      })
    }
  })

  return { allocations: results, totalCost: Math.round(totalCost * 100) / 100 }
}

// Smart optimization for a specific week
// Smart optimization for a specific week
// selectedWarehouses: only these warehouses have inventory for smart allocation
export function optimizeAllocationForWeek(
  week: 3 | 4,
  warehouses: Warehouse[],
  distributionCenters: DistributionCenter[],
  demandForecasts: DemandForecast[],
  warehouseInventory: WarehouseInventory[],
  warehouseSchedule: WarehouseSchedule[],
  rates: Rate[],
  tmsCarrierId: string | null,
  tmsShippingRate: number,
  selectedWarehouses?: string[],
  sku?: SKU,
  vehicle?: Vehicle
): LPResult | null {
  const distanceMatrix = calculateDistanceMatrix(warehouses, distributionCenters)
  // Pass selectedWarehouses - unselected warehouses will have 0 inventory
  const inventory = calculateAvailableInventory(week, warehouseInventory, warehouseSchedule, selectedWarehouses)
  
  let itemsPerContainer = 1000
  let capacityExplanation = "Using legacy default: 1000 items/container."
  if (sku && vehicle) {
    itemsPerContainer = calculateItemsPerContainer(sku, vehicle)
    capacityExplanation = `Container limit: ${itemsPerContainer} items (Min of Vol/Wt constraints).`
  }

  const allocationData: AllocationInput[] = []
  
  for (const demand of demandForecasts) {
    const demandUnits = week === 3 ? demand.demandWeek3 : demand.demandWeek4
    
    const relevantCosts = distanceMatrix.filter(
      d => d.dcChannel === demand.channel && d.dcState === demand.state
    )
    
    for (const cost of relevantCosts) {
      const warehouseName = cost.warehouse
      const whInventory = inventory.find(i => i.name === warehouseName)
      
      let costPerUnit: number
      let explanation = ""

      if (tmsCarrierId && rates.length > 0) {
        costPerUnit = calculateUnitShippingRate(cost.distanceMiles, tmsCarrierId, rates, itemsPerContainer)
        const rateObj = findApplicableRate(tmsCarrierId, cost.distanceMiles, rates)
        if (rateObj) {
          const varCost = cost.distanceMiles * rateObj.ratePerMile
          const totalC = rateObj.fixedCost + Math.max(rateObj.minimumCharge, varCost)
          explanation = `${capacityExplanation} Route cost: Fixed($${rateObj.fixedCost}) + Max(MinCharge $${rateObj.minimumCharge}, $${rateObj.ratePerMile}/mi * ${cost.distanceMiles}mi) = $${totalC.toFixed(2)}. Per Item: $${totalC.toFixed(2)} / ${itemsPerContainer} = $${costPerUnit.toFixed(4)}.`
        }
      } else {
        costPerUnit = calculateShippingCost(cost.distanceMiles, tmsShippingRate)
        explanation = `Fallback Market Rate. Cost per unit = (Distance ${cost.distanceMiles}mi * Rate $${tmsShippingRate}) / 100 = $${costPerUnit.toFixed(4)}.`
      }
      
      allocationData.push({
        product: demand.product,
        warehouse: warehouseName,
        channel: demand.channel,
        state: demand.state,
        demand: demandUnits,
        costPerUnit,
        distanceMiles: cost.distanceMiles,
        currentAvailable: whInventory?.available || 0,
        itemsPerContainer,
        calculationExplanation: explanation
      })
    }
  }
  
  const inventoryForSolver = inventory.map(i => ({ name: i.name, available: i.available }))
  return solveLPWithInventory(allocationData, inventoryForSolver, warehouses, false)
}

// Calculate customer cost for a specific week
// Calculate customer cost for a specific week
// selectedWarehouses: only these warehouses have inventory, others are zero
export function calculateCustomerCostForWeek(
  week: 3 | 4,
  warehouses: Warehouse[],
  distributionCenters: DistributionCenter[],
  customerAllocations: CustomerAllocation[],
  warehouseInventory: WarehouseInventory[],
  warehouseSchedule: WarehouseSchedule[],
  rates: Rate[],
  customerCarrierId: string | null,
  marketShippingRate: number,
  selectedWarehouses?: string[],
  sku?: SKU,
  vehicle?: Vehicle
): LPResult | null {
  const distanceMatrix = calculateDistanceMatrix(warehouses, distributionCenters)
  // Pass selectedWarehouses to filter inventory - unselected warehouses will have 0 inventory
  const inventory = calculateAvailableInventory(week, warehouseInventory, warehouseSchedule, selectedWarehouses)
  
  const results: ExtendedAllocationResult[] = []
  let totalCost = 0

  let itemsPerContainer = 1000
  let capacityExplanation = "Using legacy default: 1000 items/container."
  if (sku && vehicle) {
    itemsPerContainer = calculateItemsPerContainer(sku, vehicle)
    capacityExplanation = `Container limit: ${itemsPerContainer} items (Min of Vol/Wt constraints).`
  }
  
  const remainingInventory = new Map<string, number>()
  inventory.forEach(inv => {
    remainingInventory.set(inv.name, inv.available)
  })
  
  for (const alloc of customerAllocations) {
    const allocatedUnits = week === 3 ? alloc.allocatedUnitsWeek3 : alloc.allocatedUnitsWeek4
    if (allocatedUnits <= 0) continue
    
    const costEntry = distanceMatrix.find(
      d => d.warehouse === alloc.warehouse && 
           d.dcChannel === alloc.channel && 
           d.dcState === alloc.state
    )
    
    if (!costEntry) continue
    
    let costPerUnit: number
    let explanation = ""

    if (customerCarrierId && rates.length > 0) {
      costPerUnit = calculateUnitShippingRate(costEntry.distanceMiles, customerCarrierId, rates, itemsPerContainer)
      const rateObj = findApplicableRate(customerCarrierId, costEntry.distanceMiles, rates)
      if (rateObj) {
        const varCost = costEntry.distanceMiles * rateObj.ratePerMile
        const totalC = rateObj.fixedCost + Math.max(rateObj.minimumCharge, varCost)
        explanation = `${capacityExplanation} Route cost: Fixed($${rateObj.fixedCost}) + Max(MinCharge $${rateObj.minimumCharge}, $${rateObj.ratePerMile}/mi * ${costEntry.distanceMiles}mi) = $${totalC.toFixed(2)}. Per Item: $${totalC.toFixed(2)} / ${itemsPerContainer} = $${costPerUnit.toFixed(4)}.`
      }
    } else {
      costPerUnit = calculateShippingCost(costEntry.distanceMiles, marketShippingRate)
      explanation = `Fallback Market Rate. Cost per unit = (Distance ${costEntry.distanceMiles}mi * Rate $${marketShippingRate}) / 100 = $${costPerUnit.toFixed(4)}.`
    }
    
    const availableInv = remainingInventory.get(alloc.warehouse) || 0
    const fromInventory = Math.min(availableInv, allocatedUnits)
    const shipped = allocatedUnits - fromInventory
    const cost = shipped * costPerUnit
    
    remainingInventory.set(alloc.warehouse, availableInv - fromInventory)
    
    totalCost += cost
    results.push({
      product: alloc.product,
      warehouse: alloc.warehouse,
      channel: alloc.channel,
      state: alloc.state,
      allocatedUnits: Math.round(allocatedUnits * 100) / 100,
      allocatedFromInv: Math.round(fromInventory * 100) / 100,
      allocatedShipped: Math.round(shipped * 100) / 100,
      costPerUnit: Math.round(costPerUnit * 10000) / 10000,
      distanceMiles: costEntry.distanceMiles,
      totalCost: Math.round(cost * 100) / 100,
      itemsPerContainer,
      calculationExplanation: explanation
    })
  }
  
  return { 
    allocations: results, 
    totalCost: Math.round(totalCost * 100) / 100,
    marketRateExplanation: "Market Rate serves as a baseline estimate used when exact Carrier rates, SKU dimensions, or Vehicle capacities are not fully configured."
  }
}

// Detailed plan entry with cost info
export interface PlanDetailEntry {
  product: string
  warehouse: string
  channel: string
  state: string
  distanceMiles: number
  ratePerUnit: number  // $/unit/100mi
  unitsWeek3: number
  unitsWeek4: number
  costWeek3: number
  costWeek4: number
  itemsPerContainer?: number
  calculationExplanation?: string
}

export interface GeneratedPlanResult {
  allocations: CustomerAllocation[]
  details: PlanDetailEntry[]
  totalCostWeek3: number
  totalCostWeek4: number
  itemsPerContainer: number
  calculatedRatePerUnit: number
  marketRateExplanation?: string
}

// Generate customer plan using nearest warehouse
export function generateCustomerPlan(
  warehouses: Warehouse[],
  distributionCenters: DistributionCenter[],
  demandForecasts: DemandForecast[],
  selectedWarehouses?: string[]
): CustomerAllocation[] {
  if (!selectedWarehouses || selectedWarehouses.length === 0) return []
  
  const distanceMatrix = calculateDistanceMatrix(warehouses, distributionCenters)
  const newPlan: CustomerAllocation[] = []
  
  for (const demand of demandForecasts) {
    const relevantCosts = distanceMatrix
      .filter(d => 
        d.dcChannel === demand.channel && 
        d.dcState === demand.state &&
        selectedWarehouses.includes(d.warehouse)
      )
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
    
    if (relevantCosts.length > 0) {
      const nearestWarehouse = relevantCosts[0].warehouse
      
      newPlan.push({
        id: `${demand.id}-${nearestWarehouse}`,
        product: demand.product,
        warehouse: nearestWarehouse,
        channel: demand.channel,
        state: demand.state,
        allocatedUnitsWeek3: demand.demandWeek3,
        allocatedUnitsWeek4: demand.demandWeek4,
      })
    }
  }
  
  return newPlan
}

// Generate customer plan with full details including distance and costs
export function generateCustomerPlanWithDetails(
  warehouses: Warehouse[],
  distributionCenters: DistributionCenter[],
  demandForecasts: DemandForecast[],
  selectedWarehouses: string[] | undefined,
  rates: Rate[],
  carrierId: string | null,
  sku: SKU | undefined,
  vehicle: Vehicle | undefined
): GeneratedPlanResult {
  if (!selectedWarehouses || selectedWarehouses.length === 0) {
    return { 
      allocations: [], 
      details: [], 
      totalCostWeek3: 0, 
      totalCostWeek4: 0,
      itemsPerContainer: 0,
      calculatedRatePerUnit: 0
    }
  }
  
  const distanceMatrix = calculateDistanceMatrix(warehouses, distributionCenters)
  const allocations: CustomerAllocation[] = []
  const details: PlanDetailEntry[] = []
  let totalCostWeek3 = 0
  let totalCostWeek4 = 0
  
  // Calculate items per container and effective rate
  let itemsPerContainer = 0
  let calculatedRatePerUnit = 0.20 // Default fallback
  let marketRateExplanation = "Market Rate (e.g. $0.20/100mi) is a baseline estimate used when Carrier, SKU, or Vehicle are unconfigured."
  
  if (sku && vehicle) {
    itemsPerContainer = calculateItemsPerContainer(sku, vehicle)
    const volCuFt = ((sku.lengthIn * sku.widthIn * sku.heightIn) / 1728).toFixed(2)
    marketRateExplanation = `Container Limit: ${itemsPerContainer} items. Vehicle (Max Vol: ${vehicle.maxVolumeCuFt} cu.ft, Max Wt: ${vehicle.maxWeightLbs} lbs) vs SKU (Vol: ${volCuFt} cu.ft, Wt: ${sku.weightLbs} lbs). Computed via Min(Volume Limit, Weight Limit).`
  }
  
  for (const demand of demandForecasts) {
    const relevantCosts = distanceMatrix
      .filter(d => 
        d.dcChannel === demand.channel && 
        d.dcState === demand.state &&
        selectedWarehouses.includes(d.warehouse)
      )
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
    
    if (relevantCosts.length > 0) {
      const nearestRoute = relevantCosts[0]
      const distance = nearestRoute.distanceMiles
      
      // Calculate rate per unit based on carrier rates, SKU and vehicle
      let ratePerUnit = 0.20 // Default
      let explanation = "Using generic market rate fallback formula: Cost = (Distance * Rate per 100 Miles) / 100."

      if (sku && vehicle && carrierId) {
        const rateInfo = calculateRatePerUnitPerMile(distance, rates, carrierId, sku, vehicle)
        ratePerUnit = rateInfo.ratePerUnit
        calculatedRatePerUnit = ratePerUnit
        
        const applicableRate = findApplicableRate(carrierId, distance, rates)
        if (applicableRate) {
          explanation = `Rate Tier: $${applicableRate.ratePerMile}/mi. Cost per 100 miles = ($${applicableRate.ratePerMile} * 100) / ${itemsPerContainer} items = $${ratePerUnit.toFixed(4)}. Total Cost = (Distance ${distance}mi / 100) * $${ratePerUnit.toFixed(4)} * Total Units.`
        }
      }
      
      // Calculate costs
      const costW3 = (distance * ratePerUnit * demand.demandWeek3) / 100
      const costW4 = (distance * ratePerUnit * demand.demandWeek4) / 100
      
      totalCostWeek3 += costW3
      totalCostWeek4 += costW4
      
      allocations.push({
        id: `${demand.id}-${nearestRoute.warehouse}`,
        product: demand.product,
        warehouse: nearestRoute.warehouse,
        channel: demand.channel,
        state: demand.state,
        allocatedUnitsWeek3: demand.demandWeek3,
        allocatedUnitsWeek4: demand.demandWeek4,
      })
      
      details.push({
        product: demand.product,
        warehouse: nearestRoute.warehouse,
        channel: demand.channel,
        state: demand.state,
        distanceMiles: distance,
        ratePerUnit: ratePerUnit,
        unitsWeek3: demand.demandWeek3,
        unitsWeek4: demand.demandWeek4,
        costWeek3: Math.round(costW3 * 100) / 100,
        costWeek4: Math.round(costW4 * 100) / 100,
        itemsPerContainer,
        calculationExplanation: explanation
      })
    }
  }
  
  return { 
    allocations, 
    details, 
    totalCostWeek3: Math.round(totalCostWeek3 * 100) / 100, 
    totalCostWeek4: Math.round(totalCostWeek4 * 100) / 100,
    itemsPerContainer,
    calculatedRatePerUnit: Math.round(calculatedRatePerUnit * 10000) / 10000,
    marketRateExplanation
  }
}

// Validation
export interface ValidationResult {
  dc: string
  week: string
  demand: number
  allocated: number
  status: 'ok' | 'low' | 'high'
  difference: number
}

export function validateAllocations(
  demandForecasts: DemandForecast[],
  customerAllocations: CustomerAllocation[]
): ValidationResult[] {
  const results: ValidationResult[] = []
  
  for (const demand of demandForecasts) {
    for (const week of [3, 4] as const) {
      const required = week === 3 ? demand.demandWeek3 : demand.demandWeek4
      const allocated = customerAllocations
        .filter(a => a.channel === demand.channel && a.state === demand.state)
        .reduce((sum, a) => sum + (week === 3 ? a.allocatedUnitsWeek3 : a.allocatedUnitsWeek4), 0)
      
      const difference = allocated - required
      let status: 'ok' | 'low' | 'high' = 'ok'
      if (difference < 0) status = 'low'
      else if (difference > 0) status = 'high'
      
      results.push({
        dc: `${demand.channel}-${demand.state}`,
        week: `Week ${week}`,
        demand: required,
        allocated,
        status,
        difference,
      })
    }
  }
  
  return results
}
