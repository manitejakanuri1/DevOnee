import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
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
            .single() as any;

        if (!repository) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        const { data: challenges, error } = await (supabase as any)
            .from("challenges")
            .select("*")
            .eq("repository_id", repository.id)
            .order("difficulty", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, challenges: challenges || [] });
    } catch (error: any) {
        console.error("Challenges List API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
