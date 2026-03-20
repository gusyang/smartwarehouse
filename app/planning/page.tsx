"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useWarehouseStore } from "@/lib/store"
import { calculateAvailableInventory, generateCustomerPlanWithDetails, validateAllocations, getCoordinates, type PlanDetailEntry, type GeneratedPlanResult } from "@/lib/optimizer"
import { Archive, TrendingUp, Briefcase, Plus, Trash2, Check, AlertTriangle, X, RotateCcw, Calculator, Info, Map as MapIcon, Globe, Pencil, ZoomIn, ZoomOut, Maximize } from "lucide-react"

const InteractivePlanningMap = ({ links, warehouses, distributionCenters, selectedWarehouses }: any) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const getX = (lon: number) => ((lon - (-128)) / (-65 - (-128))) * 1000
  const getY = (lat: number) => 600 - ((lat - 24) / (50 - 24)) * 600

  const whNodes = new Map()
  warehouses.forEach((wh: any) => {
    const coords = getCoordinates(wh.address) || { lat: 39.8, lon: -98.5 }
    whNodes.set(wh.name, { id: wh.id, name: wh.name, x: getX(coords.lon), y: getY(coords.lat), active: selectedWarehouses.includes(wh.name) })
  })

  const dcNodes = new Map()
  distributionCenters.forEach((dc: any) => {
    const coords = getCoordinates(dc.address) || { lat: 39.8, lon: -98.5 }
    const dcId = `${dc.channel}-${dc.state}`
    dcNodes.set(dcId, { id: dcId, name: `${dc.channel} (${dc.state})`, x: getX(coords.lon), y: getY(coords.lat) })
  })

  const backgroundCities = [
    { name: "Seattle", lat: 47.6062, lon: -122.3321 }, { name: "Portland", lat: 45.5152, lon: -122.6784 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 }, { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    { name: "San Diego", lat: 32.7157, lon: -117.1611 }, { name: "Las Vegas", lat: 36.1699, lon: -115.1398 },
    { name: "Phoenix", lat: 33.4484, lon: -112.0740 }, { name: "Salt Lake City", lat: 40.7608, lon: -111.8910 },
    { name: "Denver", lat: 39.7392, lon: -104.9903 }, { name: "Dallas", lat: 32.7767, lon: -96.7970 },
    { name: "Austin", lat: 30.2672, lon: -97.7431 }, { name: "Houston", lat: 29.7604, lon: -95.3698 },
    { name: "New Orleans", lat: 29.9511, lon: -90.0715 }, { name: "Chicago", lat: 41.8781, lon: -87.6298 },
    { name: "Minneapolis", lat: 44.9778, lon: -93.2650 }, { name: "Detroit", lat: 42.3314, lon: -83.0458 },
    { name: "Atlanta", lat: 33.749, lon: -84.388 }, { name: "Charlotte", lat: 35.2271, lon: -80.8431 },
    { name: "Miami", lat: 25.7617, lon: -80.1918 }, { name: "Orlando", lat: 28.5383, lon: -81.3792 },
    { name: "Washington DC", lat: 38.9072, lon: -77.0369 }, { name: "Philadelphia", lat: 39.9526, lon: -75.1652 },
    { name: "New York", lat: 40.7128, lon: -74.0060 }, { name: "Boston", lat: 42.3601, lon: -71.0589 }
  ]

  return (
    <div className="relative w-full h-[500px] bg-[#0B1120] rounded-xl border border-border overflow-hidden shadow-inner group">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="secondary" size="icon" className="h-8 w-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700" onClick={() => setScale(s => Math.min(s + 0.5, 4))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700" onClick={() => setScale(s => Math.max(s - 0.5, 1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }) }}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Draggable Overlay */}
      <div 
        className={`absolute inset-0 z-20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }) }}
        onMouseMove={(e) => { if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      />

      {/* Canvas */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
      >
        {/* High-Res SVG Map Layer */}
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/1/1a/Blank_US_Map_%28states_only%29.svg")',
          backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          filter: 'invert(1) hue-rotate(210deg) brightness(0.8) contrast(1.2) drop-shadow(0 0 5px rgba(59,130,246,0.3))'
        }} />
        
        <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
          {backgroundCities.map((city, i) => (
            <g key={`bg-city-${i}`} transform={`translate(${getX(city.lon)},${getY(city.lat)})`}>
              <circle r="3" fill="#1e293b" />
              <text y="-6" fontSize="11" fill="#475569" textAnchor="middle" className="font-medium tracking-tight" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '2px' }}>{city.name}</text>
            </g>
          ))}
          {links.map((link: any, i: number) => {
            const s = whNodes.get(link.source); const t = dcNodes.get(link.target); if (!s || !t) return null
            const dist = Math.sqrt(Math.pow(t.x - s.x, 2) + Math.pow(t.y - s.y, 2)); const cx = (s.x + t.x) / 2; const cy = Math.min(s.y, t.y) - dist * 0.15
            const pathData = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`; const strokeW = Math.max(2, Math.min(6, link.units / 800))
            return (
              <g key={`link-${i}`}>
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth={strokeW} strokeOpacity="0.6" strokeLinecap="round" />
                <circle r={strokeW * 0.8} fill="#bfdbfe" className="drop-shadow-md"><animateMotion dur="2.5s" repeatCount="indefinite" path={pathData} /></circle>
              </g>
            )
          })}
          {Array.from(dcNodes.values()).map(node => (
            <g key={`dc-${node.id}`} transform={`translate(${node.x},${node.y})`}>
              <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(0,0,0,0.5)" />
              <path d="M0,0 C-8,-10 -12,-16 -12,-22 A12,12 0 1,1 12,-22 C12,-16 8,-10 0,0 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="0" cy="-22" r="4" fill="#ffffff" />
              <text y="16" fontSize="13" fill="#e2e8f0" textAnchor="middle" className="font-bold tracking-tight" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '3px' }}>{node.name}</text>
            </g>
          ))}
          {Array.from(whNodes.values()).map(node => (
            <g key={`wh-${node.id}`} transform={`translate(${node.x},${node.y})`}>
              <ellipse cx="0" cy="2" rx="10" ry="4" fill="rgba(0,0,0,0.5)" />
              <path d="M0,0 C-10,-12 -14,-18 -14,-26 A14,14 0 1,1 14,-26 C14,-18 10,-12 0,0 Z" fill={node.active ? "#22c55e" : "#334155"} stroke="#0f172a" strokeWidth="2" />
              <circle cx="0" cy="-26" r="5" fill="#ffffff" />
              <text y="-32" fontSize="14" fill={node.active ? "#f8fafc" : "#64748b"} textAnchor="middle" className="font-bold tracking-wide" style={{ paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: '3px' }}>{node.name}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Dark Map Legend */}
      <div className="absolute bottom-4 left-4 text-xs flex flex-col gap-3 bg-slate-900/90 text-slate-300 p-4 rounded-lg border border-slate-800 shadow-xl backdrop-blur-md pointer-events-none z-40">
        <div className="font-bold mb-1 flex items-center gap-2 text-slate-100"><MapIcon className="w-4 h-4 text-blue-500" /> Map Legend</div>
        <div className="flex items-center gap-2">
          <svg width="14" height="20" viewBox="-14 -26 28 28"><path d="M0,0 C-10,-12 -14,-18 -14,-26 A14,14 0 1,1 14,-26 C14,-18 10,-12 0,0 Z" fill="#22c55e" stroke="#0f172a" strokeWidth="1.5" /></svg>
          Active Warehouse
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="20" viewBox="-12 -22 24 24"><path d="M0,0 C-8,-10 -12,-16 -12,-22 A12,12 0 1,1 12,-22 C12,-16 8,-10 0,0 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" /></svg>
          Distribution Center
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-6 h-1 bg-blue-500 rounded-full relative overflow-hidden"><div className="absolute top-0 bottom-0 w-2 bg-blue-200 animate-ping"></div></div>
          Delivery Route
        </div>
      </div>
    </div>
  )
}

export default function PlanningPage() {
  const store = useWarehouseStore()
  const [activeTab, setActiveTab] = useState("inventory")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [planDetails, setPlanDetails] = useState<GeneratedPlanResult | null>(null)

  // Form states
  const [newInventory, setNewInventory] = useState({ warehouseName: "", skuCode: "", quantityOnHand: 0 })
  const [newSchedule, setNewSchedule] = useState({ warehouse: "", sku: "", incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 })
  const [newDemand, setNewDemand] = useState({ product: "", channel: "", state: "", demandWeek3: 0, demandWeek4: 0 })

  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [editingDemandId, setEditingDemandId] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Calculate inventory projections
  const selectedWarehouses = store.customerSettings?.selectedWarehouses || []
  const inventoryWeek3 = calculateAvailableInventory(3, store.warehouseInventory, store.warehouseSchedule, selectedWarehouses)
  const inventoryWeek4 = calculateAvailableInventory(4, store.warehouseInventory, store.warehouseSchedule, selectedWarehouses)
  const totalAvailableW3 = inventoryWeek3.reduce((sum, i) => sum + i.available, 0)
  const totalAvailableW4 = inventoryWeek4.reduce((sum, i) => sum + i.available, 0)
  const totalDemandW3 = store.demandForecasts.reduce((sum, d) => sum + d.demandWeek3, 0)
  const totalDemandW4 = store.demandForecasts.reduce((sum, d) => sum + d.demandWeek4, 0)

  // Validation
  const validationResults = validateAllocations(store.demandForecasts, store.customerAllocations)
  const allValid = validationResults.every(v => v.status === "ok")

  const handleGeneratePlan = () => {
    const selectedWarehouses = store.customerSettings?.selectedWarehouses || []
    if (selectedWarehouses.length === 0) {
      showSuccess("Please select at least one warehouse first")
      return
    }
    
    const selectedSku = store.skus[0] // Use first SKU
    const selectedVehicle = store.vehicles.find(v => v.id === store.customerSettings.selectedVehicleId) || store.vehicles[0]
    
    const result = generateCustomerPlanWithDetails(
      store.warehouses,
      store.distributionCenters,
      store.demandForecasts,
      selectedWarehouses,
      store.rates,
      store.customerSettings.customerCarrierId,
      selectedSku,
      selectedVehicle
    )
    store.setCustomerAllocations(result.allocations)
    setPlanDetails(result)
    
    if (result.calculatedRatePerUnit > 0) {
      store.setShippingRates(result.calculatedRatePerUnit, store.tmsShippingRate)
    }
    showSuccess(`Plan generated: ${result.itemsPerContainer} items/container, Rate: $${result.calculatedRatePerUnit.toFixed(4)}/unit/100mi`)
  }

  const mapLinks: any[] = []
  if (planDetails && planDetails.details) {
    planDetails.details.forEach(detail => {
      mapLinks.push({ source: detail.warehouse, target: `${detail.channel}-${detail.state}`, units: detail.unitsWeek3 + detail.unitsWeek4 })
    })
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Planning</h1>
        <p className="text-muted-foreground">Configure inventory, demand forecasts, and customer allocation plan</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg bg-card border border-border">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="demand" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Demand</span>
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Customer Plan</span>
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Current Inventory */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>On-hand inventory by warehouse and SKU</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.warehouseInventory.map((inv, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{inv.warehouseName}</TableCell>
                        <TableCell className="font-mono">{inv.skuCode}</TableCell>
                        <TableCell className="text-right">{inv.quantityOnHand.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingInventoryId(inv.id)
                              setNewInventory({ warehouseName: inv.warehouseName, skuCode: inv.skuCode, quantityOnHand: inv.quantityOnHand })
                            }}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.deleteWarehouseInventory(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="pt-4 border-t mt-4">
                <div className="text-sm font-medium mb-3">{editingInventoryId ? "Edit Inventory" : "Add Inventory"}</div>
                <div className="grid grid-cols-3 gap-3">
                  <Select value={newInventory.warehouseName} onValueChange={(v) => setNewInventory({ ...newInventory, warehouseName: v })}>
                    <SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger>
                    <SelectContent>
                      {store.warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newInventory.skuCode} onValueChange={(v) => setNewInventory({ ...newInventory, skuCode: v })}>
                    <SelectTrigger><SelectValue placeholder="SKU" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.map(s => <SelectItem key={s.id} value={s.skuCode}>{s.skuCode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={newInventory.quantityOnHand || ""} onChange={(e) => setNewInventory({ ...newInventory, quantityOnHand: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="mt-3 flex gap-2">
                  {editingInventoryId ? (
                    <>
                      <Button size="sm" onClick={() => {
                        if (newInventory.warehouseName && newInventory.skuCode) {
                          store.updateWarehouseInventory(editingInventoryId, newInventory)
                          setEditingInventoryId(null)
                          setNewInventory({ warehouseName: "", skuCode: "", quantityOnHand: 0 })
                          showSuccess("Inventory updated")
                        }
                      }}><Check className="h-4 w-4 mr-2" /> Update</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingInventoryId(null)
                        setNewInventory({ warehouseName: "", skuCode: "", quantityOnHand: 0 })
                      }}><X className="h-4 w-4 mr-2" /> Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => {
                      if (newInventory.warehouseName && newInventory.skuCode) {
                        store.addWarehouseInventory(newInventory)
                        setNewInventory({ warehouseName: "", skuCode: "", quantityOnHand: 0 })
                        showSuccess("Inventory added")
                      }
                    }}><Plus className="h-4 w-4 mr-2" /> Add</Button>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Incoming/Outgoing Schedule</CardTitle>
                <CardDescription>Weekly incoming and outgoing schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WH</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right text-emerald-400">In W3</TableHead>
                      <TableHead className="text-right text-emerald-400">In W4</TableHead>
                      <TableHead className="text-right text-red-400">Out W1</TableHead>
                      <TableHead className="text-right text-red-400">Out W2</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.warehouseSchedule.map((sch, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{sch.warehouse}</TableCell>
                        <TableCell className="font-mono">{sch.sku}</TableCell>
                        <TableCell className="text-right text-emerald-400">+{sch.incomingWeek3}</TableCell>
                        <TableCell className="text-right text-emerald-400">+{sch.incomingWeek4}</TableCell>
                        <TableCell className="text-right text-red-400">-{sch.outgoingWeek1}</TableCell>
                        <TableCell className="text-right text-red-400">-{sch.outgoingWeek2}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingScheduleId(sch.id)
                              setNewSchedule({ warehouse: sch.warehouse, sku: sch.sku, incomingWeek3: sch.incomingWeek3, incomingWeek4: sch.incomingWeek4, outgoingWeek1: sch.outgoingWeek1, outgoingWeek2: sch.outgoingWeek2 })
                            }}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.deleteWarehouseSchedule(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="pt-4 border-t mt-4">
                <div className="text-sm font-medium mb-3">{editingScheduleId ? "Edit Schedule" : "Add Schedule"}</div>
                <div className="grid grid-cols-3 gap-3">
                  <Select value={newSchedule.warehouse} onValueChange={(v) => setNewSchedule({ ...newSchedule, warehouse: v })}>
                    <SelectTrigger><SelectValue placeholder="WH" /></SelectTrigger>
                    <SelectContent>
                      {store.warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newSchedule.sku} onValueChange={(v) => setNewSchedule({ ...newSchedule, sku: v })}>
                    <SelectTrigger><SelectValue placeholder="SKU" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.map(s => <SelectItem key={s.id} value={s.skuCode}>{s.skuCode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="col-span-1" />
                  <Input type="number" placeholder="In W3" value={newSchedule.incomingWeek3 || ""} onChange={(e) => setNewSchedule({ ...newSchedule, incomingWeek3: parseInt(e.target.value) || 0 })} />
                  <Input type="number" placeholder="In W4" value={newSchedule.incomingWeek4 || ""} onChange={(e) => setNewSchedule({ ...newSchedule, incomingWeek4: parseInt(e.target.value) || 0 })} />
                  <Input type="number" placeholder="Out W1" value={newSchedule.outgoingWeek1 || ""} onChange={(e) => setNewSchedule({ ...newSchedule, outgoingWeek1: parseInt(e.target.value) || 0 })} />
                  <Input type="number" placeholder="Out W2" value={newSchedule.outgoingWeek2 || ""} onChange={(e) => setNewSchedule({ ...newSchedule, outgoingWeek2: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="mt-3 flex gap-2">
                  {editingScheduleId ? (
                    <>
                      <Button size="sm" onClick={() => {
                        if (newSchedule.warehouse && newSchedule.sku) {
                          store.updateWarehouseSchedule(editingScheduleId, newSchedule)
                          setEditingScheduleId(null)
                          setNewSchedule({ warehouse: "", sku: "", incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 })
                          showSuccess("Schedule updated")
                        }
                      }}><Check className="h-4 w-4 mr-2" /> Update</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingScheduleId(null)
                        setNewSchedule({ warehouse: "", sku: "", incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 })
                      }}><X className="h-4 w-4 mr-2" /> Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => {
                      if (newSchedule.warehouse && newSchedule.sku) {
                        store.addWarehouseSchedule(newSchedule)
                        setNewSchedule({ warehouse: "", sku: "", incomingWeek3: 0, incomingWeek4: 0, outgoingWeek1: 0, outgoingWeek2: 0 })
                        showSuccess("Schedule added")
                      }
                    }}><Plus className="h-4 w-4 mr-2" /> Add</Button>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Projections */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Inventory Projections (Selected Warehouses Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Week 3</div>
                  {inventoryWeek3.filter(i => i.available > 0).map((inv, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{inv.name} ({inv.sku})</span>
                      <span className="font-mono">{inv.available.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total Available</span>
                    <span className={totalAvailableW3 >= totalDemandW3 ? "text-emerald-400" : "text-destructive"}>
                      {totalAvailableW3.toLocaleString()} / {totalDemandW3.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Week 4</div>
                  {inventoryWeek4.filter(i => i.available > 0).map((inv, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{inv.name} ({inv.sku})</span>
                      <span className="font-mono">{inv.available.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total Available</span>
                    <span className={totalAvailableW4 >= totalDemandW4 ? "text-emerald-400" : "text-destructive"}>
                      {totalAvailableW4.toLocaleString()} / {totalDemandW4.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demand Tab */}
        <TabsContent value="demand" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Demand Forecast</CardTitle>
              <CardDescription>Demand by product, channel, and state for Week 3 & 4</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Week 3</TableHead>
                    <TableHead className="text-right">Week 4</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.demandForecasts.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{d.product}</TableCell>
                      <TableCell><Badge variant="outline">{d.channel}</Badge></TableCell>
                      <TableCell>{d.state}</TableCell>
                      <TableCell className="text-right">{d.demandWeek3.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{d.demandWeek4.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">{(d.demandWeek3 + d.demandWeek4).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingDemandId(d.id)
                            setNewDemand({ product: d.product, channel: d.channel, state: d.state, demandWeek3: d.demandWeek3, demandWeek4: d.demandWeek4 })
                          }}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => store.deleteDemandForecast(d.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold" colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right font-bold">{totalDemandW3.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{totalDemandW4.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{(totalDemandW3 + totalDemandW4).toLocaleString()}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingDemandId ? "Edit Demand" : "Add Demand Forecast"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    <Select value={newDemand.product} onValueChange={(v) => setNewDemand({ ...newDemand, product: v })}>
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {store.skus.map(s => <SelectItem key={s.id} value={s.skuCode}>{s.skuCode}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={newDemand.channel && newDemand.state ? `${newDemand.channel}|${newDemand.state}` : ""} 
                      onValueChange={(v) => {
                        const [channel, state] = v.split('|')
                        setNewDemand({ ...newDemand, channel, state })
                      }}
                    >
                      <SelectTrigger className="col-span-2"><SelectValue placeholder="Select DC (Channel - State)" /></SelectTrigger>
                      <SelectContent>
                        {store.distributionCenters.map(dc => (
                          <SelectItem key={dc.id} value={`${dc.channel}|${dc.state}`}>{dc.channel} ({dc.state})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input type="number" placeholder="W3 Demand" value={newDemand.demandWeek3 || ""} onChange={(e) => setNewDemand({ ...newDemand, demandWeek3: parseInt(e.target.value) || 0 })} />
                    <Input type="number" placeholder="W4 Demand" value={newDemand.demandWeek4 || ""} onChange={(e) => setNewDemand({ ...newDemand, demandWeek4: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    {editingDemandId ? (
                      <>
                        <Button onClick={() => {
                          if (newDemand.product && newDemand.channel && newDemand.state) {
                            store.updateDemandForecast(editingDemandId, newDemand)
                            setEditingDemandId(null)
                            setNewDemand({ product: "", channel: "", state: "", demandWeek3: 0, demandWeek4: 0 })
                            showSuccess("Demand updated")
                          }
                        }}><Check className="h-4 w-4 mr-2" /> Update</Button>
                        <Button variant="outline" onClick={() => {
                          setEditingDemandId(null)
                          setNewDemand({ product: "", channel: "", state: "", demandWeek3: 0, demandWeek4: 0 })
                        }}><X className="h-4 w-4 mr-2" /> Cancel</Button>
                      </>
                    ) : (
                      <Button onClick={() => {
                        if (newDemand.product && newDemand.channel && newDemand.state) {
                          store.addDemandForecast({ id: Date.now().toString(), ...newDemand })
                          setNewDemand({ product: "", channel: "", state: "", demandWeek3: 0, demandWeek4: 0 })
                          showSuccess("Demand added")
                        }
                      }}><Plus className="h-4 w-4 mr-2" /> Add Demand</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Plan Tab */}
        <TabsContent value="customer" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Settings Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Plan Settings</CardTitle>
                <CardDescription>Configure carrier and warehouse selection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Carrier</Label>
                  <Select 
                    value={store.customerSettings.customerCarrierId || ""} 
                    onValueChange={(v) => store.setCustomerSettings({ ...store.customerSettings, customerCarrierId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                    <SelectContent>
                      {store.carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>TMS Carrier</Label>
                  <Select 
                    value={store.customerSettings.tmsCarrierId || ""} 
                    onValueChange={(v) => store.setCustomerSettings({ ...store.customerSettings, tmsCarrierId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                    <SelectContent>
                      {store.carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Market Rate ($/100mi)
                    <span className="group relative cursor-help flex items-center">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 bg-popover text-popover-foreground text-xs border p-2 rounded shadow-lg z-50 text-left font-normal">
                        Fallback rate used when exact Carrier rates, SKU dimensions, or Vehicle capacities are not configured.
                      </span>
                    </span>
                  </Label>
                  <Input 
                    type="number" 
                    value={store.marketShippingRate} 
                    onChange={(e) => store.setMarketShippingRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Selected Warehouses</Label>
                  <p className="text-xs text-muted-foreground">Only selected warehouses will have inventory</p>
                  <div className="space-y-2">
                    {store.warehouses.map(wh => (
                      <div key={wh.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={`wh-${wh.id}`}
                          checked={store.customerSettings.selectedWarehouses.includes(wh.name)}
                          onCheckedChange={(checked) => {
                            const current = store.customerSettings.selectedWarehouses
                            const updated = checked 
                              ? [...current, wh.name]
                              : current.filter(n => n !== wh.name)
                            store.setCustomerSettings({ ...store.customerSettings, selectedWarehouses: updated })
                          }}
                        />
                        <label htmlFor={`wh-${wh.id}`} className="text-sm">{wh.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Allocations */}
            <Card className="bg-card border-border lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customer Allocation Plan</CardTitle>
                    <CardDescription>Define warehouse assignments for each demand</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        store.setCustomerAllocations([])
                        showSuccess("Allocations cleared")
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Clear
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleGeneratePlan}
                    >
                      <Calculator className="h-4 w-4 mr-2" /> Quick Generate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {store.customerAllocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 border border-dashed rounded-lg">
                    <Briefcase className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2 text-foreground">No Baseline Plan Yet</h3>
                    <p className="mb-6 max-w-md text-center text-sm">生成一个基于传统业务逻辑（就近分配）的基准方案，用作后续 AI 优化的对比标杆。</p>
                    <Button 
                      size="lg"
                      className="shadow-lg"
                      onClick={handleGeneratePlan}
                    >
                      <Calculator className="h-5 w-5 mr-2" /> Generate Baseline Plan
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">W3 Units</TableHead>
                        <TableHead className="text-right">W4 Units</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.customerAllocations.map((alloc, idx) => {
                        const validation = validationResults.find(
                          v => v.dc === `${alloc.channel}-${alloc.state}`
                        )
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{alloc.product}</TableCell>
                            <TableCell><Badge variant="outline">{alloc.channel}</Badge></TableCell>
                            <TableCell>{alloc.state}</TableCell>
                            <TableCell>
                              <Select 
                                value={alloc.warehouse}
                                onValueChange={(v) => {
                                  const updated = [...store.customerAllocations]
                                  updated[idx] = { ...updated[idx], warehouse: v }
                                  store.setCustomerAllocations(updated)
                                }}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {store.customerSettings.selectedWarehouses.map(wh => (
                                    <SelectItem key={wh} value={wh}>{wh}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input 
                                type="number" 
                                className="w-20 text-right" 
                                value={alloc.allocatedUnitsWeek3}
                                onChange={(e) => {
                                  const updated = [...store.customerAllocations]
                                  updated[idx] = { ...updated[idx], allocatedUnitsWeek3: parseInt(e.target.value) || 0 }
                                  store.setCustomerAllocations(updated)
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input 
                                type="number" 
                                className="w-20 text-right" 
                                value={alloc.allocatedUnitsWeek4}
                                onChange={(e) => {
                                  const updated = [...store.customerAllocations]
                                  updated[idx] = { ...updated[idx], allocatedUnitsWeek4: parseInt(e.target.value) || 0 }
                                  store.setCustomerAllocations(updated)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {validation?.status === "ok" ? (
                                <Check className="h-4 w-4 text-emerald-400" />
                              ) : validation?.status === "high" ? (
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}

                {!allValid && store.customerAllocations.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    Some allocations do not match demand. Please review.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Details with Distance and Cost */}
            {planDetails && planDetails.details.length > 0 && (
              <Card className="bg-card border-border lg:col-span-3">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Allocation Math Details</CardTitle>
                      <CardDescription>Calculated shipping costs and constraints breakdown</CardDescription>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground">Items/Container</p>
                        <p className="font-bold text-lg">{planDetails.itemsPerContainer.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Rate ($/unit/100mi)</p>
                        <p className="font-bold text-lg flex items-center justify-end gap-1">
                          ${planDetails.calculatedRatePerUnit.toFixed(4)}
                          {planDetails.marketRateExplanation && (
                            <span className="group relative cursor-help flex items-center">
                              <Info className="h-4 w-4 text-blue-400" />
                              <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 bg-popover text-popover-foreground text-xs border p-2 rounded shadow-lg z-50 text-left font-normal text-base">
                                {planDetails.marketRateExplanation}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead className="text-right">Distance (mi)</TableHead>
                            <TableHead className="text-right">Items/Cont.</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">W3 Units</TableHead>
                            <TableHead className="text-right">W3 Cost</TableHead>
                            <TableHead className="text-right">W4 Units</TableHead>
                            <TableHead className="text-right">W4 Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planDetails.details.map((detail, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{detail.product}</TableCell>
                              <TableCell className="font-medium">{detail.warehouse}</TableCell>
                              <TableCell><Badge variant="outline">{detail.channel}</Badge></TableCell>
                              <TableCell>{detail.state}</TableCell>
                              <TableCell className="text-right">{detail.distanceMiles.toFixed(0)}</TableCell>
                              <TableCell className="text-right">{detail.itemsPerContainer || planDetails.itemsPerContainer}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  ${detail.ratePerUnit.toFixed(4)}
                                  <span className="group relative cursor-help flex items-center">
                                    <Info className="h-4 w-4 text-blue-400" />
                                    <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-72 bg-popover text-popover-foreground text-xs border p-2 rounded shadow-lg z-50 text-left font-normal whitespace-normal">
                                      {detail.calculationExplanation}
                                    </span>
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{detail.unitsWeek3.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-emerald-400">${detail.costWeek3.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{detail.unitsWeek4.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-emerald-400">${detail.costWeek4.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {/* Totals Row */}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={7}>TOTAL</TableCell>
                            <TableCell className="text-right">
                              {planDetails.details.reduce((sum, d) => sum + d.unitsWeek3, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-emerald-400">
                              ${planDetails.totalCostWeek3.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {planDetails.details.reduce((sum, d) => sum + d.unitsWeek4, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-emerald-400">
                              ${planDetails.totalCostWeek4.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <p className="text-sm text-muted-foreground">Week 3 Total Cost</p>
                          <p className="text-2xl font-bold text-emerald-400">${planDetails.totalCostWeek3.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <p className="text-sm text-muted-foreground">Week 4 Total Cost</p>
                          <p className="text-2xl font-bold text-emerald-400">${planDetails.totalCostWeek4.toLocaleString()}</p>
                        </div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Global Map Display (Always Visible) */}
            <Card className="bg-card border-border lg:col-span-3 overflow-hidden shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5 text-blue-500" /> Route Map</CardTitle>
                <CardDescription>Geographic distribution and fulfillment routes</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractivePlanningMap links={mapLinks} warehouses={store.warehouses} distributionCenters={store.distributionCenters} selectedWarehouses={store.customerSettings.selectedWarehouses} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
