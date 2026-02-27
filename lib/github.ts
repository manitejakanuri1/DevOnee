import NodeCache from 'node-cache';
import { safePath } from '@/lib/path-utils';

// Initialize cache with 1 hour TTL standard
const githubCache = new NodeCache({ stdTTL: 3600 });

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

export async function fetchRepoMetadata(owner: string, repo: string) {
    const cacheKey = `metadata_${owner}_${repo}`;
    const cached = githubCache.get(cacheKey);
    if (cached) return cached;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch repo metadata: ${res.statusText}`);
    }

    const data = await res.json();
    githubCache.set(cacheKey, data);
    return data;
}

export async function fetchFileTree(owner: string, repo: string, branch: string) {
    const cacheKey = `tree_${owner}_${repo}_${branch}`;
    const cached = githubCache.get(cacheKey);
    if (cached) return cached;

    // Fetch recursive tree
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch repo tree: ${res.statusText}`);
    }

    const data = await res.json();
    githubCache.set(cacheKey, data);
    return data;
}

export async function fetchFileContent(owner: string, repo: string, rawPath: string, ref: string) {
    const path = safePath(rawPath);
    const cacheKey = `content_${owner}_${repo}_${path}_${ref}`;
    const cached = githubCache.get(cacheKey);
    if (cached) return cached;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`, {
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch file content: ${res.statusText}`);
    }

    const data = await res.json();

    let content = "";
    if (data.type === 'file' && data.encoding === 'base64') {
        content = Buffer.from(data.content, 'base64').toString('utf-8');
    }

    githubCache.set(cacheKey, content);
    return content;
}
