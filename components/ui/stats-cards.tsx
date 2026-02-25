"use client"

import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface StatData {
    title: string
    value: string | number
    change: number
    trend: "up" | "down" | "neutral"
    href?: string
}

export interface Stats05Props {
    data: StatData[]
    className?: string
}

export function Stats05({ data, className }: Stats05Props) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-3", className)}>
            {data.map((stat, i) => (
                <Card key={i} className="flex flex-col bg-slate-800 border-slate-700 shadow-sm text-slate-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            {stat.title}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-50 hover:bg-slate-700">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1 flex-1">
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span
                                className={cn(
                                    "flex items-center",
                                    stat.trend === "up" && "text-emerald-400",
                                    stat.trend === "down" && "text-red-400",
                                    stat.trend === "neutral" && "text-slate-500"
                                )}
                            >
                                {stat.trend === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                                {stat.trend === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {stat.change}%
                            </span>
                            from last month
                        </p>
                    </CardContent>
                    {stat.href && (
                        <div className="px-6 pb-4 mt-auto">
                            <Link href={stat.href} className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                                View details <span aria-hidden="true">&rarr;</span>
                            </Link>
                        </div>
                    )}
                </Card>
            ))}
        </div>
    )
}

export interface Stats01Props {
    data: StatData[]
    className?: string
}

export function Stats01({ data, className }: Stats01Props) {
    return (
        <Card className={cn("overflow-hidden bg-slate-800 border-slate-700 text-slate-50", className)}>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
                {data.map((stat, i) => (
                    <div key={i} className="flex flex-col p-6">
                        <span className="text-sm font-medium text-slate-400">
                            {stat.title}
                        </span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-white">
                                {stat.value}
                            </span>
                            <span
                                className={cn(
                                    "flex items-center text-sm font-medium",
                                    stat.trend === "up" && "text-emerald-400",
                                    stat.trend === "down" && "text-red-400",
                                    stat.trend === "neutral" && "text-slate-500"
                                )}
                            >
                                {stat.trend === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                                {stat.trend === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {stat.change > 0 && stat.trend !== "neutral" ? "+" : ""}{stat.change}%
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1">vs last month</span>
                    </div>
                ))}
            </div>
        </Card>
    )
}
