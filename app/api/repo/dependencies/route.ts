import { NextRequest, NextResponse } from "next/server";
import { fetchFileTree } from "@/lib/github";

function getNodeType(path: string): { type: string; color: string } {
    const lower = path.toLowerCase();
    if (lower.includes("__tests__") || lower.includes(".test.") || lower.includes(".spec."))
        return { type: "test", color: "#facc15" };
    if (lower.includes("/api/") || lower.includes("/routes/"))
        return { type: "api", color: "#4ade80" };
    if (lower.includes("/components/") || lower.includes("/ui/"))
        return { type: "component", color: "#60a5fa" };
    if (lower.includes("/lib/") || lower.includes("/utils/") || lower.includes("/helpers/"))
        return { type: "util", color: "#c084fc" };
    if (lower.endsWith(".md") || lower.includes("/docs/"))
        return { type: "docs", color: "#22d3ee" };
    if (lower.includes(".config.") || lower.endsWith(".json") || lower.includes(".env"))
        return { type: "config", color: "#94a3b8" };
    return { type: "other", color: "#e2e8f0" };
}

function isBeginnerFriendly(path: string): boolean {
    const lower = path.toLowerCase();
    return (
        lower.endsWith(".md") ||
        lower.endsWith("readme.md") ||
        lower.includes("contributing") ||
        lower.includes("changelog") ||
        lower.includes(".env.example") ||
        lower.includes("/docs/") ||
        lower.includes("license") ||
        (lower.includes("__tests__") && !lower.includes("integration")) ||
        (lower.includes(".test.") && !lower.includes("e2e"))
    );
}

export async function POST(req: NextRequest) {
    try {
        const { owner, repo } = await req.json();

        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const treeData = await fetchFileTree(owner, repo, "main");
        const files = treeData.tree.filter((f: any) => f.type === "blob");

        const nodes: {
            id: string;
            name: string;
            group: number;
            type: string;
            color: string;
            beginner_friendly: boolean;
        }[] = [];
        const links: { source: string; target: string; value: number }[] = [];

        files.forEach((file: any) => {
            const pathParts = file.path.split("/");
            const { type, color } = getNodeType(file.path);

            nodes.push({
                id: file.path,
                name: pathParts[pathParts.length - 1],
                group: pathParts.length > 1 ? pathParts.length : 1,
                type,
                color,
                beginner_friendly: isBeginnerFriendly(file.path),
            });

            // Simulate linkage based on folder proximity
            if (pathParts.length > 1) {
                const parentFolder = pathParts.slice(0, -1).join("/");
                const sibling = files.find(
                    (f: any) =>
                        f.path.startsWith(parentFolder + "/") && f.path !== file.path
                );
                if (sibling) {
                    links.push({
                        source: file.path,
                        target: sibling.path,
                        value: 1,
                    });
                }
            }
        });

        if (links.length === 0 && files.length > 1) {
            for (let i = 0; i < Math.min(files.length - 1, 20); i++) {
                links.push({
                    source: files[i].path,
                    target: files[i + 1].path,
                    value: 1,
                });
            }
        }

        const truncatedNodes = nodes.slice(0, 100);
        const validIds = new Set(truncatedNodes.map((n) => n.id));
        const validLinks = links
            .filter((l) => validIds.has(l.source) && validIds.has(l.target))
            .slice(0, 150);

        // Build legend data
        const typesUsed = Array.from(new Set(truncatedNodes.map((n) => n.type)));
        const legend = typesUsed.map((t) => ({
            type: t,
            color: truncatedNodes.find((n) => n.type === t)?.color || "#e2e8f0",
        }));

        return NextResponse.json({
            success: true,
            graphData: { nodes: truncatedNodes, links: validLinks },
            legend,
            beginnerCount: truncatedNodes.filter((n) => n.beginner_friendly).length,
        });
    } catch (error: any) {
        console.error("Dependencies API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
