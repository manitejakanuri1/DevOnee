import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    try {
        const supabase = createAdminClient();

        // Fetch repositories ordered by creation date.
        // If we want to filter by the current user, we would use NextAuth session here.
        // For DevOne's global indexed list, we fetch all repositories.
        const { data: repositories, error } = await supabase
            .from('repositories')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching repositories:", error);
            return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
        }

        return NextResponse.json({ success: true, repositories });
    } catch (error: any) {
        console.error("List API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
