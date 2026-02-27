"use client";

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageCircle, Bot } from 'lucide-react';

interface AppShellProps {
    headerContent: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
    chat?: ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
    sidebarTitle?: string;
}

export function AppShell({
    headerContent,
    sidebar,
    children,
    chat,
    sidebarOpen,
    setSidebarOpen,
    chatOpen,
    setChatOpen,
    sidebarTitle = 'Navigation',
}: AppShellProps) {
    return (
        <div className="h-screen bg-[#0B1120] text-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-30 shrink-0">
                <div className="h-14 flex items-center px-4 gap-3">
                    {/* Mobile sidebar toggle */}
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
                        <Menu size={18} className="text-slate-400" />
                    </button>

                    {headerContent}

                    {/* Mobile chat toggle */}
                    {chat && (
                        <button onClick={() => setChatOpen(true)} className="lg:hidden shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
                            <MessageCircle size={18} className="text-slate-400" />
                        </button>
                    )}
                </div>
            </header>

            {/* Main 3-Panel Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex flex-col w-[280px] border-r border-white/5 bg-[#0B1120] shrink-0">
                    {sidebar}
                </aside>

                {/* Mobile Sidebar Drawer */}
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
                                    <span className="font-semibold text-sm">{sidebarTitle}</span>
                                    <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center">
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>
                                {sidebar}
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Center Panel */}
                <main className="flex-1 overflow-y-auto panel-scroll">
                    {children}
                </main>

                {/* Desktop Chat Panel */}
                {chat && (
                    <aside className="hidden lg:flex flex-col w-[400px] border-l border-white/5 bg-[#0B1120] shrink-0">
                        {chat}
                    </aside>
                )}

                {/* Mobile Chat Panel */}
                <AnimatePresence>
                    {chatOpen && chat && (
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
                                    {chat}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
