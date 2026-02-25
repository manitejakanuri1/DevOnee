"use client";

import { useState } from "react";
import { Send, CornerDownLeft, Lightbulb, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

interface AIInputWithSuggestionsProps {
    onSubmit: (text: string, options?: { think: boolean; deepSearch: boolean }) => void;
    placeholder?: string;
    suggestions?: string[];
    className?: string;
}

export function AIInputWithSuggestions({
    onSubmit,
    placeholder = "Ask me anything...",
    suggestions = ["Summarize", "Explain", "Review"],
    className,
}: AIInputWithSuggestionsProps) {
    const [value, setValue] = useState("");
    const { textAreaRef } = useAutoResizeTextarea<HTMLTextAreaElement>(value);
    const [thinkActive, setThinkActive] = useState(false);
    const [deepSearchActive, setDeepSearchActive] = useState(false);

    const handleSubmit = (action?: string) => {
        const textToSubmit = action ? `${action} ${value}`.trim() : value.trim();
        if (!textToSubmit) return;

        onSubmit(textToSubmit, { think: thinkActive, deepSearch: deepSearchActive });
        setValue(""); // Clear after submit
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={cn("flex flex-col gap-2 w-full", className)}>
            <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 focus-within:ring-2 focus-within:ring-blue-500/50 dark:border-white/10">
                <Textarea
                    ref={textAreaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent px-4 py-4 pr-16 text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm shadow-none"
                    rows={1}
                />
                <div className="absolute right-3 top-3 flex items-center bg-slate-800 rounded-full p-0.5 border border-slate-700 shadow-inner">
                    <button
                        type="button"
                        onClick={() => { setThinkActive(!thinkActive); setDeepSearchActive(false); }}
                        className={cn("p-1.5 rounded-full transition-colors", thinkActive ? "bg-slate-900 text-green-400 shadow-sm" : "text-slate-400 hover:text-slate-300")}
                        title="Enable Thinking Mode"
                    >
                        <Lightbulb size={14} fill={thinkActive ? "currentColor" : "none"} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setDeepSearchActive(!deepSearchActive); setThinkActive(false); }}
                        className={cn("p-1.5 rounded-full transition-colors flex items-center justify-center font-bold", deepSearchActive ? "bg-slate-900 text-green-400 shadow-sm" : "text-slate-400 hover:text-slate-300")}
                        title="Enable Deep Search Mode"
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                        </svg>
                    </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-t border-slate-800">
                    <div className="flex gap-2 flex-wrap pb-1">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                    handleSubmit(suggestion);
                                }}
                                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={!value.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 ml-2 shadow-md shadow-blue-500/20"
                    >
                        <Send size={16} className="-ml-0.5" />
                    </button>
                </div>
            </div>
            <div className="px-2 flex justify-end opacity-70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <CornerDownLeft size={12} /> Enter to send <span className="text-[10px] text-slate-600 mx-1">|</span> Shift + Enter for new line
                </div>
            </div>
        </div>
    );
}
