import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";

export async function GET() {
    try {
        const identity = await getUserIdentity();
        const supabase: any = createAdminClient();

        // Scope contributions to current authenticated user only
        let contributionsQuery = supabase.from("contributions");
        if (identity.profileId) {
            contributionsQuery = contributionsQuery.select("*", { count: "exact", head: true }).eq("profile_id", identity.profileId);
        } else {
            // Guests don't have contributions
            contributionsQuery = contributionsQuery.select("*", { count: "exact", head: true }).eq("profile_id", identity.userId);
        }
        const { count: totalPRs } = await contributionsQuery;

        // Merged PRs for current user
        let mergedQuery = supabase.from("contributions").select("*", { count: "exact", head: true }).eq("status", "merged");
        if (identity.profileId) mergedQuery = mergedQuery.eq("profile_id", identity.profileId);
        else mergedQuery = mergedQuery.eq("profile_id", identity.userId);
        const { count: mergedPRs } = await mergedQuery;

        // Repos explored — count repos indexed by this user
        let reposQuery = supabase.from("repositories").select("*", { count: "exact", head: true });
        if (identity.profileId) reposQuery = reposQuery.eq("profile_id", identity.profileId);
        const { count: reposExplored } = await reposQuery;

        // Platform-wide active contributors count (public stat)
        const { data: contributors } = await supabase
            .from("contributions")
            .select("profile_id");
        const uniqueContributors = new Set(contributors?.map((c: any) => c.profile_id)).size;

        // Recent contributions for current user
        let recentQuery = supabase
            .from("contributions")
            .select("id, pr_url, pr_title, status, created_at, xp_earned, fork_owner")
            .order("created_at", { ascending: false })
            .limit(10);
        if (identity.profileId) recentQuery = recentQuery.eq("profile_id", identity.profileId);
        else recentQuery = recentQuery.eq("profile_id", identity.userId);
        const { data: recentContributions } = await recentQuery;

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
