"use client"

// Analysis page - compares customer vs smart allocation
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { useWarehouseStore } from "@/lib/store"
import { optimizeAllocationForWeek, calculateCustomerCostForWeek, getCoordinates } from "@/lib/optimizer"
import { 
  Zap, 
  DollarSign, 
  TrendingDown, 
  Percent, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  RefreshCw,
  Map as MapIcon,
  Database,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import type { AllocationResult } from "@/lib/store"

const CHART_COLORS = {
  customer: "#e46b08", // Slate 500 - Baseline
  smart: "#0cdfb1",    // Blue 500 - Optimized
}

export default function AnalysisPage() {
  const store = useWarehouseStore()
  
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeWeek, setActiveWeek] = useState<"week3" | "week4" | "summary">("summary")
  
  // Calculate config hash safely - store may not be fully hydrated yet
  const currentHash = useMemo(() => {
    try {
      if (store && typeof store.getConfigHash === 'function') {
        return store.getConfigHash()
      }
    } catch {
      // Store not ready
    }
    return null
  }, [store.warehouses, store.distributionCenters, store.rates, store.demandForecasts, store.customerAllocations, store.customerSettings])
  
  const isCacheValid = store.lastCalculatedHash !== null && store.lastCalculatedHash === currentHash
  
  // Use cached results from store
  const customerWeek3 = store.customerResultsWeek3
  const customerWeek4 = store.customerResultsWeek4
  const customerCost3 = store.customerCostWeek3
  const customerCost4 = store.customerCostWeek4
  const smartWeek3 = store.smartResultsWeek3
  const smartWeek4 = store.smartResultsWeek4
  const smartCost3 = store.smartCostWeek3
  const smartCost4 = store.smartCostWeek4

  const handleRunAnalysis = async () => {
    setIsCalculating(true)
    setError(null)

    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const selectedWarehouses = store.customerSettings?.selectedWarehouses || []
      
      // Customer costs
      const customerResult3 = calculateCustomerCostForWeek(
        3, store.warehouses, store.distributionCenters, store.customerAllocations,
        store.warehouseInventory, store.warehouseSchedule, store.rates,
        store.customerSettings?.customerCarrierId || null, store.marketShippingRate, selectedWarehouses
      )
      
      const customerResult4 = calculateCustomerCostForWeek(
        4, store.warehouses, store.distributionCenters, store.customerAllocations,
        store.warehouseInventory, store.warehouseSchedule, store.rates,
        store.customerSettings?.customerCarrierId || null, store.marketShippingRate, selectedWarehouses
      )
      
      // Smart optimization
      const smartResult3 = optimizeAllocationForWeek(
        3, store.warehouses, store.distributionCenters, store.demandForecasts,
        store.warehouseInventory, store.warehouseSchedule, store.rates,
        store.customerSettings?.tmsCarrierId || null, store.marketShippingRate, selectedWarehouses
      )
      
      const smartResult4 = optimizeAllocationForWeek(
        4, store.warehouses, store.distributionCenters, store.demandForecasts,
        store.warehouseInventory, store.warehouseSchedule, store.rates,
        store.customerSettings?.tmsCarrierId || null, store.marketShippingRate, selectedWarehouses
      )

      if (customerResult3 && customerResult4 && smartResult3 && smartResult4) {
        // Save to store for caching
        store.setCustomerResults(3, customerResult3.allocations, customerResult3.totalCost)
        store.setCustomerResults(4, customerResult4.allocations, customerResult4.totalCost)
        store.setSmartResults(3, smartResult3.allocations, smartResult3.totalCost)
        store.setSmartResults(4, smartResult4.allocations, smartResult4.totalCost)
        store.setCalculatedHash(currentHash || "")
      } else {
        setError("Could not calculate costs. Please check configuration and ensure customer plan is generated.")
      }
    } catch {
      setError("An error occurred during calculation.")
    } finally {
      setIsCalculating(false)
    }
  }

  // Calculate totals
  const customerCostTotal = (customerCost3 || 0) + (customerCost4 || 0)
  const smartCostTotal = (smartCost3 || 0) + (smartCost4 || 0)
  const savings = customerCostTotal - smartCostTotal
  const savingsPercent = customerCostTotal > 0 ? (savings / customerCostTotal) * 100 : 0

  const hasResults = customerWeek3 && customerWeek4 && smartWeek3 && smartWeek4

  const getWarehouseSummary = (allocation: AllocationResult[] | null) => {
    if (!allocation) return []
    return allocation.reduce(
      (acc, item) => {
        const existing = acc.find((a) => a.warehouse === item.warehouse)
        if (existing) {
          existing.units += item.allocatedUnits
          existing.cost += item.totalCost
        } else {
          acc.push({ warehouse: item.warehouse, units: item.allocatedUnits, cost: item.totalCost })
        }
        return acc
      },
      [] as { warehouse: string; units: number; cost: number }[]
    )
  }

  // Create side-by-side comparison data
  const createComparisonData = (customerAlloc: AllocationResult[] | null, smartAlloc: AllocationResult[] | null) => {
    if (!customerAlloc || !smartAlloc) return []
    
    // Group by DC (channel-state)
    const dcMap = new Map<string, { 
      dc: string, 
      channel: string, 
      state: string,
      customerWarehouse: string,
      customerUnits: number,
      customerCost: number,
      customerDistance: number,
      smartWarehouse: string,
      smartUnits: number,
      smartCost: number,
      smartDistance: number,
      savings: number
    }>()
    
    customerAlloc.forEach(item => {
      const key = `${item.channel}-${item.state}`
      dcMap.set(key, {
        dc: key,
        channel: item.channel,
        state: item.state,
        customerWarehouse: item.warehouse,
        customerUnits: item.allocatedUnits,
        customerCost: item.totalCost,
        customerDistance: item.distanceMiles,
        smartWarehouse: '',
        smartUnits: 0,
        smartCost: 0,
        smartDistance: 0,
        savings: 0
      })
    })
    
    smartAlloc.forEach(item => {
      const key = `${item.channel}-${item.state}`
      const existing = dcMap.get(key)
      if (existing) {
        existing.smartWarehouse = item.warehouse
        existing.smartUnits = item.allocatedUnits
        existing.smartCost = item.totalCost
        existing.smartDistance = item.distanceMiles
        existing.savings = existing.customerCost - item.totalCost
      }
    })
    
    return Array.from(dcMap.values())
  }

  const comparison3 = useMemo(() => createComparisonData(customerWeek3, smartWeek3), [customerWeek3, smartWeek3])
  const comparison4 = useMemo(() => createComparisonData(customerWeek4, smartWeek4), [customerWeek4, smartWeek4])

  const uniqueWarehouses = useMemo(() => {
    if (!hasResults) return []
    const whSet = new Set<string>()
    if (customerWeek3) customerWeek3.forEach(x => whSet.add(x.warehouse))
    if (smartWeek3) smartWeek3.forEach(x => whSet.add(x.warehouse))
    if (customerWeek4) customerWeek4.forEach(x => whSet.add(x.warehouse))
    if (smartWeek4) smartWeek4.forEach(x => whSet.add(x.warehouse))
    return Array.from(whSet).sort()
  }, [customerWeek3, smartWeek3, customerWeek4, smartWeek4, hasResults])

  // Chart data
  const comparisonData = useMemo(() => {
    if (!hasResults) return []
    
    const data: any[] = []
    
    const weeks = [
      { key: 'W3', name: 'Week 3', cWeek: customerWeek3, sWeek: smartWeek3 },
      { key: 'W4', name: 'Week 4', cWeek: customerWeek4, sWeek: smartWeek4 },
      { key: 'Total', name: 'Total', cWeek: [...(customerWeek3||[]), ...(customerWeek4||[])], sWeek: [...(smartWeek3||[]), ...(smartWeek4||[])] }
    ]

    weeks.forEach((w, idx) => {
      uniqueWarehouses.forEach(wh => {
        const c = w.cWeek?.filter(x => x.warehouse === wh).reduce((s, x) => s + x.totalCost, 0) || 0
        const s = w.sWeek?.filter(x => x.warehouse === wh).reduce((s, x) => s + x.totalCost, 0) || 0
        
        data.push({
          name: `${w.name}|${wh}`,
          warehouse: wh,
          group: w.name,
          Customer: c,
          Smart: s
        })
      })
      
      // 加入一个空条目来在视图中分割 Week 3 / Week 4 / Total 组别
      if (idx < weeks.length - 1) {
        data.push({
          name: `spacer|${idx}`,
          warehouse: '',
          group: '',
          Customer: null,
          Smart: null
        })
      }
    })
    
    return data
  }, [customerWeek3, smartWeek3, customerWeek4, smartWeek4, uniqueWarehouses, hasResults])

  const week3PieData = hasResults ? [
    { name: "Customer", value: customerCost3 },
    { name: "Smart", value: smartCost3 },
  ] : []

  const week4PieData = hasResults ? [
    { name: "Customer", value: customerCost4 },
    { name: "Smart", value: smartCost4 },
  ] : []

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold tracking-wider" style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.8)" }}>
        ${value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
    )
  }

  // Map Integration for Analysis Comparison
  const customerLinks = useMemo(() => {
    const map = new Map<string, { units: number, distance: number }>()
    const add = (arr: AllocationResult[] | null) => {
      if (!arr) return
      arr.forEach(a => {
        if (a.allocatedUnits > 0) {
          const k = `${a.warehouse}|${a.channel}-${a.state}`
          const existing = map.get(k)
          if (existing) {
            existing.units += a.allocatedUnits
          } else {
            map.set(k, { units: a.allocatedUnits, distance: a.distanceMiles })
          }
        }
      })
    }
    add(customerWeek3)
    add(customerWeek4)
    return Array.from(map.entries()).map(([k, v]) => {
      const [source, target] = k.split('|')
      return { source, target, units: v.units, distance: v.distance }
    })
  }, [customerWeek3, customerWeek4])

  const smartLinks = useMemo(() => {
    const map = new Map<string, { units: number, distance: number }>()
    const add = (arr: AllocationResult[] | null) => {
      if (!arr) return
      arr.forEach(a => {
        if (a.allocatedUnits > 0) {
          const k = `${a.warehouse}|${a.channel}-${a.state}`
          const existing = map.get(k)
          if (existing) {
            existing.units += a.allocatedUnits
          } else {
            map.set(k, { units: a.allocatedUnits, distance: a.distanceMiles })
          }
        }
      })
    }
    add(smartWeek3)
    add(smartWeek4)
    return Array.from(map.entries()).map(([k, v]) => {
      const [source, target] = k.split('|')
      return { source, target, units: v.units, distance: v.distance }
    })
  }, [smartWeek3, smartWeek4])

  const renderRouteMap = (links: { source: string, target: string, units: number, distance: number }[], lineColor: string, title: string, totalCost: number) => {
    const getX = (lon: number) => ((lon - (-128)) / (-65 - (-128))) * 1000
    const getY = (lat: number) => 600 - ((lat - 24) / (50 - 24)) * 600

    const totalMiles = links.reduce((sum, link) => sum + link.distance, 0)

    const activeWhs = new Set(links.map(l => l.source))
    const whNodes = new Map()
    store.warehouses.forEach(wh => {
      const coords = getCoordinates(wh.address) || { lat: 39.8, lon: -98.5 }
      whNodes.set(wh.name, { id: wh.id, name: wh.name, x: getX(coords.lon), y: getY(coords.lat), active: activeWhs.has(wh.name) })
    })

    const dcNodes = new Map()
    store.distributionCenters.forEach(dc => {
      const coords = getCoordinates(dc.address) || { lat: 39.8, lon: -98.5 }
      const dcId = `${dc.channel}-${dc.state}`
      dcNodes.set(dcId, { id: dcId, name: `${dc.channel} (${dc.state})`, x: getX(coords.lon), y: getY(coords.lat) })
    })

    const backgroundCities = [
      { name: "Seattle", lat: 47.6062, lon: -122.3321 },
      { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
      { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
      { name: "Phoenix", lat: 33.4484, lon: -112.0740 },
      { name: "Denver", lat: 39.7392, lon: -104.9903 },
      { name: "Dallas", lat: 32.7767, lon: -96.7970 },
      { name: "Houston", lat: 29.7604, lon: -95.3698 },
      { name: "Chicago", lat: 41.8781, lon: -87.6298 },
      { name: "Atlanta", lat: 33.749, lon: -84.388 },
      { name: "Miami", lat: 25.7617, lon: -80.1918 },
      { name: "New York", lat: 40.7128, lon: -74.0060 },
      { name: "Boston", lat: 42.3601, lon: -71.0589 },
    ]

    return (
      <Card className="bg-card border-border overflow-hidden shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MapIcon className="h-4 w-4" style={{ color: lineColor }} /> {title}
          </CardTitle>
          <div className="flex gap-4 text-sm mt-0 items-center">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Route Miles</p>
              <p className="font-mono font-medium leading-none">{totalMiles.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total Cost</p>
              <p className="font-mono font-bold leading-none" style={{ color: lineColor }}>${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </CardHeader>
        <div className="relative w-full h-[400px] bg-[#0B1120] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{
            backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Blank_US_Map_%28states_only%29.svg/1000px-Blank_US_Map_%28states_only%29.svg.png")',
            backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            filter: 'invert(1) hue-rotate(210deg) brightness(0.6) contrast(1.2)'
          }} />
          <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
            {backgroundCities.map((city, i) => (
              <g key={`bg-city-${i}`} transform={`translate(${getX(city.lon)},${getY(city.lat)})`}>
                <circle r="3" fill="#1e293b" />
                <text y="-6" fontSize="11" fill="#475569" textAnchor="middle" className="font-medium tracking-tight" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '2px' }}>
                  {city.name}
                </text>
              </g>
            ))}
            {links.map((link, i) => {
              const s = whNodes.get(link.source)
              const t = dcNodes.get(link.target)
              if (!s || !t) return null
              const dist = Math.sqrt(Math.pow(t.x - s.x, 2) + Math.pow(t.y - s.y, 2))
              const cx = (s.x + t.x) / 2
              const cy = Math.min(s.y, t.y) - dist * 0.15
              const pathData = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`
              const strokeW = Math.max(2, Math.min(6, link.units / 800))
              return (
                <g key={`link-${i}`}>
                  <path d={pathData} fill="none" stroke={lineColor} strokeWidth={strokeW} strokeOpacity="0.7" strokeLinecap="round" />
                  <circle r={strokeW * 0.8} fill="#ffffff" opacity="0.8">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path={pathData} />
                  </circle>
                </g>
              )
            })}
            {Array.from(dcNodes.values()).map(node => (
              <g key={`dc-${node.id}`} transform={`translate(${node.x},${node.y})`}>
                <ellipse cx="0" cy="2" rx="6" ry="2" fill="rgba(0,0,0,0.5)" />
                <path d="M0,0 C-6,-8 -9,-12 -9,-16 A9,9 0 1,1 9,-16 C9,-12 6,-8 0,0 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
                <text y="14" fontSize="11" fill="#e2e8f0" textAnchor="middle" className="font-bold tracking-tight" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '3px' }}>{node.name}</text>
              </g>
            ))}
            {Array.from(whNodes.values()).map(node => (
              <g key={`wh-${node.id}`} transform={`translate(${node.x},${node.y})`}>
                <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(0,0,0,0.5)" />
                <path d="M0,0 C-8,-10 -12,-15 -12,-20 A12,12 0 1,1 12,-20 C12,-15 8,-10 0,0 Z" fill={node.active ? "#22c55e" : "#334155"} stroke="#0f172a" strokeWidth="1.5" />
                <text y="-25" fontSize="12" fill={node.active ? "#f8fafc" : "#64748b"} textAnchor="middle" className="font-bold tracking-wide" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '3px' }}>{node.name}</text>
              </g>
            ))}
          </svg>
          <div className="absolute bottom-3 left-3 text-xs flex flex-col gap-2 bg-slate-900/90 text-slate-300 p-3 rounded border border-slate-800 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#22c55e] rounded-[2px] border border-[#0f172a]"></div> Active WH</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded-full border border-[#0f172a]"></div> Destination DC</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-1 rounded-full relative overflow-hidden" style={{ backgroundColor: lineColor }}>
                <div className="absolute top-0 bottom-0 w-2 bg-white/70 animate-ping"></div>
              </div>
              Active Route
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analysis</h1>
          <p className="text-sm text-muted-foreground">Run optimization and compare Customer Plan vs Smart Plan</p>
        </div>
        <div className="flex items-center gap-3">
          {hasResults && (
            <Badge variant={isCacheValid ? "outline" : "destructive"} className="gap-1">
              <Database className="h-3 w-3" />
              {isCacheValid ? "Results up to date" : "Config changed - recalculate"}
            </Badge>
          )}
          <Button onClick={handleRunAnalysis} disabled={isCalculating} size="lg">
            {isCalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : hasResults ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {hasResults ? (isCacheValid ? "Recalculate" : "Update Results") : "Run Optimization"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasResults && !error && (
        <Card className="border-dashed bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <Zap className="h-16 w-16 text-primary mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold mb-3 text-primary">Ready for Smart Optimization</h3>
            <p className="text-muted-foreground text-center max-w-lg mb-8">
              基准计划已就绪。点击下方按钮运行 AI 驱动的库存统筹优化算法，解锁巨大的成本下降空间。
            </p>
            <Button onClick={handleRunAnalysis} disabled={isCalculating} size="lg" className="h-14 px-8 text-lg shadow-xl hover:scale-105 transition-transform">
              {isCalculating ? <Loader2 className="h-6 w-6 mr-3 animate-spin" /> : <Zap className="h-6 w-6 mr-3" />}
              Run Smart Optimization
            </Button>
          </CardContent>
        </Card>
      )}

      {hasResults && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Customer Cost"
              titleCn="客户方案成本"
              value={`$${customerCostTotal.toLocaleString()}`}
              icon={DollarSign}
            />
            <StatCard
              title="Smart Cost"
              titleCn="智能方案成本"
              value={`$${smartCostTotal.toLocaleString()}`}
              icon={DollarSign}
              variant="primary"
            />
            <StatCard
              title="Savings"
              titleCn="节省金额"
              value={`$${savings.toLocaleString()}`}
              icon={TrendingDown}
              variant={savings > 0 ? "success" : "warning"}
            />
            <StatCard
              title="Savings %"
              titleCn="节省比例"
              value={`${savingsPercent.toFixed(1)}%`}
              icon={Percent}
              variant={savingsPercent > 0 ? "success" : "warning"}
            />
          </div>

          {/* Savings Alert */}
          {savings > 0 ? (
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <AlertTitle className="text-emerald-400">Optimization Results</AlertTitle>
              <AlertDescription className="text-emerald-400/90">
                Smart Plan saves <strong>${savings.toLocaleString()} ({savingsPercent.toFixed(1)}%)</strong> compared to Customer Plan.
                <br />
                智能方案比客户方案节省 <strong>${savings.toLocaleString()} ({savingsPercent.toFixed(1)}%)</strong>
              </AlertDescription>
            </Alert>
          ) : savings < 0 ? (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-400">Near Optimal</AlertTitle>
              <AlertDescription className="text-amber-400/90">
                Customer Plan is already ${Math.abs(savings).toLocaleString()} cheaper. Current allocation is near optimal.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Comparison by Warehouse</CardTitle>
              <CardDescription>Customer Plan vs Smart Plan cost distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 25, bottom: 45, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" vertical={false} />
                    {/* Bottom X-Axis for Warehouse names */}
                    <XAxis 
                      dataKey="warehouse" 
                      xAxisId={0}
                      stroke="oklch(0.6 0 0)" 
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    {/* Top X-Axis for Group Titles (Week 3 / Week 4) */}
                    <XAxis 
                      dataKey="group" 
                      xAxisId={1}
                      orientation="top"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 14, fontWeight: 'bold', fill: "currentColor" }}
                      allowDuplicatedCategory={false}
                    />
                    <YAxis stroke="oklch(0.6 0 0)" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name]}
                      labelFormatter={(label: string, payload: any[]) => {
                        if (payload && payload.length > 0 && payload[0].payload) {
                          const item = payload[0].payload
                          return item.name.includes('spacer') ? '' : `${item.group} - ${item.warehouse}`
                        }
                        return label
                      }}
                      contentStyle={{
                        backgroundColor: "oklch(0.14 0 0)",
                        border: "1px solid oklch(0.25 0 0)",
                        borderRadius: "8px",
                      }}
                      cursor={{ fill: 'oklch(0.5 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Customer" name="Customer Plan" fill={CHART_COLORS.customer} radius={[4, 4, 0, 0]} xAxisId={0} />
                    <Bar dataKey="Smart" name="Smart Plan" fill={CHART_COLORS.smart} radius={[4, 4, 0, 0]} xAxisId={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Tabs */}
          <Tabs value={activeWeek} onValueChange={(v) => setActiveWeek(v as typeof activeWeek)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="week3" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Week 3
              </TabsTrigger>
              <TabsTrigger value="week4" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Week 4
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Weekly Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Breakdown</CardTitle>
                  <CardDescription>Cost comparison by week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Week</TableHead>
                            <TableHead className="text-right">Customer</TableHead>
                            <TableHead className="text-right">Smart</TableHead>
                            <TableHead className="text-right">Savings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Week 3</TableCell>
                            <TableCell className="text-right">${customerCost3?.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-primary">${smartCost3?.toLocaleString()}</TableCell>
                            <TableCell className={`text-right ${(customerCost3 || 0) - (smartCost3 || 0) > 0 ? "text-emerald-400" : "text-destructive"}`}>
                              ${((customerCost3 || 0) - (smartCost3 || 0)).toLocaleString()}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Week 4</TableCell>
                            <TableCell className="text-right">${customerCost4?.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-primary">${smartCost4?.toLocaleString()}</TableCell>
                            <TableCell className={`text-right ${(customerCost4 || 0) - (smartCost4 || 0) > 0 ? "text-emerald-400" : "text-destructive"}`}>
                              ${((customerCost4 || 0) - (smartCost4 || 0)).toLocaleString()}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30 font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">${customerCostTotal.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-primary">${smartCostTotal.toLocaleString()}</TableCell>
                            <TableCell className={`text-right ${savings > 0 ? "text-emerald-400" : "text-destructive"}`}>
                              ${savings.toLocaleString()} ({savingsPercent.toFixed(1)}%)
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pie Charts */}
                    <div className="flex gap-4 h-[250px]">
                      <div className="flex-1 flex flex-col items-center">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Week 3 Cost</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={week3PieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                              {week3PieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Customer' ? CHART_COLORS.customer : CHART_COLORS.smart} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost"]} contentStyle={{ backgroundColor: "oklch(0.14 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px" }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Week 4 Cost</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={week4PieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                              {week4PieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Customer' ? CHART_COLORS.customer : CHART_COLORS.smart} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost"]} contentStyle={{ backgroundColor: "oklch(0.14 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px" }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Map Comparison Grid */}
              <div className="grid lg:grid-cols-2 gap-4">
                {renderRouteMap(customerLinks, CHART_COLORS.customer, "Baseline (Customer Plan)", customerCostTotal)}
                {renderRouteMap(smartLinks, CHART_COLORS.smart, "Optimized (Smart Plan)", smartCostTotal)}
              </div>

              {/* Warehouse Summary */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-amber-400">Customer Plan by Warehouse</CardTitle>
                    <CardDescription>客户方案仓库分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead className="text-right">W3 Units</TableHead>
                          <TableHead className="text-right">W4 Units</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set([
                          ...getWarehouseSummary(customerWeek3).map(w => w.warehouse),
                          ...getWarehouseSummary(customerWeek4).map(w => w.warehouse)
                        ])).map(wh => {
                          const w3 = getWarehouseSummary(customerWeek3).find(w => w.warehouse === wh)
                          const w4 = getWarehouseSummary(customerWeek4).find(w => w.warehouse === wh)
                          return (
                            <TableRow key={wh}>
                              <TableCell className="font-medium">{wh}</TableCell>
                              <TableCell className="text-right">{(w3?.units || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">{(w4?.units || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">${((w3?.cost || 0) + (w4?.cost || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">Smart Plan by Warehouse</CardTitle>
                    <CardDescription>智能方案仓库分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead className="text-right">W3 Units</TableHead>
                          <TableHead className="text-right">W4 Units</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set([
                          ...getWarehouseSummary(smartWeek3).map(w => w.warehouse),
                          ...getWarehouseSummary(smartWeek4).map(w => w.warehouse)
                        ])).map(wh => {
                          const w3 = getWarehouseSummary(smartWeek3).find(w => w.warehouse === wh)
                          const w4 = getWarehouseSummary(smartWeek4).find(w => w.warehouse === wh)
                          return (
                            <TableRow key={wh}>
                              <TableCell className="font-medium">{wh}</TableCell>
                              <TableCell className="text-right">{(w3?.units || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">{(w4?.units || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">${((w3?.cost || 0) + (w4?.cost || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="week3" className="space-y-4">
              {/* Side-by-side Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Week 3 - Side-by-Side Comparison</CardTitle>
                  <CardDescription>Compare Customer vs Smart allocation for each DC</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-center border-l bg-amber-500/5">Customer WH</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Dist</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Units</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Cost</TableHead>
                        <TableHead className="text-center border-l bg-primary/5">Smart WH</TableHead>
                        <TableHead className="text-right bg-primary/5">Dist</TableHead>
                        <TableHead className="text-right bg-primary/5">Units</TableHead>
                        <TableHead className="text-right bg-primary/5">Cost</TableHead>
                        <TableHead className="text-right border-l">Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison3.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="outline">{row.channel}</Badge></TableCell>
                          <TableCell>{row.state}</TableCell>
                          <TableCell className="text-center border-l bg-amber-500/5 font-medium">{row.customerWarehouse}</TableCell>
                          <TableCell className="text-right bg-amber-500/5 text-muted-foreground">{row.customerDistance.toFixed(0)} mi</TableCell>
                          <TableCell className="text-right bg-amber-500/5">{row.customerUnits.toLocaleString()}</TableCell>
                          <TableCell className="text-right bg-amber-500/5">${row.customerCost.toFixed(2)}</TableCell>
                          <TableCell className="text-center border-l bg-primary/5 font-medium">{row.smartWarehouse}</TableCell>
                          <TableCell className="text-right bg-primary/5 text-muted-foreground">{row.smartDistance.toFixed(0)} mi</TableCell>
                          <TableCell className="text-right bg-primary/5">{row.smartUnits.toLocaleString()}</TableCell>
                          <TableCell className="text-right bg-primary/5">${row.smartCost.toFixed(2)}</TableCell>
                          <TableCell className={`text-right border-l font-bold ${row.savings > 0 ? "text-emerald-400" : row.savings < 0 ? "text-destructive" : ""}`}>
                            {row.savings > 0 ? "+" : ""}{row.savings !== 0 ? `$${row.savings.toFixed(2)}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>TOTAL Week 3</TableCell>
                        <TableCell className="border-l bg-amber-500/5"></TableCell>
                        <TableCell className="bg-amber-500/5"></TableCell>
                        <TableCell className="text-right bg-amber-500/5">{comparison3.reduce((s, r) => s + r.customerUnits, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right bg-amber-500/5">${customerCost3?.toFixed(2)}</TableCell>
                        <TableCell className="border-l bg-primary/5"></TableCell>
                        <TableCell className="bg-primary/5"></TableCell>
                        <TableCell className="text-right bg-primary/5">{comparison3.reduce((s, r) => s + r.smartUnits, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right bg-primary/5">${smartCost3?.toFixed(2)}</TableCell>
                        <TableCell className={`text-right border-l ${(customerCost3 || 0) - (smartCost3 || 0) > 0 ? "text-emerald-400" : "text-destructive"}`}>
                          ${((customerCost3 || 0) - (smartCost3 || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="week4" className="space-y-4">
              {/* Side-by-side Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Week 4 - Side-by-Side Comparison</CardTitle>
                  <CardDescription>Compare Customer vs Smart allocation for each DC</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-center border-l bg-amber-500/5">Customer WH</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Dist</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Units</TableHead>
                        <TableHead className="text-right bg-amber-500/5">Cost</TableHead>
                        <TableHead className="text-center border-l bg-primary/5">Smart WH</TableHead>
                        <TableHead className="text-right bg-primary/5">Dist</TableHead>
                        <TableHead className="text-right bg-primary/5">Units</TableHead>
                        <TableHead className="text-right bg-primary/5">Cost</TableHead>
                        <TableHead className="text-right border-l">Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison4.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant="outline">{row.channel}</Badge></TableCell>
                          <TableCell>{row.state}</TableCell>
                          <TableCell className="text-center border-l bg-amber-500/5 font-medium">{row.customerWarehouse}</TableCell>
                          <TableCell className="text-right bg-amber-500/5 text-muted-foreground">{row.customerDistance.toFixed(0)} mi</TableCell>
                          <TableCell className="text-right bg-amber-500/5">{row.customerUnits.toLocaleString()}</TableCell>
                          <TableCell className="text-right bg-amber-500/5">${row.customerCost.toFixed(2)}</TableCell>
                          <TableCell className="text-center border-l bg-primary/5 font-medium">{row.smartWarehouse}</TableCell>
                          <TableCell className="text-right bg-primary/5 text-muted-foreground">{row.smartDistance.toFixed(0)} mi</TableCell>
                          <TableCell className="text-right bg-primary/5">{row.smartUnits.toLocaleString()}</TableCell>
                          <TableCell className="text-right bg-primary/5">${row.smartCost.toFixed(2)}</TableCell>
                          <TableCell className={`text-right border-l font-bold ${row.savings > 0 ? "text-emerald-400" : row.savings < 0 ? "text-destructive" : ""}`}>
                            {row.savings > 0 ? "+" : ""}{row.savings !== 0 ? `$${row.savings.toFixed(2)}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>TOTAL Week 4</TableCell>
                        <TableCell className="border-l bg-amber-500/5"></TableCell>
                        <TableCell className="bg-amber-500/5"></TableCell>
                        <TableCell className="text-right bg-amber-500/5">{comparison4.reduce((s, r) => s + r.customerUnits, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right bg-amber-500/5">${customerCost4?.toFixed(2)}</TableCell>
                        <TableCell className="border-l bg-primary/5"></TableCell>
                        <TableCell className="bg-primary/5"></TableCell>
                        <TableCell className="text-right bg-primary/5">{comparison4.reduce((s, r) => s + r.smartUnits, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right bg-primary/5">${smartCost4?.toFixed(2)}</TableCell>
                        <TableCell className={`text-right border-l ${(customerCost4 || 0) - (smartCost4 || 0) > 0 ? "text-emerald-400" : "text-destructive"}`}>
                          ${((customerCost4 || 0) - (smartCost4 || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
