import { NextRequest, NextResponse } from 'next/server';
import { fetchFileContent, fetchRepoMetadata } from '@/lib/github';

export async function POST(req: NextRequest) {
    try {
        const { owner, repo, branch } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ success: false, error: 'Missing owner or repo' }, { status: 400 });
        }

        let targetBranch = branch;
        if (!targetBranch) {
            const metadata = await fetchRepoMetadata(owner, repo);
            targetBranch = (metadata as any).default_branch || 'main';
        }

        // Try README.md first, then readme.md
        let content = '';
        let found = false;
        for (const filename of ['README.md', 'readme.md', 'Readme.md']) {
            try {
                content = await fetchFileContent(owner, repo, filename, targetBranch) as string;
                if (content) {
                    found = true;
                    break;
                }
            } catch {
                // Try next filename
            }
        }

        return NextResponse.json({ success: true, content, found });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
