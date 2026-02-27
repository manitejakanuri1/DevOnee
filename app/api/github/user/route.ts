import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';

const userCache = new NodeCache({ stdTTL: 3600 });

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
        const { username } = await req.json();
        if (!username) {
            return NextResponse.json({ success: false, error: 'Missing username' }, { status: 400 });
        }

        const cacheKey = `user_${username}`;
        const cached = userCache.get(cacheKey);
        if (cached) {
            return NextResponse.json({ success: true, profile: cached });
        }

        const res = await fetch(`https://api.github.com/users/${username}`, {
            headers: getHeaders(),
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }
            if (res.status === 403) {
                return NextResponse.json({ success: false, error: 'GitHub API rate limit exceeded' }, { status: 429 });
            }
            throw new Error(`GitHub API error: ${res.statusText}`);
        }

        const profile = await res.json();
        userCache.set(cacheKey, profile);

        return NextResponse.json({ success: true, profile });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
