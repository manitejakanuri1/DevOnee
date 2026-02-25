import { NextRequest, NextResponse } from "next/server";
import { indexRepository, jobStatusMap } from "@/lib/indexing";
import { getUsageIdentifier, checkAndIncrementUsage } from "@/lib/usage";

// Global job store in lib/indexing.ts to sync between api routes
export async function POST(req: NextRequest) {
    try {
        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const { identifier, isGuest } = await getUsageIdentifier();
        const usage = await checkAndIncrementUsage(identifier, isGuest, "repo_indexing");

        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const jobId = `${owner}-${repo}-${Date.now()}`;
        jobStatusMap.set(jobId, { status: "processing", progress: 0, message: "Started background process..." });

        // Execute synchronous indexing process for local dev and standard Node
        try {
            const result = await indexRepository(owner, repo, jobId);
            return NextResponse.json({ success: true, jobId, filesIndexed: result.filesIndexed });
        } catch (err: any) {
            return NextResponse.json({ error: "Indexing Failed", message: err.message }, { status: 500 });
        }

    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
    }
}
