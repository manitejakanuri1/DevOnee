"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GripVertical, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface DashboardWidget {
    id: string
    title: string
    description: string
    enabled: boolean
}

export interface DashboardConfigurationProps {
    widgets: DashboardWidget[]
    onWidgetsChange: (widgets: DashboardWidget[]) => void
}

export function DashboardConfiguration({ widgets, onWidgetsChange }: DashboardConfigurationProps) {
    const [draggedId, setDraggedId] = React.useState<string | null>(null)

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", id)
        setTimeout(() => {
            const el = document.getElementById(`widget-${id}`)
            if (el) el.style.opacity = "0.5"
        }, 0)
    }

    const handleDragEnd = (e: React.DragEvent, id: string) => {
        setDraggedId(null)
        const el = document.getElementById(`widget-${id}`)
        if (el) el.style.opacity = "1"
    }

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        if (!draggedId || draggedId === id) return

        const draggedIndex = widgets.findIndex((w) => w.id === draggedId)
        const overIndex = widgets.findIndex((w) => w.id === id)

        if (draggedIndex === overIndex) return

        const newWidgets = [...widgets]
        const [draggedItem] = newWidgets.splice(draggedIndex, 1)
        newWidgets.splice(overIndex, 0, draggedItem)

        onWidgetsChange(newWidgets)
    }

    const toggleWidget = (id: string, enabled: boolean) => {
        onWidgetsChange(
            widgets.map((w) => (w.id === id ? { ...w, enabled } : w))
        )
    }

    const enabledCount = widgets.filter((w) => w.enabled).length

    return (
        <Card className="w-full max-w-xl border-slate-700 bg-slate-800 text-slate-50 shadow-2xl">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl">Dashboard Configuration</CardTitle>
                <CardDescription className="text-slate-400">
                    Customize your workspace view. Drag to reorder components, toggle to show or hide panels.
                </CardDescription>
            </CardHeader>
            <Separator className="bg-slate-700" />
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-2">
                        <AnimatePresence initial={false}>
                            {widgets.map((widget) => (
                                <motion.div
                                    key={widget.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                >
                                    <div
                                        id={`widget-${widget.id}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, widget.id)}
                                        onDragEnd={(e) => handleDragEnd(e, widget.id)}
                                        onDragOver={(e) => handleDragOver(e, widget.id)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 shadow-sm transition-colors",
                                            draggedId === widget.id && "bg-slate-900 border-blue-500/50",
                                            !widget.enabled && "opacity-60"
                                        )}
                                    >
                                        <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors">
                                            <GripVertical className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-medium", !widget.enabled && "line-through text-slate-400")}>
                                                {widget.title}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">
                                                {widget.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 pl-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-slate-50 hover:bg-slate-700"
                                                onClick={() => toggleWidget(widget.id, !widget.enabled)}
                                            >
                                                {widget.enabled ? (
                                                    <Eye className="h-4 w-4" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">Toggle {widget.title}</span>
                                            </Button>
                                            <Checkbox
                                                checked={widget.enabled}
                                                onCheckedChange={(checked) => toggleWidget(widget.id, checked as boolean)}
                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </CardContent>
            <Separator className="bg-slate-700" />
            <div className="p-4 bg-slate-900/30 flex justify-between items-center rounded-b-xl px-6">
                <span className="text-sm text-slate-400 font-medium">
                    Showing {enabledCount} of {widgets.length} active widgets
                </span>
                <Button variant="outline" size="sm" className="h-8 border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-slate-50">
                    Restore Defaults
                </Button>
            </div>
        </Card>
    )
}
