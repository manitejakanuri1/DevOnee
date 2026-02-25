"use client";

import { useState, useEffect } from 'react';
import { FileExplorer } from '@/components/file-explorer';
import { ChatInterface } from '@/components/chat-interface';
import { Stats01, StatData } from '@/components/ui/stats-cards';
import { Sparkles, GitBranch, Shield, Activity, Users, Terminal, Share2, AlertOctagon, HeartPulse, History, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RepositoryDashboard({ params }: { params: { owner: string, repo: string } }) {
    const { owner, repo } = params;

    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [overview, setOverview] = useState<string | null>(null);
    const [healthScore, setHealthScore] = useState<number | null>(null);

    // Mock Dashboard Analytics Data
    const [overviewStats, setOverviewStats] = useState<StatData[]>([
        { title: "Files Indexed", value: "1,204", change: 8, trend: "up" },
        { title: "Chat Queries", value: "89", change: 24, trend: "up" },
        { title: "Plans Generated", value: "12", change: -2, trend: "down" },
        { title: "Health Score", value: "92/100", change: 0, trend: "neutral" }
    ]);
    useEffect(() => {
        fetch('/api/repo/overview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setOverview(data.overview);
                    if (data.stats) {
                        setOverviewStats(prev => [
                            { title: "Files Indexed", value: data.stats.filesIndexed.toString(), change: 8, trend: "up" },
                            { title: "Chat Queries", value: data.stats.chatQueries.toString(), change: 24, trend: "up" },
                            { title: "Plans Generated", value: data.stats.plansGenerated.toString(), change: -2, trend: "down" },
                            prev.find(s => s.title === "Health Score") || { title: "Health Score", value: "...", change: 0, trend: "neutral" }
                        ]);
                    }
                }
            })
            .catch(console.error);

        // Fetch health score independently
        fetch('/api/repo/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.healthScore !== undefined) {
                    setHealthScore(data.healthScore);
                    setOverviewStats(prev => prev.map(stat =>
                        stat.title === "Health Score" ? { ...stat, value: `${data.healthScore}/100` } : stat
                    ));
                }
            })
            .catch(console.error);
    }, [owner, repo]);



    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col font-sans">

            {/* Top Navigation / Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg outline outline-1 outline-slate-700 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold">
                            D1
                        </div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <span className="text-slate-400 font-normal">{owner}</span>
                            <span className="text-slate-600">/</span>
                            {repo}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                            <Shield size={14} className="text-green-400" /> Score: <span className="text-white font-medium">{healthScore !== null ? `${healthScore}/100` : '...'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                            <GitBranch size={14} className="text-blue-400" /> Default: <span className="text-white font-medium">main</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">

                {/* Left Content Area (Unified Dashboard Layout) */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 md:p-8 mt-6">
                        <h2 className="text-2xl font-bold mb-4 text-white">Project Summary</h2>
                        {overview ? (
                            <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">{overview}</p>
                        ) : (
                            <div className="animate-pulse space-y-3 max-w-4xl">
                                <div className="h-4 bg-slate-700 rounded w-full"></div>
                                <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                                <div className="h-4 bg-slate-700 rounded w-4/6"></div>
                            </div>
                        )}
                    </div>

                    {/* Analytics Compact Grid */}
                    <Stats01 data={overviewStats} className="shadow-xl" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 group hover:border-blue-500/30 transition-colors">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <FileExplorer owner={owner} repo={repo} selectedFiles={selectedFiles} onSelectFiles={setSelectedFiles} />
                            </h3>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                <Sparkles size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Ready to contribute?</h3>
                            <p className="text-slate-400 mb-6 max-w-[250px]">Generate a tailored onboarding plan utilizing AI RAG technology.</p>
                            <button
                                onClick={() => { alert('Onboarding Plan Generation UI moved to a separate route.'); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Generate AI Plan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (Chat) */}
                <div className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 flex flex-col h-[calc(100vh-8rem)] sticky top-24 z-10">
                    <ChatInterface owner={owner} repo={repo} selectedFiles={selectedFiles} />
                </div>

            </main>
        </div>
    );
}
