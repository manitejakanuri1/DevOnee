import { createServerSupabaseClient } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const GUEST_COOKIE_NAME = 'devone_guest_id';

export interface UserIdentity {
    userId: string;
    isGuest: boolean;
    profileId: string | null;
    guestId: string | null;
}

/**
 * Get a stable user identity from Supabase Auth session or guest cookie.
 */
export async function getUserIdentity(): Promise<UserIdentity> {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        return {
            userId: user.id,
            isGuest: false,
            profileId: user.id,
            guestId: null,
        };
    }

    const cookieStore = cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (guestId) {
        return {
            userId: guestId,
            isGuest: true,
            profileId: null,
            guestId,
        };
    }

    const fallbackId = crypto.randomUUID();
    return {
        userId: fallbackId,
        isGuest: true,
        profileId: null,
        guestId: fallbackId,
    };
}

/**
 * Require an authenticated (non-guest) session.
 * Returns null if the user is not signed in.
 */
export async function requireAuth(): Promise<{ userId: string; accessToken: string | null } | null> {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get stored GitHub token from profiles
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('github_token')
        .eq('user_id', user.id)
        .single();

    return {
        userId: user.id,
        accessToken: profile?.github_token || null,
    };
}
