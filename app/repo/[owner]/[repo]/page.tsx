"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu, X, MessageCircle, Shield, GitBranch,
    FileText, Bot, LayoutDashboard, Trophy, Share2, Terminal,
    Network, Brain, RefreshCw, Loader2, BookOpen, Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
import { LicenseWarningDialog, LicenseBanner } from '@/components/license-warning-dialog';
import { CommunityInsightsTab } from '@/components/community-insights-tab';
import { Users } from 'lucide-react';

type Tab = 'overview' | 'challenges' | 'map' | 'contribute' | 'community';

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
    { key: 'challenges', label: 'Challenges', icon: <Trophy size={14} /> },
    { key: 'map', label: 'Codebase Map', icon: <Share2 size={14} /> },
    { key: 'contribute', label: 'Contribute', icon: <Terminal size={14} /> },
    { key: 'community', label: 'Community', icon: <Users size={14} /> },
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
    const [healthBreakdown, setHealthBreakdown] = useState<Record<string, any> | null>(null);
    const [repoMetadata, setRepoMetadata] = useState<any>(null);

    // File state
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [showDryRun, setShowDryRun] = useState(false);
    const [dryRunChallenge, setDryRunChallenge] = useState<any>(null);

    // License state
    const [licenseData, setLicenseData] = useState<any>(null);
    const [showLicenseWarning, setShowLicenseWarning] = useState(false);
    const [showLicenseBanner, setShowLicenseBanner] = useState(true);

    // Comprehensive summary state
    const [projectSummary, setProjectSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [summaryNeedsIndex, setSummaryNeedsIndex] = useState(false);
    const [indexingInProgress, setIndexingInProgress] = useState(false);

    // Responsive panel state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    // Fetch all data when owner/repo changes
    useEffect(() => {
        setOverview(null);
        setHealthScore(null);
        setHealthMetrics(null);
        setHealthBreakdown(null);
        setRepoMetadata(null);
        setActiveFile(null);
        setSelectedFiles([]);
        setLicenseData(null);
        setShowLicenseWarning(false);
        setShowLicenseBanner(true);
        setProjectSummary(null);
        setSummaryGeneratedAt(null);
        setSummaryLoading(false);
        setSummaryError(null);
        setSummaryNeedsIndex(false);
        setIndexingInProgress(false);

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
                    setHealthBreakdown(data.breakdown ?? null);
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
                // Only set metadata if the response has expected fields (not a rate-limit error)
                if (data.full_name || data.stargazers_count !== undefined) {
                    setRepoMetadata(data);
                }
            })
            .catch(console.error);

        // Fetch license data for warning dialog
        fetch('/api/repo/license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.license) {
                    setLicenseData(data.license);
                    if (data.license.warningLevel === 'danger') {
                        setShowLicenseWarning(true);
                    }
                }
            })
            .catch(console.error);

        // Fetch comprehensive summary (auto-generate if not cached)
        setSummaryLoading(true);
        setSummaryError(null);
        setSummaryNeedsIndex(false);
        fetch('/api/repo/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(async res => {
                const data = await res.json();
                if (data.success && data.summary) {
                    setProjectSummary(data.summary);
                    setSummaryGeneratedAt(data.generatedAt || null);
                } else if (data.error === 'NO_EMBEDDINGS' || data.error === 'NOT_INDEXED') {
                    setSummaryNeedsIndex(true);
                } else if (data.error === 'LIMIT_EXCEEDED') {
                    setSummaryError('Usage limit exceeded. Please try again later.');
                } else if (!res.ok) {
                    setSummaryError(data.message || 'Failed to load summary.');
                }
            })
            .catch(err => {
                console.error('Summary fetch error:', err);
                setSummaryError('Failed to connect to summary service.');
            })
            .finally(() => setSummaryLoading(false));
    }, [owner, repo]);

    const handleIndexAndSummarize = async () => {
        setIndexingInProgress(true);
        setSummaryError(null);
        setSummaryNeedsIndex(false);
        try {
            // Step 1: Index the repository
            const indexRes = await fetch('/api/repo/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo })
            });
            const indexData = await indexRes.json();
            if (!indexRes.ok || indexData.error) {
                setSummaryError(indexData.message || 'Failed to index repository.');
                setIndexingInProgress(false);
                return;
            }

            // Step 2: Now generate the summary
            setIndexingInProgress(false);
            setSummaryLoading(true);
            const sumRes = await fetch('/api/repo/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo, force: true })
            });
            const sumData = await sumRes.json();
            if (sumData.success && sumData.summary) {
                setProjectSummary(sumData.summary);
                setSummaryGeneratedAt(sumData.generatedAt || null);
            } else {
                setSummaryError(sumData.message || 'Failed to generate summary.');
            }
        } catch (err: any) {
            setSummaryError(err.message || 'Something went wrong.');
        } finally {
            setIndexingInProgress(false);
            setSummaryLoading(false);
        }
    };

    const handleRegenerateSummary = async () => {
        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const res = await fetch('/api/repo/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo, force: true })
            });
            const data = await res.json();
            if (data.success && data.summary) {
                setProjectSummary(data.summary);
                setSummaryGeneratedAt(data.generatedAt || null);
            } else if (data.error === 'NO_EMBEDDINGS' || data.error === 'NOT_INDEXED') {
                setSummaryNeedsIndex(true);
            } else {
                setSummaryError(data.message || 'Failed to generate summary.');
            }
        } catch (err: any) {
            setSummaryError(err.message || 'Something went wrong.');
        } finally {
            setSummaryLoading(false);
        }
    };

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

    const handleAddToChat = useCallback(() => {
        setChatOpen(true);
    }, []);

    const handleRemoveFile = useCallback((file: string) => {
        setSelectedFiles(prev => prev.filter(f => f !== file));
    }, []);

    return (
        <div className="h-screen bg-[#0B1120] text-slate-50 flex flex-col overflow-hidden">
            {/* License warning popup for danger-level licenses */}
            <LicenseWarningDialog
                license={licenseData}
                open={showLicenseWarning}
                onClose={() => setShowLicenseWarning(false)}
            />
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
                {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 px-2.5 py-1.5 rounded-full border border-blue-500/20">
                        <FileText size={12} className="text-blue-400" />
                        <span className="font-medium">{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
                    </div>
                )}
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

            {/* Copyleft license banner (warning level) */}
            {showLicenseBanner && licenseData?.warningLevel === 'warning' && (
                <LicenseBanner license={licenseData} onDismiss={() => setShowLicenseBanner(false)} />
            )}

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
                        onAddToChat={handleAddToChat}
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
                                    onAddToChat={handleAddToChat}
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

                                        {/* Comprehensive Summary */}
                                        <div className="glass-card rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <BookOpen size={18} className="text-blue-400" />
                                                    Comprehensive Analysis
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    {summaryGeneratedAt && (
                                                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(summaryGeneratedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {projectSummary && (
                                                        <button
                                                            onClick={handleRegenerateSummary}
                                                            disabled={summaryLoading || indexingInProgress}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {summaryLoading ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <RefreshCw size={12} />
                                                            )}
                                                            {summaryLoading ? 'Analyzing...' : 'Regenerate'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Error state */}
                                            {summaryError && (
                                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                                                    {summaryError}
                                                </div>
                                            )}

                                            {/* Indexing in progress */}
                                            {indexingInProgress ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                                        <Loader2 size={16} className="animate-spin text-purple-400" />
                                                        Indexing repository files... This may take a minute.
                                                    </div>
                                                    <div className="space-y-3 animate-pulse">
                                                        <div className="h-4 bg-purple-500/10 rounded w-full" />
                                                        <div className="h-4 bg-purple-500/10 rounded w-5/6" />
                                                        <div className="h-4 bg-purple-500/10 rounded w-4/6" />
                                                    </div>
                                                </div>
                                            ) : summaryLoading && !projectSummary ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                                        <Loader2 size={16} className="animate-spin text-blue-400" />
                                                        Analyzing all indexed files with AI... This may take a moment.
                                                    </div>
                                                    <div className="space-y-3 animate-pulse">
                                                        <div className="h-4 bg-white/5 rounded w-full" />
                                                        <div className="h-4 bg-white/5 rounded w-5/6" />
                                                        <div className="h-4 bg-white/5 rounded w-4/6" />
                                                        <div className="h-4 bg-white/5 rounded w-full" />
                                                        <div className="h-4 bg-white/5 rounded w-3/6" />
                                                    </div>
                                                </div>
                                            ) : projectSummary ? (
                                                <div className="prose prose-invert prose-sm max-w-none text-slate-300 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-200 [&_ul]:space-y-1 [&_li]:text-slate-300 [&_strong]:text-slate-200 [&_code]:text-blue-300 [&_code]:bg-blue-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_hr]:border-white/5 [&_hr]:my-4">
                                                    <ReactMarkdown>{projectSummary}</ReactMarkdown>
                                                </div>
                                            ) : summaryNeedsIndex ? (
                                                <div className="text-center py-6 space-y-3">
                                                    <p className="text-sm text-slate-400">
                                                        This repository needs to be indexed before generating a summary.
                                                    </p>
                                                    <button
                                                        onClick={handleIndexAndSummarize}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all"
                                                    >
                                                        <BookOpen size={14} />
                                                        Index &amp; Generate Summary
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 space-y-3">
                                                    <p className="text-sm text-slate-400">
                                                        Generate a comprehensive AI analysis of this repository.
                                                    </p>
                                                    <button
                                                        onClick={handleRegenerateSummary}
                                                        disabled={summaryLoading}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                                                    >
                                                        <BookOpen size={14} />
                                                        Generate Summary
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Repo Stats */}
                                        <RepoStatsCard metadata={repoMetadata} />

                                        {/* Health Score */}
                                        <div className="glass-card rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-white mb-4">Repository Health</h3>
                                            <HealthScoreVisual score={healthScore} metrics={healthMetrics} breakdown={healthBreakdown} />
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

                        {/* ── COMMUNITY TAB ── */}
                        {activeTab === 'community' && (
                            <CommunityInsightsTab owner={owner} repo={repo} />
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
                    <ChatInterface owner={owner} repo={repo} selectedFiles={selectedFiles} onRemoveFile={handleRemoveFile} embedded />
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
                                    <ChatInterface owner={owner} repo={repo} selectedFiles={selectedFiles} onRemoveFile={handleRemoveFile} embedded />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
