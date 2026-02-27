import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const insightId = params.id;
        const identity = await getUserIdentity();
        const supabase = createAdminClient();

        // Check if already voted
        let existingQuery = supabase
            .from('insight_votes')
            .select('id')
            .eq('insight_id', insightId);

        if (identity.profileId) {
            existingQuery = existingQuery.eq('profile_id', identity.profileId);
        } else if (identity.guestId) {
            existingQuery = existingQuery.eq('guest_id', identity.guestId);
        } else {
            return NextResponse.json({ success: false, message: "Authentication required to vote." }, { status: 401 });
        }

        const { data: existing } = await existingQuery.maybeSingle();

        if (existing) {
            return NextResponse.json({ success: false, message: "Already voted on this insight." }, { status: 409 });
        }

        // Insert the vote
        const votePayload: any = { insight_id: insightId };
        if (identity.profileId) votePayload.profile_id = identity.profileId;
        if (identity.guestId) votePayload.guest_id = identity.guestId;

        const { error: voteError } = await supabase.from('insight_votes').insert(votePayload);
        if (voteError) {
            console.error("Vote insert error:", voteError);
            return NextResponse.json({ error: "VOTE_FAILED", message: voteError.message }, { status: 500 });
        }

        // Increment upvotes counter
        const { data: insight } = await supabase
            .from('community_insights')
            .select('upvotes')
            .eq('id', insightId)
            .single();

        const currentUpvotes = insight?.upvotes || 0;
        await supabase
            .from('community_insights')
            .update({ upvotes: currentUpvotes + 1 })
            .eq('id', insightId);

        return NextResponse.json({ success: true, upvotes: currentUpvotes + 1 });

    } catch (error: any) {
        console.error("Vote API error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
