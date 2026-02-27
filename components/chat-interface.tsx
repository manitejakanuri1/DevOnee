"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, FileCode, Bot, User, AlertCircle, Lightbulb, Search, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIInputWithSuggestions } from '@/components/ui/ai-input-with-suggestions';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    promptId?: string;
}

interface ChatInterfaceProps {
    owner: string;
    repo: string;
    selectedFiles: string[];
    embedded?: boolean;
}

export function ChatInterface({ owner, repo, selectedFiles, embedded }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: `Hi! I'm your DevOne mentor for ${repo}. How can I help you understand this codebase?` }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text: string, options: { think: boolean; deepSearch: boolean }) => {
        if (loading) return;

        let finalMessage = text.trim();
        const prefix = [];
        if (options.think) prefix.push("Think logically");
        if (options.deepSearch) prefix.push("Perform Deep Search");

        if (prefix.length > 0) {
            finalMessage = finalMessage ? `[${prefix.join(" and ")}] ${finalMessage}` : `Can you ${prefix.join(" and ")} the selected context?`;
        }

        if (!finalMessage) return;

        setError(null);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: finalMessage }]);
        setLoading(true);

        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: finalMessage,
                    owner,
                    repo,
                    selectedFiles
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'LIMIT_EXCEEDED') {
                    // Open Login Dialog directly or show inline error
                    setError("Usage limit exceeded. Please sign in to ask more questions.");
                    return;
                }
                throw new Error(data.message || 'Failed to fetch response');
            }

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.response, promptId: data.promptId }]);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleFeedback = async (msgId: string, promptId: string | undefined, vote: 'up' | 'down') => {
        if (!promptId || feedbackGiven[msgId]) return;
        setFeedbackGiven(prev => ({ ...prev, [msgId]: vote }));
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptId, vote: vote === 'up' })
            });
        } catch {
            // Silent fail — feedback is best-effort
        }
    };

    const handleCopy = (msgId: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(msgId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className={cn("flex flex-col h-full overflow-hidden", embedded ? "bg-transparent" : "bg-slate-800 rounded-xl border border-slate-700 shadow-lg")}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Bot size={18} className="text-blue-400" />
                    Repository Mentor
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((msg) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={cn(
                            "flex flex-col w-full",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}
                    >
                        <div className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3 flex gap-3 overflow-hidden",
                            msg.role === 'user'
                                ? "bg-blue-600 text-white rounded-tr-sm"
                                : "bg-slate-700/80 text-slate-100 rounded-tl-sm border border-slate-600"
                        )}>
                            {msg.role === 'assistant' && <Bot size={20} className="shrink-0 mt-0.5 text-blue-400" />}
                            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed overflow-hidden">
                                {msg.content}
                            </div>
                        </div>
                        {/* Feedback buttons for assistant messages */}
                        {msg.role === 'assistant' && msg.id !== '1' && (
                            <div className="flex items-center gap-1 mt-1 ml-8">
                                <button
                                    onClick={() => handleFeedback(msg.id, msg.promptId, 'up')}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        feedbackGiven[msg.id] === 'up' ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-blue-400 hover:bg-white/5"
                                    )}
                                    title="Helpful"
                                >
                                    <ThumbsUp size={13} />
                                </button>
                                <button
                                    onClick={() => handleFeedback(msg.id, msg.promptId, 'down')}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        feedbackGiven[msg.id] === 'down' ? "text-red-400 bg-red-500/10" : "text-slate-500 hover:text-red-400 hover:bg-white/5"
                                    )}
                                    title="Not helpful"
                                >
                                    <ThumbsDown size={13} />
                                </button>
                                <button
                                    onClick={() => handleCopy(msg.id, msg.content)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                    title="Copy"
                                >
                                    {copiedId === msg.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                </button>
                            </div>
                        )}
                    </motion.div>
                ))}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-slate-700/80 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-600 flex items-center gap-3">
                            <Bot size={20} className="shrink-0 text-blue-400" />
                            <div className="flex gap-1.5 h-[20px] items-center">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/5">
                {error && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {selectedFiles.map(file => (
                            <span key={file} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700 text-xs text-slate-300 border border-slate-600">
                                <FileCode size={12} className="text-blue-400" />
                                {file.split('/').pop()}
                            </span>
                        ))}
                    </div>
                )}

                <AIInputWithSuggestions
                    onSubmit={(text, options) => handleSend(text, options || { think: false, deepSearch: false })}
                />
            </div>
        </div>
    );
}
