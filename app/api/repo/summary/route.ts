import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
    try {
        const { id, summary } = await req.json();

        if (!id || typeof summary !== 'string') {
            return NextResponse.json({ error: "Missing id or summary" }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from('repositories')
            .update({ summary })
            .eq('id', id);

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
