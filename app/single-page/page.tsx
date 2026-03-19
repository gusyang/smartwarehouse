"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp } from "lucide-react"
import { Button } from "@/components/ui/button"

import MasterDataPage from "../page"
import PlanningPage from "../planning/page"
import AnalysisPage from "../analysis/page"
import DataManagementPage from "../data/page"

export default function SinglePageMode() {
  const [expanded, setExpanded] = useState({
    masterData: true,
    planning: true,
    analysis: false,
    dataManagement: false,
  })

  const toggle = (section: keyof typeof expanded) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const expandAll = () => setExpanded({ masterData: true, planning: true, analysis: true, dataManagement: true })
  const collapseAll = () => setExpanded({ masterData: false, planning: false, analysis: false, dataManagement: false })

  return (
    <div className="space-y-12 pb-20 max-w-7xl mx-auto">
      <div className="border-b pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All-in-One Dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            这是“单页面展示版”。为避免页面过长，您可以点击区块标题进行折叠或展开。顶部提供了一键全部展开/收起功能。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-2" /> 收起全部
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-2" /> 展开全部
          </Button>
        </div>
      </div>

      <section id="master-data" className="scroll-mt-10 relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
        <div 
          className="mb-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
          onClick={() => toggle("masterData")}
        >
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {expanded.masterData ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              1. Master Data
            </h2>
            <p className="text-muted-foreground text-sm ml-7">Step 1: Review network constraints (Warehouses, DCs, Carriers, SKUs)</p>
          </div>
        </div>
        {expanded.masterData && (
          <div className="border bg-card/30 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <MasterDataPage />
          </div>
        )}
      </section>

      <section id="planning" className="scroll-mt-10 relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-500 rounded-full" />
        <div 
          className="mb-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
          onClick={() => toggle("planning")}
        >
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {expanded.planning ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              2. Planning
            </h2>
            <p className="text-muted-foreground text-sm ml-7">Step 2: Check Demand & Generate Legacy "Baseline Plan"</p>
          </div>
        </div>
        {expanded.planning && (
          <div className="border bg-card/30 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <PlanningPage />
          </div>
        )}
      </section>

      <section id="analysis" className="scroll-mt-10 relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-500 rounded-full" />
        <div 
          className="mb-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
          onClick={() => toggle("analysis")}
        >
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {expanded.analysis ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              3. Analysis
            </h2>
            <p className="text-muted-foreground text-sm ml-7">Step 3: Run AI algorithm to optimize routes and compare savings</p>
          </div>
        </div>
        {expanded.analysis && (
          <div className="border bg-card/30 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <AnalysisPage />
          </div>
        )}
      </section>

      <section id="data-management" className="scroll-mt-10 relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-amber-500 rounded-full" />
        <div 
          className="mb-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
          onClick={() => toggle("dataManagement")}
        >
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {expanded.dataManagement ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              4. Data Management
            </h2>
            <p className="text-muted-foreground text-sm ml-7">Manage, reset demo data, or export configurations</p>
          </div>
        </div>
        {expanded.dataManagement && (
          <div className="border bg-card/30 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <DataManagementPage />
          </div>
        )}
      </section>
    </div>
  )
}
