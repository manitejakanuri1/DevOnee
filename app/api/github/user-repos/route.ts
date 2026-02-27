import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';

const reposCache = new NodeCache({ stdTTL: 3600 });

const getHeaders = () => {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevOne-App',
    };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

export async function POST(req: NextRequest) {
    try {
        const { username, sort = 'updated', per_page = 100 } = await req.json();
        if (!username) {
            return NextResponse.json({ success: false, error: 'Missing username' }, { status: 400 });
        }

        const cacheKey = `repos_${username}_${sort}_${per_page}`;
        const cached = reposCache.get(cacheKey);
        if (cached) {
            return NextResponse.json({ success: true, repos: cached });
        }

        const res = await fetch(
            `https://api.github.com/users/${username}/repos?sort=${sort}&per_page=${per_page}&type=all`,
            { headers: getHeaders() }
        );

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }
            if (res.status === 403) {
                return NextResponse.json({ success: false, error: 'GitHub API rate limit exceeded' }, { status: 429 });
            }
            throw new Error(`GitHub API error: ${res.statusText}`);
        }

        const repos = await res.json();
        reposCache.set(cacheKey, repos);

        return NextResponse.json({ success: true, repos });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
