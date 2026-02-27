import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

function calculateLevel(xp: number): string {
    if (xp >= 1000) return "Maintainer";
    if (xp >= 500) return "Pro";
    if (xp >= 200) return "Contributor";
    return "Beginner";
}

function getNextLevelXP(xp: number): { next: string; xpNeeded: number; progress: number } {
    if (xp >= 1000) return { next: "Maintainer", xpNeeded: 0, progress: 100 };
    if (xp >= 500) return { next: "Maintainer", xpNeeded: 1000 - xp, progress: ((xp - 500) / 500) * 100 };
    if (xp >= 200) return { next: "Pro", xpNeeded: 500 - xp, progress: ((xp - 200) / 300) * 100 };
    return { next: "Contributor", xpNeeded: 200 - xp, progress: (xp / 200) * 100 };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase: any = createAdminClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("xp_total, level, streak_days, last_contribution_date")
            .eq("user_id", session.user.id)
            .single();

        if (!profile) {
            return NextResponse.json({
                success: true,
                xp_total: 0,
                level: "Beginner",
                streak_days: 0,
                ...getNextLevelXP(0),
            });
        }

        return NextResponse.json({
            success: true,
            xp_total: profile.xp_total || 0,
            level: profile.level || calculateLevel(profile.xp_total || 0),
            streak_days: profile.streak_days || 0,
            last_contribution_date: profile.last_contribution_date,
            ...getNextLevelXP(profile.xp_total || 0),
        });
    } catch (error: any) {
        console.error("User XP GET Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { contribution_id, challenge_id } = await req.json();

        const supabase: any = createAdminClient();

        // Get XP reward
        let xpReward = 25; // default for non-challenge contributions
        if (challenge_id) {
            const { data: challenge } = await (supabase as any)
                .from("challenges")
                .select("xp_reward")
                .eq("id", challenge_id)
                .single();
            if (challenge) {
                xpReward = challenge.xp_reward;
            }
        }

        // Get current profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("xp_total, streak_days, last_contribution_date")
            .eq("user_id", session.user.id)
            .single();

        const currentXP = profile?.xp_total || 0;
        const newXP = currentXP + xpReward;
        const newLevel = calculateLevel(newXP);

        // Calculate streak
        const today = new Date().toISOString().split("T")[0];
        const lastDate = profile?.last_contribution_date;
        let newStreak = 1;

        if (lastDate) {
            const last = new Date(lastDate);
            const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
            if (diff === 0) {
                newStreak = profile?.streak_days || 1;
            } else if (diff === 1) {
                newStreak = (profile?.streak_days || 0) + 1;
            }
        }

        // Update profile
        await supabase
            .from("profiles")
            .update({
                xp_total: newXP,
                level: newLevel,
                streak_days: newStreak,
                last_contribution_date: today,
            })
            .eq("user_id", session.user.id);

        // Update contribution record
        if (contribution_id) {
            await supabase
                .from("contributions")
                .update({ xp_earned: xpReward })
                .eq("id", contribution_id);
        }

        const leveledUp = calculateLevel(currentXP) !== newLevel;

        return NextResponse.json({
            success: true,
            xp_earned: xpReward,
            xp_total: newXP,
            level: newLevel,
            streak_days: newStreak,
            leveled_up: leveledUp,
            ...getNextLevelXP(newXP),
        });
    } catch (error: any) {
        console.error("User XP POST Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
