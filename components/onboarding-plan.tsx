"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Map, CheckCircle2, ChevronRight, FileCode, CodeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingPlanProps {
    plan: {
        overview: string;
        learningPath: string[];
        importantFiles: { path: string; description: string }[];
        firstContribution: { title: string; description: string };
        difficulty: string;
    };
}

export function OnboardingPlan({ plan }: OnboardingPlanProps) {
    const [activeStep, setActiveStep] = useState(0);

    const difficultyColors = {
        'Beginner': 'bg-green-500/10 text-green-400 border-green-500/20',
        'Intermediate': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        'Advanced': 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const bgClass = difficultyColors[plan.difficulty as keyof typeof difficultyColors] || 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* Header Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <BookOpen className="text-blue-400" />
                        Your Onboarding Blueprint
                    </h2>
                    <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", bgClass)}>
                        {plan.difficulty}
                    </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-lg">{plan.overview}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Learning Path */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            <Map className="text-blue-400" />
                            Learning Path
                        </h3>
                        <div className="space-y-4">
                            {plan.learningPath.map((step, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ x: 4 }}
                                    onClick={() => setActiveStep(idx)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all",
                                        activeStep === idx
                                            ? "bg-blue-600/10 border-blue-500/50"
                                            : "bg-slate-900 border-slate-700 hover:border-slate-600"
                                    )}
                                >
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 transition-colors",
                                            activeStep === idx ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <p className={cn("mt-1", activeStep === idx ? "text-slate-100" : "text-slate-400")}>
                                            {step}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Files & First Task */}
                <div className="space-y-6">

                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                        <h4 className="font-bold flex items-center gap-2 text-white mb-4">
                            <CodeIcon size={18} className="text-blue-400" />
                            Important Files
                        </h4>
                        <div className="space-y-3">
                            {plan.importantFiles.map((file, idx) => (
                                <div key={idx} className="p-3 bg-slate-900 border border-slate-700 rounded-lg group hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
                                        <FileCode size={14} className="text-slate-400 group-hover:text-blue-400 shrink-0" />
                                        <span className="font-mono text-xs text-blue-300 truncate">{file.path}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-tight">{file.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/40 border border-indigo-500/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle2 size={64} />
                        </div>
                        <h4 className="font-bold flex items-center gap-2 text-white mb-2 relative z-10">
                            Your First PR
                        </h4>
                        <div className="relative z-10">
                            <h5 className="text-indigo-200 font-semibold text-sm mb-2">{plan.firstContribution.title}</h5>
                            <p className="text-sm text-slate-300 mb-4">{plan.firstContribution.description}</p>
                            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                                Start Working <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
