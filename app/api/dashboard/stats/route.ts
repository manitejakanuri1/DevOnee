import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase: any = createAdminClient();

        // Total contributions
        const { count: totalPRs } = await supabase
            .from("contributions")
            .select("*", { count: "exact", head: true });

        // Merged PRs
        const { count: mergedPRs } = await supabase
            .from("contributions")
            .select("*", { count: "exact", head: true })
            .eq("status", "merged");

        // Repos explored
        const { count: reposExplored } = await supabase
            .from("repositories")
            .select("*", { count: "exact", head: true });

        // Active contributors (distinct profile_ids in contributions)
        const { data: contributors } = await supabase
            .from("contributions")
            .select("profile_id");
        const uniqueContributors = new Set(contributors?.map((c: any) => c.profile_id)).size;

        // Recent contributions
        const { data: recentContributions } = await supabase
            .from("contributions")
            .select("id, pr_url, pr_title, status, created_at, xp_earned, fork_owner")
            .order("created_at", { ascending: false })
            .limit(10);

        // Merge rate
        const mergeRate =
            totalPRs && totalPRs > 0
                ? Math.round(((mergedPRs || 0) / totalPRs) * 100)
                : 0;

        return NextResponse.json({
            success: true,
            stats: {
                totalPRs: totalPRs || 0,
                mergedPRs: mergedPRs || 0,
                reposExplored: reposExplored || 0,
                activeContributors: uniqueContributors,
                mergeRate,
            },
            recentContributions: recentContributions || [],
        });
    } catch (error: any) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
