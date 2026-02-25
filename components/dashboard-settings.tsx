"use client";

import { useState } from "react";
import { DashboardConfiguration, DashboardWidget } from "@/components/ui/dashboard-configuration";
import { Settings2, BarChart2, Activity } from "lucide-react";

interface DashboardSettingsProps {
    repoHealth?: string | null;
    usageCount?: number;
}

export function DashboardSettings({ repoHealth, usageCount }: DashboardSettingsProps) {
    const [widgets, setWidgets] = useState<DashboardWidget[]>([
        {
            id: "overview",
            title: "Repository Overview",
            description: "High-level summary, language breakdown, and fundamental metrics.",
            enabled: true,
        },
        {
            id: "mentor",
            title: "AI Mentor & Chat",
            description: "Interactive RAG-powered coding mentor for this codebase.",
            enabled: true,
        },
        {
            id: "sandbox",
            title: "Contribution Sandbox",
            description: "Experiment with suggested starting issues and isolated code testing.",
            enabled: true,
        },
        {
            id: "topology",
            title: "Topology Graph",
            description: "Visual node graph mapping deep file relationships.",
            enabled: true,
        },
        {
            id: "community",
            title: "Community Insights",
            description: "Historical metrics and contributors analysis.",
            enabled: false,
        },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                <DashboardConfiguration
                    widgets={widgets}
                    onWidgetsChange={setWidgets}
                />

                {/* Mocking the real data injection into setting widgets logic */}
                <div className="flex-1 space-y-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity className="text-blue-400" size={20} /> Repository Health Snapshot
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                                <p className="text-sm text-slate-400 mb-1">Health Score</p>
                                <p className="text-3xl font-black text-emerald-400">{repoHealth ? `${repoHealth}/100` : "Scanning..."}</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                                <p className="text-sm text-slate-400 mb-1">Vector Queries Left</p>
                                <p className="text-3xl font-black text-amber-400">{usageCount ? Math.max(0, 100 - usageCount) : 100}</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-400 mt-6 leading-relaxed">
                            Use the widget configurator to enable or disable tabs on this dashboard. Your layout preferences are automatically synchronized with your DevOne profile.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
