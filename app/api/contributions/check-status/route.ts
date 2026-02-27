import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = (session as any).accessToken;
        if (!token) {
            return NextResponse.json({ error: "No GitHub token" }, { status: 401 });
        }

        const { contribution_id } = await req.json();
        if (!contribution_id) {
            return NextResponse.json({ error: "Missing contribution_id" }, { status: 400 });
        }

        const supabase: any = createAdminClient();

        const { data: contribution } = await (supabase as any)
            .from("contributions")
            .select("*")
            .eq("id", contribution_id)
            .single();

        if (!contribution || !contribution.pr_url) {
            return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
        }

        // Parse PR URL: https://github.com/owner/repo/pull/123
        const prMatch = contribution.pr_url.match(
            /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
        );
        if (!prMatch) {
            return NextResponse.json({ error: "Invalid PR URL" }, { status: 400 });
        }

        const [, prOwner, prRepo, prNumber] = prMatch;

        // Check PR status on GitHub
        const res = await fetch(
            `https://api.github.com/repos/${prOwner}/${prRepo}/pulls/${prNumber}`,
            {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "DevOne-App",
                },
            }
        );

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to check PR status" }, { status: 500 });
        }

        const prData = await res.json();
        let status = "open";
        if (prData.merged) {
            status = "merged";
        } else if (prData.state === "closed") {
            status = "closed";
        }

        // Update in DB
        await (supabase as any)
            .from("contributions")
            .update({ status })
            .eq("id", contribution_id);

        return NextResponse.json({
            success: true,
            status,
            merged_at: prData.merged_at || null,
            pr_number: prData.number,
        });
    } catch (error: any) {
        console.error("Check Status API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
