"use client";

import { MapPin, Link as LinkIcon, Building, Users, BookOpen, Calendar } from 'lucide-react';

interface ProfileCardProps {
    profile: {
        login: string;
        name: string | null;
        avatar_url: string;
        bio: string | null;
        location: string | null;
        blog: string | null;
        company: string | null;
        followers: number;
        following: number;
        public_repos: number;
        created_at: string;
        type: string;
    } | null;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileCard({ profile }: ProfileCardProps) {
    if (!profile) {
        return (
            <div className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="flex gap-5">
                    <div className="w-20 h-20 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-3">
                        <div className="h-6 w-40 bg-white/5 rounded" />
                        <div className="h-4 w-24 bg-white/5 rounded" />
                        <div className="h-4 w-full bg-white/5 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    const blog = profile.blog && !profile.blog.startsWith('http') ? `https://${profile.blog}` : profile.blog;

    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row gap-5">
                {/* Avatar */}
                <img
                    src={profile.avatar_url}
                    alt={profile.login}
                    className="w-20 h-20 rounded-full border-2 border-white/10 shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">
                        {profile.name || profile.login}
                    </h2>
                    <p className="text-sm text-slate-400 mb-2">@{profile.login}</p>

                    {profile.bio && (
                        <p className="text-sm text-slate-300 leading-relaxed mb-3">{profile.bio}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                        {profile.company && (
                            <span className="flex items-center gap-1.5">
                                <Building size={12} /> {profile.company}
                            </span>
                        )}
                        {profile.location && (
                            <span className="flex items-center gap-1.5">
                                <MapPin size={12} /> {profile.location}
                            </span>
                        )}
                        {blog && (
                            <a href={blog} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                                <LinkIcon size={12} /> {profile.blog}
                            </a>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Calendar size={12} /> Joined {formatDate(profile.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 mt-5 pt-4 border-t border-white/5">
                <div className="text-center">
                    <div className="text-lg font-bold text-white">{profile.public_repos}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1"><BookOpen size={11} /> Repos</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-white">{profile.followers.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1"><Users size={11} /> Followers</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-white">{profile.following.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400">Following</div>
                </div>
            </div>
        </div>
    );
}
