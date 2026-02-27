"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, BookOpen, ArrowLeft } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { ProfileCard } from '@/components/user-profile/profile-card';
import { RepoList } from '@/components/user-profile/repo-list';
import { ChatInterface } from '@/components/chat-interface';

export default function UserProfilePage({ params }: { params: { username: string } }) {
    const router = useRouter();
    const { username } = params;

    const [profile, setProfile] = useState<any>(null);
    const [repos, setRepos] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        setProfile(null);
        setRepos(null);
        setError(null);

        fetch('/api/github/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setProfile(data.profile);
                else setError(data.error);
            })
            .catch(err => setError(err.message));

        fetch('/api/github/user-repos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, sort: 'updated', per_page: 100 })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setRepos(data.repos);
            })
            .catch(console.error);
    }, [username]);

    const sidebar = (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-1">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5">
                    <User size={14} className="text-blue-400" /> Profile
                </div>
                <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400">
                    <BookOpen size={14} /> {repos ? `${repos.length} Repositories` : 'Loading...'}
                </div>
            </div>

            {/* Popular repos in sidebar */}
            {repos && repos.length > 0 && (
                <div className="px-4 mt-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-1">Popular</h4>
                    <div className="space-y-0.5">
                        {repos
                            .sort((a, b) => b.stargazers_count - a.stargazers_count)
                            .slice(0, 10)
                            .map(r => (
                                <button
                                    key={r.name}
                                    onClick={() => { router.push(`/repo/${username}/${r.name}`); setSidebarOpen(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors truncate"
                                >
                                    <BookOpen size={11} className="text-slate-500 shrink-0" />
                                    <span className="truncate">{r.name}</span>
                                    {r.stargazers_count > 0 && (
                                        <span className="ml-auto text-[10px] text-slate-500">{r.stargazers_count}</span>
                                    )}
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );

    const headerContent = (
        <>
            {/* Logo */}
            <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                D1
            </a>

            {/* Username */}
            <h1 className="text-sm font-medium truncate">
                <span className="text-white">{username}</span>
                <span className="text-slate-500 ml-2 text-xs">{profile?.type === 'Organization' ? 'Organization' : 'User'}</span>
            </h1>

            <div className="flex-1" />

            {profile && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-full">
                    <BookOpen size={12} className="text-blue-400" />
                    <span className="text-white font-medium">{profile.public_repos} repos</span>
                </div>
            )}
        </>
    );

    return (
        <AppShell
            headerContent={headerContent}
            sidebar={sidebar}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            sidebarTitle={username}
            chat={<ChatInterface owner={username} repo="" selectedFiles={[]} embedded />}
        >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {error ? (
                    <div className="glass-card rounded-2xl p-8 text-center">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-400 hover:text-blue-300">
                            Go back
                        </button>
                    </div>
                ) : (
                    <>
                        <ProfileCard profile={profile} />

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Repositories</h3>
                            <RepoList repos={repos} username={username} />
                        </div>
                    </>
                )}
            </div>
        </AppShell>
    );
}
