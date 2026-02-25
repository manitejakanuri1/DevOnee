import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const { name, profile_id } = await req.json();

        if (!name || !profile_id) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Create organization
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({ name } as any)
            .select()
            .single();

        if (orgError) throw orgError;

        // 2. Add creator as admin/owner
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                organization_id: (org as any).id,
                profile_id,
                role: 'owner'
            } as any);

        if (memberError) {
            // Rollback org creation if member fails in a real transactional environment
            console.error("Failed to add member to org:", memberError);
        }

        return NextResponse.json({ success: true, organization: org });

    } catch (error: any) {
        console.error("Organizations API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
