"use client";

import { useState } from 'react';
import { Github, ArrowRight } from 'lucide-react';

interface RepoUrlInputProps {
    currentOwner: string;
    currentRepo: string;
    onNavigate: (owner: string, repo: string) => void;
}

function parseGithubUrl(input: string): { owner: string; repo: string } | null {
    const trimmed = input.trim().replace(/\/$/,'').replace(/\.git$/, '');
    const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    const shortMatch = trimmed.match(/^([^\/\s]+)\/([^\/\s]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
}

export function RepoUrlInput({ currentOwner, currentRepo, onNavigate }: RepoUrlInputProps) {
    const [value, setValue] = useState(`${currentOwner}/${currentRepo}`);
    const [error, setError] = useState(false);

    const handleSubmit = () => {
        const parsed = parseGithubUrl(value);
        if (parsed) {
            setError(false);
            onNavigate(parsed.owner, parsed.repo);
        } else {
            setError(true);
        }
    };

    return (
        <div className={`glass-card rounded-xl flex items-center gap-3 px-4 py-3 transition-all ${error ? 'ring-1 ring-red-500/50' : 'focus-within:ring-1 focus-within:ring-blue-500/30'}`}>
            <Github size={18} className="text-slate-400 shrink-0" />
            <input
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />
            <button
                onClick={handleSubmit}
                className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-colors"
            >
                <ArrowRight size={14} className="text-white" />
            </button>
        </div>
    );
}
