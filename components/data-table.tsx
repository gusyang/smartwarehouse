"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Pencil, Check, X } from "lucide-react"
import { useState } from "react"

interface Column<T> {
  key: keyof T
  header: string
  headerCn?: string
  type?: "text" | "number"
  editable?: boolean
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  onAdd?: () => void
  onUpdate?: (id: string, data: Partial<T>) => void
  onDelete?: (id: string) => void
  addLabel?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onAdd,
  onUpdate,
  onDelete,
  addLabel = "Add",
}: DataTableProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<T>>({})

  const startEdit = (item: T) => {
    setEditingId(item.id)
    setEditValues(item)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = () => {
    if (editingId && onUpdate) {
      onUpdate(editingId, editValues)
    }
    setEditingId(null)
    setEditValues({})
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="text-card-foreground">
                  <div className="flex flex-col">
                    <span className="font-medium">{column.header}</span>
                    {column.headerCn && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {column.headerCn}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {(onUpdate || onDelete) && (
                <TableHead className="w-24 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onUpdate || onDelete ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {editingId === item.id && column.editable !== false ? (
                        <Input
                          type={column.type || "text"}
                          value={String(editValues[column.key] ?? "")}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              [column.key]:
                                column.type === "number"
                                  ? parseFloat(e.target.value) || 0
                                  : e.target.value,
                            })
                          }
                          className="h-8 max-w-[200px]"
                        />
                      ) : (
                        <span className="text-sm">
                          {column.type === "number"
                            ? (item[column.key] as number).toLocaleString()
                            : String(item[column.key])}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  {(onUpdate || onDelete) && (
                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={saveEdit}
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEdit}
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {onUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onDelete(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {onAdd && (
        <Button onClick={onAdd} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {addLabel}
        </Button>
      )}
    </div>
  )
}
