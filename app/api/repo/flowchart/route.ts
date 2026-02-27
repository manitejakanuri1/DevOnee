import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import path from 'path';
import { fetchFileTree, fetchFileContent } from '@/lib/github';

const flowchartCache = new NodeCache({ stdTTL: 3600 });

// ── File type classification (matches existing dependency-graph color scheme) ──
function getNodeType(filePath: string): { type: string; color: string } {
    const lower = filePath.toLowerCase();
    if (lower.includes('__tests__') || lower.includes('.test.') || lower.includes('.spec.') || lower.includes('/test/'))
        return { type: 'test', color: '#facc15' };
    if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') || lower.includes('/handlers/'))
        return { type: 'api', color: '#4ade80' };
    if (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('/views/') || lower.includes('/widgets/'))
        return { type: 'component', color: '#60a5fa' };
    if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/core/') || lower.includes('/common/'))
        return { type: 'util', color: '#c084fc' };
    if (lower.endsWith('.md') || lower.includes('/docs/'))
        return { type: 'docs', color: '#22d3ee' };
    if (lower.includes('.config.') || lower.endsWith('.json') || lower.includes('.env') ||
        lower.endsWith('.gradle') || lower.endsWith('.xml') || lower.endsWith('.yaml') || lower.endsWith('.yml') ||
        lower.endsWith('.toml') || lower.endsWith('.properties'))
        return { type: 'config', color: '#94a3b8' };
    if (lower.includes('/models/') || lower.includes('/entities/') || lower.includes('/schemas/'))
        return { type: 'model', color: '#f472b6' };
    if (lower.includes('/services/') || lower.includes('/providers/'))
        return { type: 'service', color: '#fb923c' };
    return { type: 'other', color: '#e2e8f0' };
}

// ── All supported source code extensions ──
const ANALYZABLE_EXTS = new Set([
    // JavaScript / TypeScript
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    // Java / Kotlin
    '.java', '.kt', '.kts',
    // Python
    '.py',
    // Go
    '.go',
    // Ruby
    '.rb',
    // Rust
    '.rs',
    // Swift
    '.swift',
    // C / C++
    '.c', '.cpp', '.cc', '.h', '.hpp',
    // PHP
    '.php',
    // Dart
    '.dart',
    // Scala
    '.scala',
    // C#
    '.cs',
]);

// ── Detect language from file extension ──
function detectLanguage(filePath: string): string {
    const ext = path.posix.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts': case '.tsx': case '.js': case '.jsx': case '.mjs': return 'javascript';
        case '.java': return 'java';
        case '.kt': case '.kts': return 'kotlin';
        case '.py': return 'python';
        case '.go': return 'go';
        case '.rb': return 'ruby';
        case '.rs': return 'rust';
        case '.swift': return 'swift';
        case '.c': case '.cpp': case '.cc': case '.h': case '.hpp': return 'cpp';
        case '.php': return 'php';
        case '.dart': return 'dart';
        case '.scala': return 'scala';
        case '.cs': return 'csharp';
        default: return 'unknown';
    }
}

// ── Parse imports per language ──
function parseImports(content: string, language: string): string[] {
    const imports: string[] = [];
    let match;

    switch (language) {
        case 'javascript': {
            const esRe = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
            while ((match = esRe.exec(content)) !== null) imports.push(match[1]);
            const reqRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
            while ((match = reqRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'java': {
            // import com.twitter.sdk.android.core.Twitter;
            const javaRe = /^import\s+(?:static\s+)?([a-zA-Z0-9_.]+)\s*;/gm;
            while ((match = javaRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'kotlin': {
            const ktRe = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = ktRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'python': {
            // import foo.bar, from foo.bar import baz
            const pyFrom = /^from\s+([a-zA-Z0-9_.]+)\s+import/gm;
            while ((match = pyFrom.exec(content)) !== null) imports.push(match[1]);
            const pyImport = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = pyImport.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'go': {
            // import "fmt" or import ( "fmt" "net/http" )
            const goRe = /["']([a-zA-Z0-9_./]+)["']/g;
            const importBlock = content.match(/import\s*\(([\s\S]*?)\)/g);
            if (importBlock) {
                for (const block of importBlock) {
                    while ((match = goRe.exec(block)) !== null) imports.push(match[1]);
                }
            }
            const goSingle = /^import\s+["']([^"']+)["']/gm;
            while ((match = goSingle.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'rust': {
            // use std::collections::HashMap;
            const rustRe = /^use\s+([a-zA-Z0-9_:]+)/gm;
            while ((match = rustRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'swift': {
            const swiftRe = /^import\s+([a-zA-Z0-9_.]+)/gm;
            while ((match = swiftRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'cpp': {
            // #include "header.h" or #include <header.h>
            const cppRe = /#include\s*["<]([^">]+)[">]/g;
            while ((match = cppRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'php': {
            const phpUse = /^use\s+([a-zA-Z0-9_\\]+)/gm;
            while ((match = phpUse.exec(content)) !== null) imports.push(match[1]);
            const phpReq = /(?:require|include)(?:_once)?\s*['"]([^'"]+)['"]/g;
            while ((match = phpReq.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'dart': {
            const dartRe = /^import\s+['"]([^'"]+)['"]/gm;
            while ((match = dartRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'ruby': {
            const rbReq = /^require(?:_relative)?\s+['"]([^'"]+)['"]/gm;
            while ((match = rbReq.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'scala': {
            const scRe = /^import\s+([a-zA-Z0-9_.{}]+)/gm;
            while ((match = scRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
        case 'csharp': {
            const csRe = /^using\s+([a-zA-Z0-9_.]+)\s*;/gm;
            while ((match = csRe.exec(content)) !== null) imports.push(match[1]);
            break;
        }
    }

    return imports;
}

// ── Resolve import specifier to a known file in the repo ──
function resolveImport(
    specifier: string,
    importerPath: string,
    language: string,
    knownFilesSet: Set<string>
): string | null {
    const knownFiles = Array.from(knownFilesSet);
    const hasFile = (f: string) => knownFilesSet.has(f);
    // ── JavaScript / TypeScript ──
    if (language === 'javascript') {
        let candidate: string;
        if (specifier.startsWith('@/')) {
            candidate = specifier.slice(2);
        } else if (specifier.startsWith('.')) {
            const importerDir = path.posix.dirname(importerPath);
            candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
        } else {
            return null; // external package
        }
        if (candidate.startsWith('./')) candidate = candidate.slice(2);
        if (hasFile(candidate)) return candidate;
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
            if (hasFile(candidate + ext)) return candidate + ext;
        }
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
            if (hasFile(candidate + '/index' + ext)) return candidate + '/index' + ext;
        }
        return null;
    }

    // ── Java / Kotlin — convert package.Class to path ──
    if (language === 'java' || language === 'kotlin') {
        // com.twitter.sdk.android.core.Twitter → com/twitter/sdk/android/core/Twitter
        const asPath = specifier.replace(/\./g, '/');
        // Try direct match with extensions
        for (const ext of language === 'java' ? ['.java'] : ['.kt', '.java']) {
            // Search in known files for anything ending with this path
            for (const known of knownFiles) {
                if (known.endsWith(asPath + ext) || known.endsWith('/' + asPath + ext)) {
                    return known;
                }
            }
        }
        // Also try partial match (just the class name)
        const parts = specifier.split('.');
        const className = parts[parts.length - 1];
        if (className !== '*') {
            for (const ext of language === 'java' ? ['.java'] : ['.kt', '.java']) {
                for (const known of knownFiles) {
                    if (known.endsWith('/' + className + ext) || known === className + ext) {
                        return known;
                    }
                }
            }
        }
        return null;
    }

    // ── Python — convert dots to path ──
    if (language === 'python') {
        if (specifier.startsWith('.')) {
            const importerDir = path.posix.dirname(importerPath);
            const dots = specifier.match(/^\.+/)?.[0].length || 1;
            let baseDir = importerDir;
            for (let i = 1; i < dots; i++) {
                baseDir = path.posix.dirname(baseDir);
            }
            const rest = specifier.slice(dots).replace(/\./g, '/');
            const candidate = rest ? path.posix.join(baseDir, rest) : baseDir;
            if (hasFile(candidate + '.py')) return candidate + '.py';
            if (hasFile(candidate + '/__init__.py')) return candidate + '/__init__.py';
        }
        const asPath = specifier.replace(/\./g, '/');
        if (hasFile(asPath + '.py')) return asPath + '.py';
        if (hasFile(asPath + '/__init__.py')) return asPath + '/__init__.py';
        // Partial match
        for (const known of knownFiles) {
            if (known.endsWith('/' + asPath + '.py') || known.endsWith('/' + asPath + '/__init__.py')) {
                return known;
            }
        }
        return null;
    }

    // ── C/C++ — #include "header.h" can be relative ──
    if (language === 'cpp') {
        const importerDir = path.posix.dirname(importerPath);
        const candidate = path.posix.normalize(path.posix.join(importerDir, specifier));
        if (candidate.startsWith('./')) {
            const cleaned = candidate.slice(2);
            if (hasFile(cleaned)) return cleaned;
        }
        if (hasFile(candidate)) return candidate;
        // Also try as absolute from repo root
        if (hasFile(specifier)) return specifier;
        for (const known of knownFiles) {
            if (known.endsWith('/' + specifier) || known === specifier) return known;
        }
        return null;
    }

    // ── Go, Rust, Swift, PHP, Dart, Ruby, Scala, C# — best-effort matching ──
    // Try to match against known files by converting the specifier to a path
    const asPath = specifier.replace(/\\/g, '/').replace(/::/g, '/').replace(/\./g, '/');

    // Try direct
    for (const known of knownFiles) {
        if (known.includes(asPath)) return known;
    }

    return null;
}

// ── Build folder-structure graph as fallback (for non-code or no-imports repos) ──
function buildFolderGraph(
    allFiles: string[],
    maxNodes: number = 50
): { nodes: any[]; edges: any[] } {
    // Get unique directories
    const dirs = new Set<string>();
    const filesByDir = new Map<string, string[]>();

    for (const f of allFiles) {
        const dir = path.posix.dirname(f);
        dirs.add(dir);
        if (!filesByDir.has(dir)) filesByDir.set(dir, []);
        filesByDir.get(dir)!.push(f);
    }

    // Build nodes from directories + key files
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set<string>();

    // Add directory nodes (limit count)
    const sortedDirs = Array.from(dirs)
        .filter(d => d !== '.')
        .sort((a, b) => a.split('/').length - b.split('/').length)
        .slice(0, maxNodes);

    for (const dir of sortedDirs) {
        const parts = dir.split('/');
        const { type: fileType, color } = getNodeType(dir + '/');
        const fileCount = filesByDir.get(dir)?.length || 0;

        nodes.push({
            id: dir,
            type: 'custom',
            data: {
                label: parts[parts.length - 1] + '/',
                fullPath: dir,
                fileType: fileType,
                color,
                isFolder: true,
                fileCount,
            },
            position: { x: 0, y: 0 },
        });
        nodeIds.add(dir);
    }

    // Add edges: parent folder → child folder
    for (const dir of sortedDirs) {
        const parent = path.posix.dirname(dir);
        if (parent !== '.' && nodeIds.has(parent)) {
            edges.push({
                id: `${parent}->${dir}`,
                source: parent,
                target: dir,
            });
        }
    }

    // If very few directories, add individual files from top-level
    if (nodes.length < 5) {
        const topFiles = allFiles
            .filter(f => f.split('/').length <= 2)
            .slice(0, maxNodes - nodes.length);

        for (const f of topFiles) {
            const parts = f.split('/');
            const { type: fileType, color } = getNodeType(f);
            nodes.push({
                id: f,
                type: 'custom',
                data: {
                    label: parts[parts.length - 1],
                    fullPath: f,
                    fileType,
                    color,
                },
                position: { x: 0, y: 0 },
            });
            nodeIds.add(f);

            const parentDir = path.posix.dirname(f);
            if (parentDir !== '.' && nodeIds.has(parentDir)) {
                edges.push({ id: `${parentDir}->${f}`, source: parentDir, target: f });
            }
        }
    }

    return { nodes, edges };
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

// ── Excluded directories ──
function isExcludedPath(p: string): boolean {
    const lower = p.toLowerCase();
    return lower.includes('node_modules/') ||
        lower.includes('.next/') ||
        lower.includes('dist/') ||
        lower.includes('build/output') ||
        lower.includes('.git/') ||
        lower.includes('vendor/') ||
        lower.includes('.gradle/') ||
        lower.includes('__pycache__/') ||
        lower.includes('.idea/') ||
        lower.includes('.vscode/');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { owner, repo } = body;
        let branch = body.branch || 'main';

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
            try {
                branch = 'master';
                treeData = await fetchFileTree(owner, repo, 'master');
            } catch {
                return NextResponse.json({ success: true, nodes: [], edges: [] });
            }
        }

        const allFiles: string[] = treeData.tree
            .filter((f: any) => f.type === 'blob')
            .map((f: any) => f.path as string)
            .filter((p: string) => !isExcludedPath(p));

        const allFilesSet = new Set<string>(allFiles);

        // 2. Filter to analyzable source files
        const analyzableFiles = allFiles
            .filter((p: string) => {
                const ext = path.posix.extname(p).toLowerCase();
                return ANALYZABLE_EXTS.has(ext);
            });

        // 3. Prioritize by path depth, limit to 60
        const sortedFiles = analyzableFiles
            .sort((a: string, b: string) => a.split('/').length - b.split('/').length)
            .slice(0, 60);

        // If no analyzable source files, fall back to folder-structure graph
        if (sortedFiles.length === 0) {
            const folderGraph = buildFolderGraph(allFiles);
            const result = { nodes: folderGraph.nodes, edges: folderGraph.edges, mode: 'structure' };
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

            const language = detectLanguage(filePath);
            const importSpecifiers = parseImports(content, language);

            for (const spec of importSpecifiers) {
                const resolved = resolveImport(spec, filePath, language, allFilesSet);
                if (resolved && nodeFileSet.has(resolved) && resolved !== filePath) {
                    const edgeId = `${filePath}->${resolved}`;
                    if (!edgeSet.has(edgeId)) {
                        edgeSet.add(edgeId);
                        edges.push({ id: edgeId, source: filePath, target: resolved });
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
                data: { label: fileName, fullPath: filePath, fileType, color },
                position: { x: 0, y: 0 },
            };
        });

        // 8. Filter nodes — if we have import edges, keep only connected nodes
        //    If no edges, fall back to folder-structure graph
        const connectedIds = new Set<string>();
        edges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });

        let finalNodes;
        let finalEdges;
        let mode = 'imports';

        if (edges.length > 0) {
            finalNodes = nodes.filter(n => connectedIds.has(n.id));
            const finalNodeIds = new Set(finalNodes.map(n => n.id));
            finalEdges = edges.filter(e => finalNodeIds.has(e.source) && finalNodeIds.has(e.target));
        } else {
            // No import edges resolved — show folder structure instead
            const folderGraph = buildFolderGraph(allFiles);
            finalNodes = folderGraph.nodes;
            finalEdges = folderGraph.edges;
            mode = 'structure';
        }

        const result = { nodes: finalNodes, edges: finalEdges, mode };
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
