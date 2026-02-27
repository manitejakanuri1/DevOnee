"use client";

import { Star, GitFork, Eye, CircleDot, Code2 } from 'lucide-react';

interface RepoStatsCardProps {
    metadata: {
        stargazers_count: number;
        forks_count: number;
        watchers_count: number;
        open_issues_count: number;
        language: string | null;
        description: string | null;
        topics?: string[];
    } | null;
}

const langColors: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
    Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', Ruby: '#701516',
    C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051',
    HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Svelte: '#ff3e00',
};

function formatCount(n: number | undefined | null): string {
    if (n == null || isNaN(n)) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
}

export function RepoStatsCard({ metadata }: RepoStatsCardProps) {
    if (!metadata || !('stargazers_count' in metadata)) {
        return (
            <div className="glass-card rounded-2xl p-5">
                <div className="flex gap-6 animate-pulse">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-white/5 rounded" />)}
                </div>
            </div>
        );
    }

    const stats = [
        { icon: Star, label: 'Stars', value: formatCount(metadata.stargazers_count), color: 'text-yellow-400' },
        { icon: GitFork, label: 'Forks', value: formatCount(metadata.forks_count), color: 'text-blue-400' },
        { icon: Eye, label: 'Watchers', value: formatCount(metadata.watchers_count), color: 'text-green-400' },
        { icon: CircleDot, label: 'Issues', value: formatCount(metadata.open_issues_count), color: 'text-orange-400' },
    ];

    return (
        <div className="glass-card rounded-2xl p-5 space-y-4">
            {metadata.description && (
                <p className="text-sm text-slate-300 leading-relaxed">{metadata.description}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
                {stats.map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                        <Icon size={15} className={color} />
                        <span className="text-slate-400">{label}</span>
                        <span className="text-white font-semibold">{value}</span>
                    </div>
                ))}
                {metadata.language && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: langColors[metadata.language] || '#8b8b8b' }} />
                        <span className="text-white font-medium">{metadata.language}</span>
                    </div>
                )}
            </div>
            {metadata.topics && metadata.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {metadata.topics.slice(0, 8).map(topic => (
                        <span key={topic} className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
                            {topic}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
