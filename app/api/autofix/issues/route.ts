import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        await getUserIdentity();
        const { owner, repo } = await req.json();

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
            return NextResponse.json({ success: true, issues: [] });
        }

        const { data: issues } = await supabase
            .from("detected_issues")
            .select("*")
            .eq("repository_id", repository.id)
            .neq("status", "ignored")
            .order("created_at", { ascending: false });

        return NextResponse.json({ success: true, issues: issues || [] });
    } catch (error: any) {
        console.error("AutoFix Issues API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
