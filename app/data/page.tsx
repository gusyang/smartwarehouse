"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWarehouseStore, type ExportConfig } from "@/lib/store"
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DataManagementPage() {
  const {
    warehouses,
    distributionCenters,
    demandForecasts,
    customerAllocations,
    smartResultsWeek3,
    smartCostWeek3,
    smartResultsWeek4,
    smartCostWeek4,
    customerResultsWeek3,
    customerCostWeek3,
    customerResultsWeek4,
    customerCostWeek4,
    exportConfig,
    importConfig,
    resetToDefaults,
  } = useWarehouseStore()

  const smartCost = (smartCostWeek3 || 0) + (smartCostWeek4 || 0)
  const customerCost = (customerCostWeek3 || 0) + (customerCostWeek4 || 0)
  const smartAllocation = [...(smartResultsWeek3 || []), ...(smartResultsWeek4 || [])]
  const hasResults = smartResultsWeek3 !== null && smartResultsWeek4 !== null


  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = () => {
    const config = exportConfig()
    const jsonStr = JSON.stringify(config, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "warehouse_config.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    // Export all data as multiple CSV files in a zip-like format
    // For simplicity, we'll export as a single combined CSV
    let csvContent = ""

    // Warehouses
    csvContent += "=== WAREHOUSES ===\n"
    csvContent += "Name,Address,Capacity\n"
    warehouses.forEach((w) => {
      csvContent += `"${w.name}","${w.address}",${w.capacity}\n`
    })

    csvContent += "\n=== DISTRIBUTION CENTERS ===\n"
    csvContent += "Channel,State,Address\n"
    distributionCenters.forEach((dc) => {
      csvContent += `"${dc.channel}","${dc.state}","${dc.address}"\n`
    })

    csvContent += "\n=== DEMAND FORECASTS ===\n"
    csvContent += "Product,Channel,State,Demand_Units\n"
    demandForecasts.forEach((d) => {
      csvContent += `"${d.product}","${d.channel}","${d.state}",${d.demandWeek3 + d.demandWeek4}\n`
    })

    csvContent += "\n=== CUSTOMER ALLOCATIONS ===\n"
    csvContent += "Product,Warehouse,Channel,State,Allocated_Units\n"
    customerAllocations.forEach((a) => {
      csvContent += `"${a.product}","${a.warehouse}","${a.channel}","${a.state}",${a.allocatedUnitsWeek3 + a.allocatedUnitsWeek4}\n`
    })

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "warehouse_data.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportResults = () => {
    if (!smartAllocation) {
      setImportStatus({
        type: "error",
        message: "No optimization results to export. Please run optimization first.",
      })
      return
    }

    let csvContent = "=== OPTIMIZATION RESULTS ===\n"
    csvContent += `Total Smart Cost,$${smartCost?.toFixed(2) || "N/A"}\n`
    csvContent += `Total Customer Cost,$${customerCost?.toFixed(2) || "N/A"}\n`
    if (customerCost && smartCost) {
      const savings = customerCost - smartCost
      csvContent += `Savings,$${savings.toFixed(2)} (${((savings / customerCost) * 100).toFixed(1)}%)\n`
    }

    csvContent += "\n=== SMART ALLOCATION DETAILS ===\n"
    csvContent += "Product,Warehouse,Channel,State,Allocated_Units,Cost_Per_Unit,Distance_Miles,Total_Cost\n"
    smartAllocation.forEach((a) => {
      csvContent += `"${a.product}","${a.warehouse}","${a.channel}","${a.state}",${a.allocatedUnits},${a.costPerUnit},${a.distanceMiles},${a.totalCost}\n`
    })

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "optimization_results.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as ExportConfig
        
        // Validate structure
        if (!config.warehouses || !config.distributionCenters || !config.demandForecasts) {
          throw new Error("Invalid configuration file structure")
        }

        importConfig(config)
        setImportStatus({
          type: "success",
          message: "Configuration imported successfully!",
        })
      } catch (error) {
        setImportStatus({
          type: "error",
          message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data to defaults? This cannot be undone.")) {
      resetToDefaults()
      setImportStatus({
        type: "success",
        message: "All data has been reset to defaults.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Management</h1>
          <p className="text-sm text-muted-foreground">数据管理</p>
        </div>
      </div>

      {importStatus && (
        <Alert
          variant={importStatus.type === "error" ? "destructive" : "default"}
          className={importStatus.type === "success" ? "border-success/50 bg-success/10" : ""}
        >
          {importStatus.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{importStatus.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{importStatus.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
            <CardDescription>导出配置 - Download your current configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button onClick={handleExportJSON} variant="outline" className="justify-start">
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <p className="text-xs text-muted-foreground ml-6">
                Full configuration including all settings. Can be imported back.
              </p>

              <Button onClick={handleExportCSV} variant="outline" className="justify-start">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              <p className="text-xs text-muted-foreground ml-6">
                Human-readable format for spreadsheet applications.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
            <CardDescription>导入配置 - Load a saved configuration file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
                id="json-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import JSON Configuration
              </Button>
              <p className="text-xs text-muted-foreground ml-6">
                Upload a previously exported JSON configuration file.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Analysis Results</CardTitle>
          <CardDescription>导出分析结果 - Download optimization results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleExportResults}
            variant="outline"
            disabled={!smartAllocation}
            className="justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Optimization Results
          </Button>
          {!smartAllocation && (
            <p className="text-xs text-muted-foreground">
              Run optimization first to export results.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Data Summary</CardTitle>
          <CardDescription>当前数据汇总</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Type</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Warehouses</TableCell>
                <TableCell className="text-right">{warehouses.length}</TableCell>
                <TableCell className="text-right">
                  {warehouses.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-success ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning ml-auto" />
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Distribution Centers</TableCell>
                <TableCell className="text-right">{distributionCenters.length}</TableCell>
                <TableCell className="text-right">
                  {distributionCenters.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-success ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning ml-auto" />
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Demand Forecasts</TableCell>
                <TableCell className="text-right">{demandForecasts.length}</TableCell>
                <TableCell className="text-right">
                  {demandForecasts.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-success ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning ml-auto" />
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Customer Allocations</TableCell>
                <TableCell className="text-right">{customerAllocations.length}</TableCell>
                <TableCell className="text-right">
                  {customerAllocations.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-success ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning ml-auto" />
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Optimization Results</TableCell>
                <TableCell className="text-right">{smartAllocation?.length || 0}</TableCell>
                <TableCell className="text-right">
                  {smartAllocation ? (
                    <CheckCircle className="h-4 w-4 text-success ml-auto" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground ml-auto" />
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>危险操作 - These actions cannot be undone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset to Defaults</p>
              <p className="text-xs text-muted-foreground">
                Reset all data to the default sample data
              </p>
            </div>
            <Button variant="destructive" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
