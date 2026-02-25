"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lightbulb, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIChatInputProps {
    onSend: (message: string, options: { think: boolean; deepSearch: boolean }) => void;
    loading?: boolean;
}

const placeholders = [
    "Ask a question about the repo...",
    "Help me understand this code...",
    "Find a good first issue...",
    "Explain how the authentication works..."
];

export function AIChatInput({ onSend, loading = false }: AIChatInputProps) {
    const [value, setValue] = useState("");
    const { textAreaRef } = useAutoResizeTextarea<HTMLTextAreaElement>(value);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [thinkActive, setThinkActive] = useState(false);
    const [deepSearchActive, setDeepSearchActive] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((current) => (current + 1) % placeholders.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = () => {
        if (!value.trim() || loading) return;
        onSend(value, { think: thinkActive, deepSearch: deepSearchActive });
        setValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="w-full relative flex flex-col gap-2 bg-slate-900 border border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all rounded-2xl overflow-hidden p-2">
            <div className="relative w-full flex items-center min-h-[50px] px-2">
                <textarea
                    ref={textAreaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="w-full resize-none bg-transparent outline-none text-slate-200 placeholder:text-transparent py-4 text-sm z-10 min-h-[50px] max-h-[200px]"
                    rows={1}
                />

                {!value && (
                    <div className="absolute inset-y-0 left-2 py-4 pointer-events-none text-slate-500 text-sm flex items-start overflow-hidden w-full">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={placeholderIndex}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                                className="block truncate max-w-[80%]"
                            >
                                {placeholders[placeholderIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between px-2 pb-1 relative z-20">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setThinkActive(!thinkActive)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                            thinkActive
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                        )}
                    >
                        <Lightbulb size={14} className={cn(thinkActive ? "text-amber-400" : "text-slate-500")} fill={thinkActive ? "currentColor" : "none"} />
                        Think
                    </button>

                    <button
                        type="button"
                        onClick={() => setDeepSearchActive(!deepSearchActive)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                            deepSearchActive
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                        )}
                    >
                        <Search size={14} className={cn(deepSearchActive ? "text-blue-400" : "text-slate-500")} />
                        Deep Search
                    </button>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!value.trim() || loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-2.5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Send size={16} className="-ml-0.5" />
                </button>
            </div>
        </div>
    );
}
