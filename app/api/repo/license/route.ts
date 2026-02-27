import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { categorizeLicense } from '@/lib/license';

const licenseCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

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
        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ success: false, error: 'Missing owner or repo' }, { status: 400 });
        }

        const cacheKey = `license_${owner}_${repo}`;
        const cached = licenseCache.get(cacheKey);
        if (cached) {
            return NextResponse.json({ success: true, license: cached });
        }

        // Fetch license from GitHub API
        let licenseKey: string | null = null;
        let licenseName: string | null = null;
        let spdxId: string | null = null;
        let licenseUrl: string | null = null;

        try {
            const licenseRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/license`,
                { headers: getHeaders() }
            );

            if (licenseRes.ok) {
                const data = await licenseRes.json();
                licenseKey = data.license?.key || null;
                licenseName = data.license?.name || null;
                spdxId = data.license?.spdx_id || null;
                licenseUrl = data.html_url || null;
            }
        } catch {
            // License endpoint may fail, continue
        }

        // Check for PATENTS file and fetch its content
        let hasPatentsFile = false;
        let patentsFileContent: string | undefined;
        const patentFiles = ['PATENTS', 'PATENTS.md', 'PATENTS.txt'];

        for (const pFile of patentFiles) {
            try {
                const patentRes = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${pFile}`,
                    { headers: getHeaders() }
                );
                if (patentRes.ok) {
                    hasPatentsFile = true;
                    try {
                        const patentData = await patentRes.json();
                        if (patentData.content && patentData.encoding === 'base64') {
                            const decoded = Buffer.from(patentData.content, 'base64').toString('utf-8');
                            patentsFileContent = decoded.substring(0, 1000);
                        }
                    } catch {
                        // Content decode failed, just mark as detected
                    }
                    break;
                }
            } catch {
                // Continue checking
            }
        }

        // Also check for NOTICE file (common in Apache projects)
        let hasNoticeFile = false;
        try {
            const noticeRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/NOTICE`,
                { headers: getHeaders() }
            );
            hasNoticeFile = noticeRes.ok;
        } catch {
            // Ignore
        }

        // Categorize
        const licenseInfo = categorizeLicense(licenseKey, licenseName, spdxId, licenseUrl, hasPatentsFile, patentsFileContent);

        const result = {
            ...licenseInfo,
            hasNoticeFile,
        };

        licenseCache.set(cacheKey, result);
        return NextResponse.json({ success: true, license: result });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
