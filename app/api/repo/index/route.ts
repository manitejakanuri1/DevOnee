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
        jobStatusMap.set(jobId, { status: "processing", progress: 0, processedFiles: 0, totalFiles: 0, message: "Starting indexing..." });

        // Fire-and-forget: start indexing in background, return jobId immediately for polling
        indexRepository(owner, repo, jobId)
            .then(result => {
                console.log(`[${jobId}] Indexing completed: ${result.filesIndexed} files`);
            })
            .catch(err => {
                console.error(`[${jobId}] Indexing failed:`, err);
                jobStatusMap.set(jobId, {
                    status: 'error',
                    progress: 0,
                    message: err.message || 'Indexing failed',
                });
            });

        return NextResponse.json({ success: true, jobId, status: 'started' });

    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
    }
}
