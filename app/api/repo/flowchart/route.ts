import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import path from 'path';
import { fetchFileTree, fetchFileContent } from '@/lib/github';

const flowchartCache = new NodeCache({ stdTTL: 3600 });

// ── File type classification (matches existing dependency-graph color scheme) ──
function getNodeType(filePath: string): { type: string; color: string } {
    const lower = filePath.toLowerCase();
    if (lower.includes('__tests__') || lower.includes('.test.') || lower.includes('.spec.'))
        return { type: 'test', color: '#facc15' };
    if (lower.includes('/api/') || lower.includes('/routes/'))
        return { type: 'api', color: '#4ade80' };
    if (lower.includes('/components/') || lower.includes('/ui/'))
        return { type: 'component', color: '#60a5fa' };
    if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/'))
        return { type: 'util', color: '#c084fc' };
    if (lower.endsWith('.md') || lower.includes('/docs/'))
        return { type: 'docs', color: '#22d3ee' };
    if (lower.includes('.config.') || lower.endsWith('.json') || lower.includes('.env'))
        return { type: 'config', color: '#94a3b8' };
    return { type: 'other', color: '#e2e8f0' };
}

// ── Analyzable extensions ──
const ANALYZABLE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

// ── Import parsing regexes ──
const ES_IMPORT_RE = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// ── Resolve an import specifier to a known file path ──
function resolveImport(
    specifier: string,
    importerPath: string,
    knownFiles: Set<string>
): string | null {
    let candidate: string;

    if (specifier.startsWith('@/')) {
        // Alias: @/lib/github → lib/github
        candidate = specifier.slice(2);
    } else if (specifier.startsWith('.')) {
        // Relative import
        const importerDir = path.posix.dirname(importerPath);
        candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
    } else {
        // External package
        return null;
    }

    // Remove leading ./ if normalize produced it
    if (candidate.startsWith('./')) candidate = candidate.slice(2);

    // Exact match
    if (knownFiles.has(candidate)) return candidate;

    // Try extensions
    const tryExts = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of tryExts) {
        if (knownFiles.has(candidate + ext)) return candidate + ext;
    }

    // Try /index files
    for (const ext of tryExts) {
        if (knownFiles.has(candidate + '/index' + ext)) return candidate + '/index' + ext;
    }

    return null;
}

// ── Parse all import specifiers from source code ──
function parseImports(content: string): string[] {
    const imports: string[] = [];

    let match;
    ES_IMPORT_RE.lastIndex = 0;
    while ((match = ES_IMPORT_RE.exec(content)) !== null) {
        imports.push(match[1]);
    }

    REQUIRE_RE.lastIndex = 0;
    while ((match = REQUIRE_RE.exec(content)) !== null) {
        imports.push(match[1]);
    }

    return imports;
}

// ── Batch fetch file content ──
async function batchFetchContent(
    files: string[],
    owner: string,
    repo: string,
    branch: string,
    batchSize: number = 5
): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(f => fetchFileContent(owner, repo, f, branch))
        );
        results.forEach((result, j) => {
            if (result.status === 'fulfilled') {
                resultMap.set(batch[j], result.value as string);
            } else {
                resultMap.set(batch[j], '');
            }
        });
    }

    return resultMap;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { owner, repo } = body;
        const branch = body.branch || 'main';

        if (!owner || !repo) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Cache check
        const cacheKey = `flowchart_${owner}_${repo}`;
        const cached = flowchartCache.get(cacheKey);
        if (cached) {
            return NextResponse.json({ success: true, ...(cached as object) });
        }

        // 1. Fetch file tree
        let treeData;
        try {
            treeData = await fetchFileTree(owner, repo, branch);
        } catch {
            // Try 'master' branch as fallback
            try {
                treeData = await fetchFileTree(owner, repo, 'master');
            } catch {
                return NextResponse.json({
                    success: true,
                    nodes: [],
                    edges: [],
                });
            }
        }

        const allFiles: string[] = treeData.tree
            .filter((f: any) => f.type === 'blob')
            .map((f: any) => f.path as string);

        const allFilesSet = new Set<string>(allFiles);

        // 2. Filter to analyzable JS/TS files
        const analyzableFiles = allFiles
            .filter((p: string) => {
                const ext = path.posix.extname(p).toLowerCase();
                return ANALYZABLE_EXTS.has(ext);
            })
            // Exclude node_modules, dist, .next, etc.
            .filter((p: string) => {
                const lower = p.toLowerCase();
                return !lower.includes('node_modules/') &&
                    !lower.includes('.next/') &&
                    !lower.includes('dist/') &&
                    !lower.includes('build/') &&
                    !lower.includes('.git/');
            });

        // 3. Prioritize by path depth (shallow = most architectural), limit to 60
        const sortedFiles = analyzableFiles
            .sort((a: string, b: string) => a.split('/').length - b.split('/').length)
            .slice(0, 60);

        if (sortedFiles.length === 0) {
            const result = { nodes: [], edges: [] };
            flowchartCache.set(cacheKey, result);
            return NextResponse.json({ success: true, ...result });
        }

        // 4. Batch-fetch file content
        const contentMap = await batchFetchContent(sortedFiles, owner, repo, branch);

        // 5. Build node set for quick lookup
        const nodeFileSet = new Set(sortedFiles);

        // 6. Parse imports and build edges
        const edgeSet = new Set<string>();
        const edges: { id: string; source: string; target: string }[] = [];

        for (const filePath of sortedFiles) {
            const content = contentMap.get(filePath) || '';
            if (!content) continue;

            const importSpecifiers = parseImports(content);

            for (const spec of importSpecifiers) {
                const resolved = resolveImport(spec, filePath, allFilesSet);
                if (resolved && nodeFileSet.has(resolved) && resolved !== filePath) {
                    const edgeId = `${filePath}->${resolved}`;
                    if (!edgeSet.has(edgeId)) {
                        edgeSet.add(edgeId);
                        edges.push({
                            id: edgeId,
                            source: filePath,
                            target: resolved,
                        });
                    }
                }
            }
        }

        // 7. Build nodes
        const nodes = sortedFiles.map((filePath: string) => {
            const parts = filePath.split('/');
            const fileName = parts[parts.length - 1];
            const { type: fileType, color } = getNodeType(filePath);

            return {
                id: filePath,
                type: 'custom',
                data: {
                    label: fileName,
                    fullPath: filePath,
                    fileType,
                    color,
                },
                position: { x: 0, y: 0 },
            };
        });

        // 8. Filter to only include nodes that have at least one connection
        // (keep all nodes if edges exist, show all if no edges to avoid empty graph)
        const connectedIds = new Set<string>();
        edges.forEach(e => {
            connectedIds.add(e.source);
            connectedIds.add(e.target);
        });

        const finalNodes = edges.length > 0
            ? nodes.filter(n => connectedIds.has(n.id))
            : nodes.slice(0, 30); // Show first 30 files as standalone nodes if no imports found

        const finalNodeIds = new Set(finalNodes.map(n => n.id));
        const finalEdges = edges.filter(e => finalNodeIds.has(e.source) && finalNodeIds.has(e.target));

        const result = { nodes: finalNodes, edges: finalEdges };
        flowchartCache.set(cacheKey, result);
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Flowchart API Error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_SERVER_ERROR', message: error.message },
            { status: 500 }
        );
    }
}
