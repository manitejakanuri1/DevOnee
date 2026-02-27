import { NextRequest, NextResponse } from 'next/server';
import { fetchFileTree, fetchRepoMetadata } from '@/lib/github';
import { normalizePath } from '@/lib/path-utils';

interface TreeNode {
    path: string;
    name: string;
    type: 'tree' | 'blob';
    size?: number;
    children?: TreeNode[];
}

function buildNestedTree(flatTree: Array<{ path: string; type: string; size?: number }>): TreeNode[] {
    const root: TreeNode[] = [];
    const map = new Map<string, TreeNode>();

    const sorted = [...flatTree].sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    for (const item of sorted) {
        const cleanPath = normalizePath(item.path);
        const parts = cleanPath.split('/');
        const name = parts[parts.length - 1];
        const node: TreeNode = {
            path: cleanPath,
            name,
            type: item.type as 'tree' | 'blob',
            size: item.size,
            children: item.type === 'tree' ? [] : undefined,
        };
        map.set(cleanPath, node);

        if (parts.length === 1) {
            root.push(node);
        } else {
            const parentPath = parts.slice(0, -1).join('/');
            const parent = map.get(parentPath);
            if (parent && parent.children) {
                parent.children.push(node);
            }
        }
    }
    return root;
}

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

        const data = await fetchFileTree(owner, repo, targetBranch);
        const flatTree = (data as any).tree || [];
        const nested = buildNestedTree(flatTree);

        return NextResponse.json({ success: true, tree: nested, truncated: !!(data as any).truncated });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
