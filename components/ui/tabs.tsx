import { cn } from "@/lib/utils"

export function Tabs({ defaultValue, className, children }: any) {
    // Simple native implementation of tabs layout structure without full Radix for brevity
    return <div className={cn("flex flex-col", className)} data-state={defaultValue}>{children}</div>
}

export function TabsList({ className, children, activeTab, setActiveTab }: any) {
    return (
        <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-slate-900 p-1 text-slate-400", className)}>
            {children}
        </div>
    )
}

export function TabsTrigger({ value, activeTab, setActiveTab, children, className }: any) {
    const isActive = activeTab === value;
    return (
        <button
            type="button"
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-slate-800 text-white shadow-sm" : "hover:bg-slate-800/50 hover:text-slate-200",
                className
            )}
            onClick={() => setActiveTab(value)}
        >
            {children}
        </button>
    )
}

export function TabsContent({ value, activeTab, className, children }: any) {
    if (activeTab !== value) return null;
    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    )
}
