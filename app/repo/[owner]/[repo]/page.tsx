"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu, X, MessageCircle, Shield, GitBranch,
    FileText, Bot, LayoutDashboard, Trophy, Share2, Terminal,
    Network, Brain,
} from 'lucide-react';

import { FileExplorer } from '@/components/file-explorer';
import { ChatInterface } from '@/components/chat-interface';
import { RepoUrlInput } from '@/components/repo-dashboard/repo-url-input';
import { RepoStatsCard } from '@/components/repo-dashboard/repo-stats-card';
import { HealthScoreVisual } from '@/components/repo-dashboard/health-score-visual';
import { ReadmePreview } from '@/components/repo-dashboard/readme-preview';
import { FileViewer } from '@/components/repo-dashboard/file-viewer';
import { ChallengeBoard } from '@/components/challenge-board';
import { FlowchartView } from '@/components/flowchart/flowchart-view';
import { MindmapView } from '@/components/flowchart/mindmap-view';
import { ContributeSandbox } from '@/components/contribute-sandbox';
import { DryRunPanel } from '@/components/dry-run-panel';
import { LicenseWarning } from '@/components/repo-dashboard/license-warning';

type Tab = 'overview' | 'challenges' | 'map' | 'contribute';

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
    { key: 'challenges', label: 'Challenges', icon: <Trophy size={14} /> },
    { key: 'map', label: 'Codebase Map', icon: <Share2 size={14} /> },
    { key: 'contribute', label: 'Contribute', icon: <Terminal size={14} /> },
];

// ── Codebase Map sub-tab with Flowchart/Mindmap toggle ──
function CodebaseMapTab({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
    const [mapView, setMapView] = useState<'mindmap' | 'flowchart'>('mindmap');

    return (
        <div className="space-y-4">
            {/* Toggle bar */}
            <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setMapView('mindmap')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        mapView === 'mindmap'
                            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                >
                    <Brain size={14} /> Mindmap
                </button>
                <button
                    onClick={() => setMapView('flowchart')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        mapView === 'flowchart'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                >
                    <Network size={14} /> Import Graph
                </button>
            </div>

            {/* View */}
            {mapView === 'mindmap' ? (
                <MindmapView owner={owner} repo={repo} branch={branch} />
            ) : (
                <FlowchartView owner={owner} repo={repo} branch={branch} />
            )}
        </div>
    );
}

export default function RepositoryDashboard({ params }: { params: { owner: string; repo: string } }) {
    const router = useRouter();

    // Core repo state
    const [owner, setOwner] = useState(params.owner);
    const [repo, setRepo] = useState(params.repo);
    const [branch, setBranch] = useState('main');

    // Data state
    const [overview, setOverview] = useState<string | null>(null);
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [healthMetrics, setHealthMetrics] = useState<Record<string, any> | null>(null);
    const [repoMetadata, setRepoMetadata] = useState<any>(null);

    // File state
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [showDryRun, setShowDryRun] = useState(false);
    const [dryRunChallenge, setDryRunChallenge] = useState<any>(null);

    // Responsive panel state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    // Fetch all data when owner/repo changes
    useEffect(() => {
        setOverview(null);
        setHealthScore(null);
        setHealthMetrics(null);
        setRepoMetadata(null);
        setActiveFile(null);
        setSelectedFiles([]);

        // Fetch overview
        fetch('/api/repo/overview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => { if (data.success) setOverview(data.overview); })
            .catch(console.error);

        // Fetch health
        fetch('/api/repo/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setHealthScore(data.healthScore ?? null);
                    setHealthMetrics(data.metrics ?? null);
                }
            })
            .catch(console.error);

        // Fetch metadata from GitHub API via our proxy
        fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        })
            .then(res => res.json())
            .then(data => {
                if (data.default_branch) setBranch(data.default_branch);
                setRepoMetadata(data);
            })
            .catch(console.error);
    }, [owner, repo]);

    const handleRepoNavigate = (newOwner: string, newRepo: string) => {
        setOwner(newOwner);
        setRepo(newRepo);
        router.push(`/repo/${newOwner}/${newRepo}`);
    };

    const handleFileClick = (filePath: string) => {
        setActiveFile(filePath);
        setActiveTab('overview');
        setSidebarOpen(false);
    };

    const handleSelectChallenge = (challenge: any) => {
        setSelectedChallenge(challenge);
        setActiveTab('contribute');
    };

    const handleDryRun = (challenge: any) => {
        setDryRunChallenge(challenge);
        setShowDryRun(true);
        setActiveTab('contribute');
    };

    return (
        <div className="h-screen bg-[#0B1120] text-slate-50 flex flex-col overflow-hidden">
            {/* ── Header ── */}
            <header className="h-14 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 gap-3 shrink-0">
                {/* Mobile sidebar toggle */}
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
                    <Menu size={18} className="text-slate-400" />
                </button>

                {/* Logo */}
                <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                    D1
                </a>

                {/* Repo name */}
                <h1 className="text-sm font-medium truncate">
                    <span className="text-slate-400 hover:text-blue-400 cursor-pointer transition-colors" onClick={() => router.push(`/user/${owner}`)}>{owner}</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-white">{repo}</span>
                </h1>

                <div className="flex-1" />

                {/* Badges */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-full">
                    <Shield size={12} className="text-green-400" />
                    <span className="text-white font-medium">{healthScore !== null ? `${healthScore}/100` : '...'}</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-full">
                    <GitBranch size={12} className="text-blue-400" />
                    <span className="text-white font-medium">{branch}</span>
                </div>

                {/* Mobile chat toggle */}
                <button onClick={() => setChatOpen(true)} className="lg:hidden shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
                    <MessageCircle size={18} className="text-slate-400" />
                </button>
            </header>

            {/* ── Tab Bar ── */}
            <div className="h-11 border-b border-white/5 bg-[#0B1120]/60 backdrop-blur-sm flex items-center px-4 gap-1 overflow-x-auto shrink-0 scrollbar-none">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setActiveFile(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.key
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Main 3-Panel Area ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT SIDEBAR (Desktop) ── */}
                <aside className="hidden lg:flex flex-col w-[280px] border-r border-white/5 bg-[#0B1120] shrink-0">
                    <FileExplorer
                        owner={owner}
                        repo={repo}
                        branch={branch}
                        selectedFiles={selectedFiles}
                        onSelectFiles={setSelectedFiles}
                        onFileClick={handleFileClick}
                    />
                </aside>

                {/* ── Mobile Sidebar Drawer ── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                            <motion.aside
                                initial={{ x: -300 }}
                                animate={{ x: 0 }}
                                exit={{ x: -300 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#0B1120] border-r border-white/5 z-50 lg:hidden flex flex-col"
                            >
                                <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
                                    <span className="font-semibold text-sm">Files</span>
                                    <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center">
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>
                                <FileExplorer
                                    owner={owner}
                                    repo={repo}
                                    branch={branch}
                                    selectedFiles={selectedFiles}
                                    onSelectFiles={setSelectedFiles}
                                    onFileClick={handleFileClick}
                                />
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* ── CENTER PANEL ── */}
                <main className="flex-1 overflow-y-auto panel-scroll">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                        {/* ── OVERVIEW TAB ── */}
                        {activeTab === 'overview' && (
                            <>
                                {/* Repo URL Input */}
                                <RepoUrlInput currentOwner={owner} currentRepo={repo} onNavigate={handleRepoNavigate} />

                                {/* License Warning */}
                                <LicenseWarning owner={owner} repo={repo} />

                                {activeFile ? (
                                    <FileViewer
                                        owner={owner}
                                        repo={repo}
                                        filePath={activeFile}
                                        branch={branch}
                                        onClose={() => setActiveFile(null)}
                                    />
                                ) : (
                                    <>
                                        {/* Project Summary */}
                                        <div className="glass-card rounded-2xl p-6">
                                            <h2 className="text-xl font-bold mb-3 text-white">Project Summary</h2>
                                            {overview ? (
                                                <p className="text-slate-300 leading-relaxed">{overview}</p>
                                            ) : (
                                                <div className="space-y-3 animate-pulse">
                                                    <div className="h-4 bg-white/5 rounded w-full" />
                                                    <div className="h-4 bg-white/5 rounded w-5/6" />
                                                    <div className="h-4 bg-white/5 rounded w-4/6" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Repo Stats */}
                                        <RepoStatsCard metadata={repoMetadata} />

                                        {/* Health Score */}
                                        <div className="glass-card rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-white mb-4">Repository Health</h3>
                                            <HealthScoreVisual score={healthScore} metrics={healthMetrics} />
                                        </div>

                                        {/* README */}
                                        <div className="glass-card rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                                <FileText size={18} className="text-slate-400" />
                                                README.md
                                            </h3>
                                            <ReadmePreview owner={owner} repo={repo} branch={branch} />
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* ── CHALLENGES TAB ── */}
                        {activeTab === 'challenges' && (
                            <ChallengeBoard
                                owner={owner}
                                repo={repo}
                                onSelectChallenge={handleSelectChallenge}
                                onDryRun={handleDryRun}
                            />
                        )}

                        {/* ── CODEBASE MAP TAB ── */}
                        {activeTab === 'map' && (
                            <CodebaseMapTab owner={owner} repo={repo} branch={branch} />
                        )}

                        {/* ── CONTRIBUTE TAB ── */}
                        {activeTab === 'contribute' && (
                            <div className="space-y-6">
                                {showDryRun && dryRunChallenge ? (
                                    <DryRunPanel
                                        owner={owner}
                                        repo={repo}
                                        filePath={dryRunChallenge.filePath || ''}
                                        originalContent={dryRunChallenge.originalContent || ''}
                                        newContent={dryRunChallenge.newContent || ''}
                                        challengeId={dryRunChallenge.id}
                                        onContribute={() => {
                                            setShowDryRun(false);
                                            setDryRunChallenge(null);
                                        }}
                                    />
                                ) : (
                                    <ContributeSandbox
                                        owner={owner}
                                        repo={repo}
                                        suggestion={selectedChallenge ? {
                                            title: selectedChallenge.title || '',
                                            description: selectedChallenge.description || '',
                                            files: selectedChallenge.files || [],
                                            steps: selectedChallenge.steps || [],
                                        } : null}
                                        challengeId={selectedChallenge?.id}
                                    />
                                )}
                            </div>
                        )}

                    </div>
                </main>

                {/* ── RIGHT PANEL - Chat (Desktop) ── */}
                <aside className="hidden lg:flex flex-col w-[400px] border-l border-white/5 bg-[#0B1120] shrink-0">
                    <ChatInterface owner={owner} repo={repo} selectedFiles={selectedFiles} embedded />
                </aside>

                {/* ── Mobile Chat Panel ── */}
                <AnimatePresence>
                    {chatOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                                onClick={() => setChatOpen(false)}
                            />
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed left-0 right-0 bottom-0 h-[85vh] bg-[#0B1120] border-t border-white/5 rounded-t-2xl z-50 lg:hidden flex flex-col"
                            >
                                <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
                                    <span className="font-semibold text-sm flex items-center gap-2">
                                        <Bot size={16} className="text-blue-400" />
                                        Repository Mentor
                                    </span>
                                    <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center">
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ChatInterface owner={owner} repo={repo} selectedFiles={selectedFiles} embedded />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
