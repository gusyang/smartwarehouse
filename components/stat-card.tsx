import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  titleCn?: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
  variant?: "default" | "success" | "warning" | "primary"
}

export function StatCard({
  title,
  titleCn,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    primary: "bg-primary/10 border-primary/20",
  }

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    primary: "text-primary",
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            {titleCn && (
              <span className="text-xs text-muted-foreground/70">{titleCn}</span>
            )}
          </div>
          <div className="text-2xl font-semibold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-success" : "text-destructive"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2",
              variant === "default" ? "bg-muted" : "bg-background/50"
            )}
          >
            <Icon className={cn("h-5 w-5", iconStyles[variant])} />
          </div>
        )}
      </div>
    </div>
  )
}
