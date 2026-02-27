import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get('repo');

    const supabase = createAdminClient();
    let query = supabase.from('community_insights').select('*').order('created_at', { ascending: false });

    if (repo) {
        // In a robust schema, insights should tie directly to repository_id.
        query = query.ilike('title', `%${repo}%`);
    }

    const { data, error } = await query;
    return NextResponse.json({ success: true, insights: data || [], error: error?.message });
}

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const { title, content, repo } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content required" }, { status: 400 });
        }

        const supabase = createAdminClient();

        const insertPayload: any = { title, content };
        // Attach author from session identity, not from client-supplied author_id
        if (identity.profileId) insertPayload.author_id = identity.profileId;
        if (repo) insertPayload.title = `[${repo}] ${title}`;

        const { data, error } = await supabase.from('community_insights').insert(insertPayload).select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, insight: data });
    } catch (error: any) {
        console.error("Insights POST Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
