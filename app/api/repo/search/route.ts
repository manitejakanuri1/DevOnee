import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const { userId: identifier, isGuest } = identity;
        const usage = await checkAndIncrementUsage(identifier, isGuest, "vector_search");

        if (!usage.allowed) {
            return NextResponse.json(
                { error: "LIMIT_EXCEEDED", message: usage.message },
                { status: 429 }
            );
        }

        const { query, owner, repo, selectedFiles } = await req.json();

        if (!query || !owner || !repo) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: "query, owner, and repo are required." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .single();

        if (!repository) {
            return NextResponse.json(
                { error: "NOT_FOUND", message: "Repository not indexed yet." },
                { status: 404 }
            );
        }

        const embedding = await generateEmbedding(query);
        if (!embedding) {
            return NextResponse.json(
                { error: "EMBEDDING_FAILED", message: "Could not generate embedding for query." },
                { status: 500 }
            );
        }

        const filterPaths = selectedFiles && selectedFiles.length > 0 ? selectedFiles : null;

        const { data: results, error: rpcError } = await supabase.rpc("match_embeddings", {
            query_embedding: embedding,
            match_repository_id: (repository as any).id,
            match_count: 10,
            match_threshold: 0.3,
            filter_file_paths: filterPaths,
        });

        if (rpcError) {
            console.error("match_embeddings RPC error:", rpcError);
            return NextResponse.json(
                { error: "RPC_ERROR", message: rpcError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            results: (results || []).map((r: any) => ({
                id: r.id,
                content: r.content,
                filePath: r.file_path,
                similarity: r.similarity,
            })),
        });
    } catch (error: any) {
        console.error("Vector Search API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
