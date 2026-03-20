"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useWarehouseStore } from "@/lib/store"
import { Warehouse, Building2, Package, Truck, Plus, Trash2, Check, Pencil, X } from "lucide-react"

export default function MasterDataPage() {
  const store = useWarehouseStore()
  const [activeTab, setActiveTab] = useState("warehouses")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form states
  const [newWarehouse, setNewWarehouse] = useState({ name: "", address: "", capacity: 10000 })
  const [newDC, setNewDC] = useState({ channel: "", state: "", address: "" })
  const [newSku, setNewSku] = useState<{ skuCode: string, name: string, lengthIn: number, widthIn: number, heightIn: number, weightLbs: number, unitType: "each" | "case" | "pallet" }>({ skuCode: "", name: "", lengthIn: 12, widthIn: 8, heightIn: 6, weightLbs: 5, unitType: "each" })
  const [newCarrier, setNewCarrier] = useState<{ name: string, mode: "FTL" | "LTL" | "Container", description: string }>({ name: "", mode: "FTL", description: "" })
  const [newRate, setNewRate] = useState({ carrierId: "", minDistance: 0, maxDistance: 500, ratePerMile: 2.5, minimumCharge: 200, fixedCost: 50 })

  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null)
  const [editingDCId, setEditingDCId] = useState<string | null>(null)
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null)
  const [editingCarrierId, setEditingCarrierId] = useState<string | null>(null)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Data</h1>
          <p className="text-muted-foreground">Manage warehouses, distribution centers, products, and carriers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card border border-border">
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            <span className="hidden sm:inline">Warehouses</span>
          </TabsTrigger>
          <TabsTrigger value="dc" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">DC</span>
          </TabsTrigger>
          <TabsTrigger value="sku" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">SKU</span>
          </TabsTrigger>
          <TabsTrigger value="carriers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Carriers</span>
          </TabsTrigger>
        </TabsList>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Warehouse Management</CardTitle>
              <CardDescription>Manage your warehouse locations and capacities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.warehouses.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-medium">{wh.name}</TableCell>
                      <TableCell className="text-muted-foreground">{wh.address}</TableCell>
                      <TableCell className="text-right">{wh.capacity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingWarehouseId(wh.id)
                            setNewWarehouse({ name: wh.name, address: wh.address, capacity: wh.capacity })
                          }}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => store.deleteWarehouse(wh.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell>{store.warehouses.length} warehouses</TableCell>
                    <TableCell className="text-right font-bold">
                      {store.warehouses.reduce((sum, w) => sum + w.capacity, 0).toLocaleString()}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingWarehouseId ? "Edit Warehouse" : "Add New Warehouse"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        placeholder="Warehouse name"
                        value={newWarehouse.name}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Address</Label>
                      <Input 
                        placeholder="Full address"
                        value={newWarehouse.address}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input 
                        type="number"
                        value={newWarehouse.capacity}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {editingWarehouseId ? (
                      <>
                        <Button onClick={() => {
                          if (newWarehouse.name && newWarehouse.address) {
                            store.updateWarehouse(editingWarehouseId, newWarehouse)
                            setEditingWarehouseId(null)
                            setNewWarehouse({ name: "", address: "", capacity: 10000 })
                            showSuccess("Warehouse updated successfully")
                          }
                        }}>
                          <Check className="h-4 w-4 mr-2" /> Update Warehouse
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingWarehouseId(null)
                          setNewWarehouse({ name: "", address: "", capacity: 10000 })
                        }}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => {
                        if (newWarehouse.name && newWarehouse.address) {
                          store.addWarehouse({ id: Date.now().toString(), ...newWarehouse })
                          setNewWarehouse({ name: "", address: "", capacity: 10000 })
                          showSuccess("Warehouse added successfully")
                        }
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Warehouse
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Centers Tab */}
        <TabsContent value="dc" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Distribution Center Management</CardTitle>
              <CardDescription>Configure your distribution centers by channel and state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.distributionCenters.map((dc) => (
                    <TableRow key={dc.id}>
                      <TableCell>
                        <Badge variant="outline">{dc.channel}</Badge>
                      </TableCell>
                      <TableCell>{dc.state}</TableCell>
                      <TableCell className="text-muted-foreground">{dc.address}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingDCId(dc.id)
                            setNewDC({ channel: dc.channel, state: dc.state, address: dc.address })
                          }}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => store.deleteDistributionCenter(dc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingDCId ? "Edit Distribution Center" : "Add New Distribution Center"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Input 
                        placeholder="e.g., Amazon"
                        value={newDC.channel}
                        onChange={(e) => setNewDC({ ...newDC, channel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input 
                        placeholder="e.g., CA"
                        value={newDC.state}
                        onChange={(e) => setNewDC({ ...newDC, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Address</Label>
                      <Input 
                        placeholder="Full address"
                        value={newDC.address}
                        onChange={(e) => setNewDC({ ...newDC, address: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {editingDCId ? (
                      <>
                        <Button onClick={() => {
                          if (newDC.channel && newDC.state && newDC.address) {
                            store.updateDistributionCenter(editingDCId, newDC)
                            setEditingDCId(null)
                            setNewDC({ channel: "", state: "", address: "" })
                            showSuccess("Distribution Center updated successfully")
                          }
                        }}>
                          <Check className="h-4 w-4 mr-2" /> Update DC
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingDCId(null)
                          setNewDC({ channel: "", state: "", address: "" })
                        }}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => {
                        if (newDC.channel && newDC.state && newDC.address) {
                          store.addDistributionCenter({ id: Date.now().toString(), ...newDC })
                          setNewDC({ channel: "", state: "", address: "" })
                          showSuccess("Distribution Center added successfully")
                        }
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add DC
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SKU Tab */}
        <TabsContent value="sku" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>SKU Management</CardTitle>
              <CardDescription>Manage product SKUs with dimensions and weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Dimensions (LxWxH)</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Dim Weight</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.skus.map((sku) => {
                    const dimWeight = (sku.lengthIn * sku.widthIn * sku.heightIn) / 139
                    return (
                      <TableRow key={sku.id}>
                        <TableCell className="font-mono">{sku.skuCode}</TableCell>
                        <TableCell>{sku.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {sku.lengthIn}" x {sku.widthIn}" x {sku.heightIn}"
                        </TableCell>
                        <TableCell className="text-right">{sku.weightLbs} lbs</TableCell>
                        <TableCell className="text-right text-muted-foreground">{dimWeight.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{sku.unitType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingSkuId(sku.id)
                              setNewSku({ skuCode: sku.skuCode, name: sku.name, lengthIn: sku.lengthIn, widthIn: sku.widthIn, heightIn: sku.heightIn, weightLbs: sku.weightLbs, unitType: sku.unitType })
                            }}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.deleteSku(sku.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{editingSkuId ? "Edit SKU" : "Add New SKU"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>SKU Code</Label>
                      <Input 
                        placeholder="SKU-001"
                        value={newSku.skuCode}
                        onChange={(e) => setNewSku({ ...newSku, skuCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input 
                        placeholder="Widget A"
                        value={newSku.name}
                        onChange={(e) => setNewSku({ ...newSku, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Length (in)</Label>
                      <Input 
                        type="number"
                        value={newSku.lengthIn}
                        onChange={(e) => setNewSku({ ...newSku, lengthIn: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width (in)</Label>
                      <Input 
                        type="number"
                        value={newSku.widthIn}
                        onChange={(e) => setNewSku({ ...newSku, widthIn: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (in)</Label>
                      <Input 
                        type="number"
                        value={newSku.heightIn}
                        onChange={(e) => setNewSku({ ...newSku, heightIn: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (lbs)</Label>
                      <Input 
                        type="number"
                        value={newSku.weightLbs}
                        onChange={(e) => setNewSku({ ...newSku, weightLbs: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Type</Label>
                      <Select value={newSku.unitType} onValueChange={(v) => setNewSku({ ...newSku, unitType: v as "each" | "case" | "pallet" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="case">Case</SelectItem>
                          <SelectItem value="pallet">Pallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {editingSkuId ? (
                      <>
                        <Button onClick={() => {
                          if (newSku.skuCode && newSku.name) {
                            store.updateSku(editingSkuId, newSku)
                            setEditingSkuId(null)
                            setNewSku({ skuCode: "", name: "", lengthIn: 12, widthIn: 8, heightIn: 6, weightLbs: 5, unitType: "each" })
                            showSuccess("SKU updated successfully")
                          }
                        }}>
                          <Check className="h-4 w-4 mr-2" /> Update SKU
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingSkuId(null)
                          setNewSku({ skuCode: "", name: "", lengthIn: 12, widthIn: 8, heightIn: 6, weightLbs: 5, unitType: "each" })
                        }}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => {
                        if (newSku.skuCode && newSku.name) {
                          store.addSku({ id: Date.now().toString(), ...newSku })
                          setNewSku({ skuCode: "", name: "", lengthIn: 12, widthIn: 8, heightIn: 6, weightLbs: 5, unitType: "each" })
                          showSuccess("SKU added successfully")
                        }
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add SKU
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Carrier & Rate Management</CardTitle>
              <CardDescription>Configure carriers and their shipping rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Carriers Table */}
              <div>
                <h3 className="text-sm font-medium mb-3">Carriers</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.carriers.map((carrier) => (
                      <TableRow key={carrier.id}>
                        <TableCell className="font-medium">{carrier.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{carrier.mode}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{carrier.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingCarrierId(carrier.id)
                              setNewCarrier({ name: carrier.name, mode: carrier.mode, description: carrier.description })
                            }}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.deleteCarrier(carrier.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Card className="bg-muted/30 border-dashed mt-4">
                  <CardContent className="pt-4">
                    {editingCarrierId && (
                      <div className="mb-4 text-sm font-medium text-blue-500 flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Editing Carrier
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                          placeholder="Carrier name"
                          value={newCarrier.name}
                          onChange={(e) => setNewCarrier({ ...newCarrier, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mode</Label>
                        <Select value={newCarrier.mode} onValueChange={(v) => setNewCarrier({ ...newCarrier, mode: v as "FTL" | "LTL" | "Container" })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FTL">FTL</SelectItem>
                            <SelectItem value="LTL">LTL</SelectItem>
                            <SelectItem value="Container">Container</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Description</Label>
                        <Input 
                          placeholder="Description"
                          value={newCarrier.description}
                          onChange={(e) => setNewCarrier({ ...newCarrier, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {editingCarrierId ? (
                        <>
                          <Button onClick={() => {
                            if (newCarrier.name) {
                              store.updateCarrier(editingCarrierId, newCarrier)
                              setEditingCarrierId(null)
                              setNewCarrier({ name: "", mode: "FTL", description: "" })
                              showSuccess("Carrier updated successfully")
                            }
                          }}>
                            <Check className="h-4 w-4 mr-2" /> Update Carrier
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setEditingCarrierId(null)
                            setNewCarrier({ name: "", mode: "FTL", description: "" })
                          }}>
                            <X className="h-4 w-4 mr-2" /> Cancel
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => {
                          if (newCarrier.name) {
                            store.addCarrier({ id: Date.now().toString(), ...newCarrier })
                            setNewCarrier({ name: "", mode: "FTL", description: "" })
                            showSuccess("Carrier added successfully")
                          }
                        }}>
                          <Plus className="h-4 w-4 mr-2" /> Add Carrier
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rates Table */}
              <div>
                <h3 className="text-sm font-medium mb-3">Shipping Rates</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Distance Range</TableHead>
                      <TableHead className="text-right">$/Mile</TableHead>
                      <TableHead className="text-right">Min Charge</TableHead>
                      <TableHead className="text-right">Fixed Cost</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.rates.map((rate) => {
                      const carrier = store.carriers.find(c => c.id === rate.carrierId)
                      return (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{carrier?.name || "Unknown"}</TableCell>
                          <TableCell className="text-right">{rate.minDistance} - {rate.maxDistance} mi</TableCell>
                          <TableCell className="text-right font-mono">${rate.ratePerMile.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">${rate.minimumCharge}</TableCell>
                          <TableCell className="text-right font-mono">${rate.fixedCost}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingRateId(rate.id)
                                setNewRate({ carrierId: rate.carrierId, minDistance: rate.minDistance, maxDistance: rate.maxDistance, ratePerMile: rate.ratePerMile, minimumCharge: rate.minimumCharge, fixedCost: rate.fixedCost })
                              }}>
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => store.deleteRate(rate.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <Card className="bg-muted/30 border-dashed mt-4">
                  <CardContent className="pt-4">
                    {editingRateId && (
                      <div className="mb-4 text-sm font-medium text-blue-500 flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Editing Rate
                      </div>
                    )}
                    <div className="grid grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Label>Carrier</Label>
                        <Select value={newRate.carrierId} onValueChange={(v) => setNewRate({ ...newRate, carrierId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {store.carriers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Min Distance</Label>
                        <Input 
                          type="number"
                          value={newRate.minDistance}
                          onChange={(e) => setNewRate({ ...newRate, minDistance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Distance</Label>
                        <Input 
                          type="number"
                          value={newRate.maxDistance}
                          onChange={(e) => setNewRate({ ...newRate, maxDistance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>$/Mile</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={newRate.ratePerMile}
                          onChange={(e) => setNewRate({ ...newRate, ratePerMile: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min Charge</Label>
                        <Input 
                          type="number"
                          value={newRate.minimumCharge}
                          onChange={(e) => setNewRate({ ...newRate, minimumCharge: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fixed Cost</Label>
                        <Input 
                          type="number"
                          value={newRate.fixedCost}
                          onChange={(e) => setNewRate({ ...newRate, fixedCost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {editingRateId ? (
                        <>
                          <Button onClick={() => {
                            if (newRate.carrierId) {
                              const carrier = store.carriers.find(c => c.id === newRate.carrierId)
                              store.updateRate(editingRateId, { carrierName: carrier?.name || "Unknown", mode: carrier?.mode || "FTL", ...newRate })
                              setEditingRateId(null)
                              setNewRate({ carrierId: "", minDistance: 0, maxDistance: 500, ratePerMile: 2.5, minimumCharge: 200, fixedCost: 50 })
                              showSuccess("Rate updated successfully")
                            }
                          }}>
                            <Check className="h-4 w-4 mr-2" /> Update Rate
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setEditingRateId(null)
                            setNewRate({ carrierId: "", minDistance: 0, maxDistance: 500, ratePerMile: 2.5, minimumCharge: 200, fixedCost: 50 })
                          }}>
                            <X className="h-4 w-4 mr-2" /> Cancel
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => {
                          if (newRate.carrierId) {
                            const carrier = store.carriers.find(c => c.id === newRate.carrierId)
                            store.addRate({ id: Date.now().toString(), carrierName: carrier?.name || "Unknown", mode: carrier?.mode || "FTL", ...newRate })
                            setNewRate({ carrierId: "", minDistance: 0, maxDistance: 500, ratePerMile: 2.5, minimumCharge: 200, fixedCost: 50 })
                            showSuccess("Rate added successfully")
                          }
                        }}>
                          <Plus className="h-4 w-4 mr-2" /> Add Rate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
