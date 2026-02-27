import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        if (identity.isGuest) {
            return NextResponse.json({ error: "Sign in to manage auto-fix rules" }, { status: 401 });
        }

        const { owner, repo, rules, action } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase: any = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!repository) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        // If saving rules
        if (action === "save" && rules && Array.isArray(rules)) {
            for (const rule of rules) {
                await supabase.from("auto_fix_rules").upsert(
                    {
                        repository_id: repository.id,
                        profile_id: identity.userId,
                        issue_type: rule.issue_type,
                        max_severity: rule.max_severity || "medium",
                        auto_fix: rule.auto_fix || false,
                        auto_merge: rule.auto_merge || false,
                        updated_at: new Date().toISOString(),
                    } as any,
                    { onConflict: "repository_id, profile_id, issue_type" }
                );
            }
        }

        // Return current rules
        const { data: currentRules } = await supabase
            .from("auto_fix_rules")
            .select("*")
            .eq("repository_id", repository.id)
            .eq("profile_id", identity.userId);

        return NextResponse.json({ success: true, rules: currentRules || [] });
    } catch (error: any) {
        console.error("AutoFix Rules API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
