"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star, GitFork, Search, ArrowUpDown } from 'lucide-react';

interface Repo {
    name: string;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    updated_at: string;
    fork: boolean;
}

interface RepoListProps {
    repos: Repo[] | null;
    username: string;
}

const langColors: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
    Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', Ruby: '#701516',
    C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051',
    HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Svelte: '#ff3e00',
    Jupyter_Notebook: '#DA5B0B', SCSS: '#c6538c',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

type SortKey = 'updated' | 'stars' | 'name';

export function RepoList({ repos, username }: RepoListProps) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortKey>('updated');

    const filtered = useMemo(() => {
        if (!repos) return null;
        let list = [...repos];

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(r =>
                r.name.toLowerCase().includes(q) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                (r.language && r.language.toLowerCase().includes(q))
            );
        }

        list.sort((a, b) => {
            if (sort === 'stars') return b.stargazers_count - a.stargazers_count;
            if (sort === 'name') return a.name.localeCompare(b.name);
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        return list;
    }, [repos, search, sort]);

    if (!repos) {
        return (
            <div className="space-y-3 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                        <div className="h-4 w-40 bg-white/5 rounded" />
                        <div className="h-3 w-full bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search + Sort bar */}
            <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Find a repository..."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                    />
                </div>
                <button
                    onClick={() => setSort(s => s === 'updated' ? 'stars' : s === 'stars' ? 'name' : 'updated')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 hover:bg-white/10 transition-colors shrink-0"
                >
                    <ArrowUpDown size={12} />
                    {sort === 'updated' ? 'Recent' : sort === 'stars' ? 'Stars' : 'Name'}
                </button>
            </div>

            {/* Repo grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered && filtered.length === 0 && (
                    <p className="col-span-2 text-sm text-slate-500 py-8 text-center">No repositories found.</p>
                )}
                {filtered?.map(repo => (
                    <div
                        key={repo.name}
                        onClick={() => router.push(`/repo/${username}/${repo.name}`)}
                        className="glass-card rounded-xl p-4 cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.02] transition-all group"
                    >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-blue-400 group-hover:text-blue-300 truncate">
                                {repo.name}
                            </h3>
                            {repo.fork && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 shrink-0">Fork</span>
                            )}
                        </div>
                        {repo.description && (
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {repo.language && (
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColors[repo.language] || '#8b8b8b' }} />
                                    {repo.language}
                                </span>
                            )}
                            {repo.stargazers_count > 0 && (
                                <span className="flex items-center gap-1">
                                    <Star size={11} /> {repo.stargazers_count.toLocaleString()}
                                </span>
                            )}
                            {repo.forks_count > 0 && (
                                <span className="flex items-center gap-1">
                                    <GitFork size={11} /> {repo.forks_count.toLocaleString()}
                                </span>
                            )}
                            <span className="ml-auto">{timeAgo(repo.updated_at)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
