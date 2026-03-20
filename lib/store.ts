import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Warehouse {
  id: string
  name: string
  address: string
  capacity: number
}

export interface DistributionCenter {
  id: string
  channel: string
  state: string
  address: string
}

export interface SKU {
  id: string
  skuCode: string
  name: string
  lengthIn: number
  widthIn: number
  heightIn: number
  weightLbs: number
  unitType: 'each' | 'case' | 'pallet'
}

export interface Carrier {
  id: string
  name: string
  mode: 'FTL' | 'LTL' | 'Container'
  description: string
}

export interface Rate {
  id: string
  carrierId: string
  carrierName: string
  mode: string
  minDistance: number
  maxDistance: number
  ratePerMile: number
  minimumCharge: number
  fixedCost: number
}

export interface Vehicle {
  id: string
  name: string
  maxWeightLbs: number
  maxVolumeCuFt: number
}

export interface WarehouseInventory {
  id: string
  warehouseName: string
  skuCode: string
  quantityOnHand: number
}

export interface WarehouseSchedule {
  id: string
  warehouse: string
  sku: string
  incomingWeek3: number
  incomingWeek4: number
  outgoingWeek1: number
  outgoingWeek2: number
}

export interface DemandForecast {
  id: string
  product: string
  channel: string
  state: string
  demandWeek3: number
  demandWeek4: number
}

export interface CustomerAllocation {
  id: string
  product: string
  warehouse: string
  channel: string
  state: string
  allocatedUnitsWeek3: number
  allocatedUnitsWeek4: number
}

export interface AllocationResult {
  product: string
  warehouse: string
  channel: string
  state: string
  allocatedUnits: number
  allocatedFromInv: number
  allocatedShipped: number
  costPerUnit: number
  distanceMiles: number
  totalCost: number
  itemsPerContainer?: number
  calculationExplanation?: string
}

export interface CustomerSettings {
  customerCarrierId: string | null
  tmsCarrierId: string | null
  selectedVehicleId: string | null
  selectedWarehouses: string[]
}

interface WarehouseStore {
  // Data
  warehouses: Warehouse[]
  distributionCenters: DistributionCenter[]
  skus: SKU[]
  carriers: Carrier[]
  rates: Rate[]
  vehicles: Vehicle[]
  warehouseInventory: WarehouseInventory[]
  warehouseSchedule: WarehouseSchedule[]
  demandForecasts: DemandForecast[]
  customerAllocations: CustomerAllocation[]
  customerSettings: CustomerSettings
  marketShippingRate: number
  tmsShippingRate: number
  
  // Results (cached)
  smartResultsWeek3: AllocationResult[] | null
  smartCostWeek3: number | null
  smartResultsWeek4: AllocationResult[] | null
  smartCostWeek4: number | null
  customerResultsWeek3: AllocationResult[] | null
  customerCostWeek3: number | null
  customerResultsWeek4: AllocationResult[] | null
  customerCostWeek4: number | null
  lastCalculatedHash: string | null // Hash of config when results were calculated
  
  // Actions - Warehouses
  setWarehouses: (warehouses: Warehouse[]) => void
  addWarehouse: (warehouse: Warehouse) => void
  updateWarehouse: (id: string, warehouse: Partial<Warehouse>) => void
  deleteWarehouse: (id: string) => void
  
  // Actions - Distribution Centers
  setDistributionCenters: (dcs: DistributionCenter[]) => void
  addDistributionCenter: (dc: DistributionCenter) => void
  updateDistributionCenter: (id: string, dc: Partial<DistributionCenter>) => void
  deleteDistributionCenter: (id: string) => void
  
  // Actions - SKUs
  setSkus: (skus: SKU[]) => void
  addSku: (sku: SKU) => void
  updateSku: (id: string, sku: Partial<SKU>) => void
  deleteSku: (id: string) => void
  
  // Actions - Carriers
  setCarriers: (carriers: Carrier[]) => void
  addCarrier: (carrier: Carrier) => void
  updateCarrier: (id: string, carrier: Partial<Carrier>) => void
  deleteCarrier: (id: string) => void
  
  // Actions - Rates
  setRates: (rates: Rate[]) => void
  addRate: (rate: Rate) => void
  updateRate: (id: string, rate: Partial<Rate>) => void
  deleteRate: (id: string) => void
  
  // Actions - Vehicles
  setVehicles: (vehicles: Vehicle[]) => void
  addVehicle: (vehicle: Vehicle) => void
  
  // Actions - Inventory
  setWarehouseInventory: (inventory: WarehouseInventory[]) => void
  addWarehouseInventory: (inventory: Omit<WarehouseInventory, 'id'>) => void
  updateWarehouseInventory: (id: string, inventory: Partial<WarehouseInventory>) => void
  deleteWarehouseInventory: (index: number) => void
  
  // Actions - Schedule
  setWarehouseSchedule: (schedule: WarehouseSchedule[]) => void
  addWarehouseSchedule: (schedule: Omit<WarehouseSchedule, 'id'>) => void
  updateWarehouseSchedule: (id: string, schedule: Partial<WarehouseSchedule>) => void
  deleteWarehouseSchedule: (index: number) => void
  
  // Actions - Rates
  setMarketShippingRate: (rate: number) => void
  
  // Actions - Demand
  setDemandForecasts: (demands: DemandForecast[]) => void
  addDemandForecast: (demand: DemandForecast) => void
  updateDemandForecast: (id: string, demand: Partial<DemandForecast>) => void
  deleteDemandForecast: (id: string) => void
  
  // Actions - Customer Allocation
  setCustomerAllocations: (allocations: CustomerAllocation[]) => void
  addCustomerAllocation: (allocation: CustomerAllocation) => void
  updateCustomerAllocation: (id: string, allocation: Partial<CustomerAllocation>) => void
  deleteCustomerAllocation: (id: string) => void
  
  // Actions - Settings
  setCustomerSettings: (settings: Partial<CustomerSettings>) => void
  setShippingRates: (market: number, tms: number) => void
  
  // Actions - Results
  setSmartResults: (week: 3 | 4, results: AllocationResult[] | null, cost: number | null) => void
  setCustomerResults: (week: 3 | 4, results: AllocationResult[] | null, cost: number | null) => void
  setCalculatedHash: (hash: string) => void
  getConfigHash: () => string
  clearResults: () => void
  
  resetToDefaults: () => void
  importConfig: (config: ExportConfig) => void
  exportConfig: () => ExportConfig
}

export interface ExportConfig {
  warehouses: Warehouse[]
  distributionCenters: DistributionCenter[]
  skus: SKU[]
  carriers: Carrier[]
  rates: Rate[]
  vehicles: Vehicle[]
  warehouseInventory: WarehouseInventory[]
  warehouseSchedule: WarehouseSchedule[]
  demandForecasts: DemandForecast[]
  customerAllocations: CustomerAllocation[]
  customerSettings: CustomerSettings
  marketShippingRate: number
  tmsShippingRate: number
}

const defaultWarehouses: Warehouse[] = [
  { id: '1', name: 'EL PASO', address: '12100 Emerald Pass Drive, El Paso, TX 79936', capacity: 10000 },
  { id: '2', name: 'Valley View', address: '6800 Valley View St, Buena Park, CA 90620', capacity: 12000 },
  { id: '3', name: 'Seabrook', address: '300 Seabrook Parkway, Pooler, GA 31322', capacity: 9000 },
  { id: '4', name: 'Cesanek', address: '175 Cesanek Rd., Northampton, PA 18067', capacity: 11000 },
]

const defaultDistributionCenters: DistributionCenter[] = [
  { id: '1', channel: 'Amazon', state: 'CA', address: '123 Market St, San Francisco, CA 94105' },
  { id: '2', channel: 'Walmart', state: 'TX', address: '456 Commerce Blvd, Dallas, TX 75201' },
  { id: '3', channel: 'Target', state: 'GA', address: '789 Logistics Way, Atlanta, GA 30301' },
  { id: '4', channel: 'Amazon', state: 'PA', address: '101 Fulfillment Dr, Philadelphia, PA 19101' },
]

const defaultSkus: SKU[] = [
  { id: '1', skuCode: '32Q21K', name: 'Widget Standard', lengthIn: 12, widthIn: 8, heightIn: 6, weightLbs: 5, unitType: 'each' },
  { id: '2', skuCode: '32Q22K', name: 'Widget Premium', lengthIn: 14, widthIn: 10, heightIn: 8, weightLbs: 7, unitType: 'each' },
]

const defaultCarriers: Carrier[] = [
  { id: '1', name: 'Market Carrier', mode: 'FTL', description: 'Standard market rate carrier' },
  { id: '2', name: 'TMS', mode: 'FTL', description: 'TMS optimized carrier' },
]

const defaultRates: Rate[] = [
  { id: '1', carrierId: '1', carrierName: 'Market Carrier', mode: 'FTL', minDistance: 0, maxDistance: 500, ratePerMile: 3.5, minimumCharge: 250, fixedCost: 50 },
  { id: '2', carrierId: '1', carrierName: 'Market Carrier', mode: 'FTL', minDistance: 500, maxDistance: 1500, ratePerMile: 3.0, minimumCharge: 500, fixedCost: 75 },
  { id: '3', carrierId: '2', carrierName: 'TMS', mode: 'FTL', minDistance: 0, maxDistance: 500, ratePerMile: 2.8, minimumCharge: 200, fixedCost: 40 },
  { id: '4', carrierId: '2', carrierName: 'TMS', mode: 'FTL', minDistance: 500, maxDistance: 1500, ratePerMile: 2.5, minimumCharge: 400, fixedCost: 60 },
]

const defaultVehicles: Vehicle[] = [
  { id: '1', name: '53ft Trailer', maxWeightLbs: 45000, maxVolumeCuFt: 3000 },
  { id: '2', name: '48ft Trailer', maxWeightLbs: 42000, maxVolumeCuFt: 2700 },
]

const defaultWarehouseInventory: WarehouseInventory[] = [
  { id: '1', warehouseName: 'EL PASO', skuCode: '32Q21K', quantityOnHand: 0 },
  { id: '2', warehouseName: 'Valley View', skuCode: '32Q21K', quantityOnHand: 0 },
  { id: '3', warehouseName: 'Seabrook', skuCode: '32Q21K', quantityOnHand: 0 },
  { id: '4', warehouseName: 'Cesanek', skuCode: '32Q21K', quantityOnHand: 0 },
]

const defaultWarehouseSchedule: WarehouseSchedule[] = [
  { id: '1', warehouse: 'EL PASO', sku: '32Q21K', incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 },
  { id: '2', warehouse: 'Valley View', sku: '32Q21K', incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 },
  { id: '3', warehouse: 'Seabrook', sku: '32Q21K', incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 },
  { id: '4', warehouse: 'Cesanek', sku: '32Q21K', incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 },
]

const defaultDemandForecasts: DemandForecast[] = [
  { id: '1', product: '32Q21K', channel: 'Amazon', state: 'CA', demandWeek3: 2000, demandWeek4: 2200 },
  { id: '2', product: '32Q21K', channel: 'Walmart', state: 'TX', demandWeek3: 1500, demandWeek4: 1800 },
  { id: '3', product: '32Q21K', channel: 'Target', state: 'GA', demandWeek3: 1200, demandWeek4: 1400 },
  { id: '4', product: '32Q21K', channel: 'Amazon', state: 'PA', demandWeek3: 1800, demandWeek4: 2000 },
]

const defaultCustomerAllocations: CustomerAllocation[] = []

const defaultCustomerSettings: CustomerSettings = {
  customerCarrierId: '1',
  tmsCarrierId: '2',
  selectedVehicleId: '1',
  selectedWarehouses: ['EL PASO', 'Valley View'],
}

export const useWarehouseStore = create<WarehouseStore>()(
  persist(
    (set, get) => ({
      warehouses: defaultWarehouses,
      distributionCenters: defaultDistributionCenters,
      skus: defaultSkus,
      carriers: defaultCarriers,
      rates: defaultRates,
      vehicles: defaultVehicles,
      warehouseInventory: defaultWarehouseInventory,
      warehouseSchedule: defaultWarehouseSchedule,
      demandForecasts: defaultDemandForecasts,
      customerAllocations: defaultCustomerAllocations,
      customerSettings: defaultCustomerSettings,
      marketShippingRate: 0.20,
      tmsShippingRate: 0.15,
      
      smartResultsWeek3: null,
      smartCostWeek3: null,
      smartResultsWeek4: null,
      smartCostWeek4: null,
      customerResultsWeek3: null,
      customerCostWeek3: null,
            customerResultsWeek4: null,
      customerCostWeek4: null,
      lastCalculatedHash: null,
      
      // Warehouses
      setWarehouses: (warehouses) => set({ warehouses }),
      addWarehouse: (warehouse) => set((state) => ({ warehouses: [...state.warehouses, warehouse] })),
      updateWarehouse: (id, warehouse) => set((state) => ({
        warehouses: state.warehouses.map((w) => w.id === id ? { ...w, ...warehouse } : w)
      })),
      deleteWarehouse: (id) => set((state) => ({
        warehouses: state.warehouses.filter((w) => w.id !== id)
      })),
      
      // Distribution Centers
      setDistributionCenters: (distributionCenters) => set({ distributionCenters }),
      addDistributionCenter: (dc) => set((state) => ({
        distributionCenters: [...state.distributionCenters, dc]
      })),
      updateDistributionCenter: (id, dc) => set((state) => ({
        distributionCenters: state.distributionCenters.map((d) => d.id === id ? { ...d, ...dc } : d)
      })),
      deleteDistributionCenter: (id) => set((state) => ({
        distributionCenters: state.distributionCenters.filter((d) => d.id !== id)
      })),
      
      // SKUs
      setSkus: (skus) => set({ skus }),
      addSku: (sku) => set((state) => ({ skus: [...state.skus, sku] })),
      updateSku: (id, sku) => set((state) => ({
        skus: state.skus.map((s) => s.id === id ? { ...s, ...sku } : s)
      })),
      deleteSku: (id) => set((state) => ({
        skus: state.skus.filter((s) => s.id !== id)
      })),
      
      // Carriers
      setCarriers: (carriers) => set({ carriers }),
      addCarrier: (carrier) => set((state) => ({ carriers: [...state.carriers, carrier] })),
      updateCarrier: (id, carrier) => set((state) => ({
        carriers: state.carriers.map((c) => c.id === id ? { ...c, ...carrier } : c)
      })),
      deleteCarrier: (id) => set((state) => ({
        carriers: state.carriers.filter((c) => c.id !== id)
      })),
      
      // Rates
      setRates: (rates) => set({ rates }),
      addRate: (rate) => set((state) => ({ rates: [...state.rates, rate] })),
      updateRate: (id, rate) => set((state) => ({
        rates: state.rates.map((r) => r.id === id ? { ...r, ...rate } : r)
      })),
      deleteRate: (id) => set((state) => ({
        rates: state.rates.filter((r) => r.id !== id)
      })),
      
      // Vehicles
      setVehicles: (vehicles) => set({ vehicles }),
      addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
      
      // Inventory
      setWarehouseInventory: (warehouseInventory) => set({ warehouseInventory }),
      addWarehouseInventory: (inventory) => set((state) => ({
        warehouseInventory: [...state.warehouseInventory, { ...inventory, id: String(Date.now()) }]
      })),
      updateWarehouseInventory: (id, inventory) => set((state) => ({
        warehouseInventory: state.warehouseInventory.map((i) => i.id === id ? { ...i, ...inventory } : i)
      })),
      deleteWarehouseInventory: (index) => set((state) => ({
        warehouseInventory: state.warehouseInventory.filter((_, i) => i !== index)
      })),
      
      // Schedule
      setWarehouseSchedule: (warehouseSchedule) => set({ warehouseSchedule }),
      addWarehouseSchedule: (schedule) => set((state) => ({
        warehouseSchedule: [...state.warehouseSchedule, { ...schedule, id: String(Date.now()) }]
      })),
      updateWarehouseSchedule: (id, schedule) => set((state) => ({
        warehouseSchedule: state.warehouseSchedule.map((s) => s.id === id ? { ...s, ...schedule } : s)
      })),
      deleteWarehouseSchedule: (index) => set((state) => ({
        warehouseSchedule: state.warehouseSchedule.filter((_, i) => i !== index)
      })),
      
      // Shipping Rate
      setMarketShippingRate: (rate) => set({ marketShippingRate: rate }),
      
      // Demand
      setDemandForecasts: (demandForecasts) => set({ demandForecasts }),
      addDemandForecast: (demand) => set((state) => ({
        demandForecasts: [...state.demandForecasts, demand]
      })),
      updateDemandForecast: (id, demand) => set((state) => ({
        demandForecasts: state.demandForecasts.map((d) => d.id === id ? { ...d, ...demand } : d)
      })),
      deleteDemandForecast: (id) => set((state) => ({
        demandForecasts: state.demandForecasts.filter((d) => d.id !== id)
      })),
      
      // Customer Allocations
      setCustomerAllocations: (customerAllocations) => set({ customerAllocations }),
      addCustomerAllocation: (allocation) => set((state) => ({
        customerAllocations: [...state.customerAllocations, allocation]
      })),
      updateCustomerAllocation: (id, allocation) => set((state) => ({
        customerAllocations: state.customerAllocations.map((a) => a.id === id ? { ...a, ...allocation } : a)
      })),
      deleteCustomerAllocation: (id) => set((state) => ({
        customerAllocations: state.customerAllocations.filter((a) => a.id !== id)
      })),
      
      // Settings
      setCustomerSettings: (settings) => set((state) => ({
        customerSettings: { ...state.customerSettings, ...settings }
      })),
      setShippingRates: (market, tms) => set({ marketShippingRate: market, tmsShippingRate: tms }),
      
      // Results
      setSmartResults: (week, results, cost) => set(
        week === 3 
          ? { smartResultsWeek3: results, smartCostWeek3: cost }
          : { smartResultsWeek4: results, smartCostWeek4: cost }
      ),
      setCustomerResults: (week, results, cost) => set(
        week === 3
          ? { customerResultsWeek3: results, customerCostWeek3: cost }
          : { customerResultsWeek4: results, customerCostWeek4: cost }
      ),
      
      setCalculatedHash: (hash) => set({ lastCalculatedHash: hash }),
      
      getConfigHash: () => {
        const state = get()
        const configData = JSON.stringify({
          warehouses: state.warehouses,
          distributionCenters: state.distributionCenters,
          rates: state.rates,
          warehouseInventory: state.warehouseInventory,
          warehouseSchedule: state.warehouseSchedule,
          demandForecasts: state.demandForecasts,
          customerAllocations: state.customerAllocations,
          customerSettings: state.customerSettings,
          marketShippingRate: state.marketShippingRate,
        })
        let hash = 0
        for (let i = 0; i < configData.length; i++) {
          const char = configData.charCodeAt(i)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash
        }
        return hash.toString(16)
      },
      
      clearResults: () => set({
        smartResultsWeek3: null,
        smartCostWeek3: null,
        smartResultsWeek4: null,
        smartCostWeek4: null,
        customerResultsWeek3: null,
        customerCostWeek3: null,
        customerResultsWeek4: null,
        customerCostWeek4: null,
        lastCalculatedHash: null,
      }),
      
      resetToDefaults: () => set({
        warehouses: defaultWarehouses,
        distributionCenters: defaultDistributionCenters,
        skus: defaultSkus,
        carriers: defaultCarriers,
        rates: defaultRates,
        vehicles: defaultVehicles,
        warehouseInventory: defaultWarehouseInventory,
        warehouseSchedule: defaultWarehouseSchedule,
        demandForecasts: defaultDemandForecasts,
        customerAllocations: defaultCustomerAllocations,
        customerSettings: defaultCustomerSettings,
        marketShippingRate: 0.20,
        tmsShippingRate: 0.15,
        smartResultsWeek3: null,
        smartCostWeek3: null,
        smartResultsWeek4: null,
        smartCostWeek4: null,
        customerResultsWeek3: null,
        customerCostWeek3: null,
        customerResultsWeek4: null,
        customerCostWeek4: null,
        lastCalculatedHash: null,
      }),
      
      importConfig: (config) => set({
        warehouses: config.warehouses,
        distributionCenters: config.distributionCenters,
        skus: config.skus,
        carriers: config.carriers,
        rates: config.rates,
        vehicles: config.vehicles,
        warehouseInventory: config.warehouseInventory,
        warehouseSchedule: config.warehouseSchedule,
        demandForecasts: config.demandForecasts,
        customerAllocations: config.customerAllocations,
        customerSettings: config.customerSettings,
        marketShippingRate: config.marketShippingRate,
        tmsShippingRate: config.tmsShippingRate,
      }),
      
      exportConfig: () => {
        const state = get()
        return {
          warehouses: state.warehouses,
          distributionCenters: state.distributionCenters,
          skus: state.skus,
          carriers: state.carriers,
          rates: state.rates,
          vehicles: state.vehicles,
          warehouseInventory: state.warehouseInventory,
          warehouseSchedule: state.warehouseSchedule,
          demandForecasts: state.demandForecasts,
          customerAllocations: state.customerAllocations,
          customerSettings: state.customerSettings,
          marketShippingRate: state.marketShippingRate,
          tmsShippingRate: state.tmsShippingRate,
        }
      },
    }),
    {
      name: 'warehouse-storage-v2',
    }
  )
)
