import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { generateProjectSummary } from "@/lib/summarize";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const { userId: identifier, isGuest } = identity;
        const usage = await checkAndIncrementUsage(identifier, isGuest, "project_summary");

        if (!usage.allowed) {
            return NextResponse.json(
                { error: "LIMIT_EXCEEDED", message: usage.message },
                { status: 429 }
            );
        }

        const { owner, repo, force } = await req.json();

        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository, error: lookupError } = await supabase
            .from("repositories")
            .select("id, project_summary, summary_generated_at")
            .eq("name", repoFullName)
            .single();

        if (lookupError || !repository) {
            return NextResponse.json(
                { error: "Repository not found or not indexed yet." },
                { status: 404 }
            );
        }

        // Return cached summary unless force regeneration
        if ((repository as any).project_summary && !force) {
            return NextResponse.json({
                success: true,
                summary: (repository as any).project_summary,
                generatedAt: (repository as any).summary_generated_at,
                cached: true,
            });
        }

        // Generate comprehensive summary via map-reduce
        const summary = await generateProjectSummary(
            (repository as any).id,
            repoFullName
        );

        const now = new Date().toISOString();

        // Save to database
        await supabase
            .from("repositories")
            .update({
                project_summary: summary,
                summary_generated_at: now,
            } as any)
            .eq("id", (repository as any).id);

        return NextResponse.json({
            success: true,
            summary,
            generatedAt: now,
            cached: false,
        });
    } catch (error: any) {
        console.error("Summary generation error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, summary } = await req.json();

        if (!id || typeof summary !== "string") {
            return NextResponse.json({ error: "Missing id or summary" }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("repositories")
            .update({ summary })
            .eq("id", id);

        if (error) {
            console.error("Error updating summary:", error);
            return NextResponse.json({ error: "Failed to update summary" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Summary API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
