"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    id: string;
    name: string;
}

interface OnboardCardProps {
    steps?: Step[];
    currentStepIndex?: number;
    progress?: number;
    className?: string;
    onFinish?: () => void;
}

const defaultSteps: Step[] = [
    { id: "step1", name: "Connecting to GitHub..." },
    { id: "step2", name: "Analyzing Codebase..." },
    { id: "step3", name: "Generating Embeddings..." }
];

export function OnboardCard({
    steps = defaultSteps,
    currentStepIndex = 0,
    progress = 0,
    className,
    onFinish
}: OnboardCardProps) {
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        if (progress >= 100) {
            setComplete(true);
            if (onFinish) {
                setTimeout(onFinish, 1000);
            }
        }
    }, [progress, onFinish]);

    return (
        <div
            className={cn(
                "relative mx-auto flex w-full max-w-sm flex-col gap-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 px-6 py-8 text-slate-200 shadow-2xl",
                className
            )}
        >
            <div className="flex flex-col gap-4">
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isComplete = index < currentStepIndex || complete;

                    return (
                        <motion.div
                            key={step.id}
                            initial={false}
                            animate={{
                                opacity: isActive || isComplete ? 1 : 0.4,
                                scale: isActive ? 1.02 : 1,
                            }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-4"
                        >
                            <div
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                                    isComplete
                                        ? "border-green-500 bg-green-500/20 text-green-500"
                                        : isActive
                                            ? "border-blue-500 bg-blue-500/20 text-blue-500"
                                            : "border-slate-700 bg-slate-800 text-slate-500"
                                )}
                            >
                                {isComplete ? (
                                    <Check className="h-4 w-4" strokeWidth={3} />
                                ) : isActive ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    >
                                        <Loader2 className="h-4 w-4" />
                                    </motion.div>
                                ) : (
                                    <span className="text-xs font-semibold">{index + 1}</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span
                                    className={cn(
                                        "text-sm font-medium transition-colors",
                                        isComplete ? "text-slate-300" : isActive ? "text-white font-semibold" : "text-slate-500"
                                    )}
                                >
                                    {step.name}
                                </span>
                                {isActive && (
                                    <AnimatePresence>
                                        <motion.span
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-xs text-blue-400 mt-1"
                                        >
                                            Working on it...
                                        </motion.span>
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Overall Progress</span>
                    <span className={complete ? "text-green-500" : "text-blue-400"}>
                        {Math.round(progress)}%
                    </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                        className={cn(
                            "absolute bottom-0 left-0 top-0 rounded-full",
                            complete ? "bg-green-500" : "bg-blue-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
            </div>
        </div>
    );
}
