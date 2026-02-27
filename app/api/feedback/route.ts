import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const { promptId, vote, comment } = await req.json();

        if (!promptId || typeof vote !== 'boolean') {
            return NextResponse.json({ error: "BAD_REQUEST", message: "promptId and vote (boolean) are required." }, { status: 400 });
        }

        const supabase = createAdminClient();

        const insertPayload: any = {
            prompt_id: promptId,
            vote,
            comment: comment || null,
        };

        if (identity.profileId) {
            insertPayload.user_id = identity.profileId;
        } else if (identity.guestId) {
            insertPayload.guest_id = identity.guestId;
        }

        const { error } = await supabase.from('feedback').insert(insertPayload);

        if (error) {
            console.error("Feedback insert error:", error);
            return NextResponse.json({ error: "INSERT_FAILED", message: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Feedback API error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
