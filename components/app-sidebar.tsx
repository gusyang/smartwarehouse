"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Database,
  ClipboardList,
  BarChart3,
  FolderOpen,
  Warehouse,
} from "lucide-react"

const navigation = [
  {
    name: "Master Data",
    nameCn: "基础数据",
    href: "/",
    icon: Database,
  },
  {
    name: "Planning",
    nameCn: "计划配置",
    href: "/planning",
    icon: ClipboardList,
  },
  {
    name: "Analysis",
    nameCn: "优化分析",
    href: "/analysis",
    icon: BarChart3,
  },
  {
    name: "Data Management",
    nameCn: "数据管理",
    href: "/data",
    icon: FolderOpen,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Warehouse className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">Smart Warehouse</span>
          <span className="text-xs text-sidebar-muted">3PL Optimization</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs text-sidebar-muted">{item.nameCn}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="rounded-lg bg-sidebar-accent/50 p-3">
          <p className="text-xs text-sidebar-muted leading-relaxed">
            Optimize logistics, reduce costs
          </p>
          <p className="text-xs text-sidebar-muted mt-1">
            优化物流，降低成本
          </p>
          <div className="mt-3 pt-3 border-t border-sidebar-border/50">
            <Link 
              href={pathname === "/single-page" ? "/" : "/single-page"}
              className="text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors flex items-center"
              title="Toggle Layout Mode"
            >
              {pathname === "/single-page" ? "← Back to Multi-page" : "→ Try Single-page Mode"}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
