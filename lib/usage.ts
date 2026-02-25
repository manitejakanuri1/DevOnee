import { getGuestId } from './guest'
import { createAdminClient } from './supabase/server'

export const USAGE_LIMITS = {
    guest: 20,
    user: 100,
}

export type UsageResult = {
    allowed: boolean
    currentCount: number
    limit: number
    message: string
}

export async function getUsageIdentifier(session: any = null): Promise<{ identifier: string; isGuest: boolean }> {
    if (session && session.user && session.user.id) {
        return { identifier: session.user.id, isGuest: false }
    }
    const guestId = getGuestId()
    return { identifier: guestId, isGuest: true }
}

export async function checkAndIncrementUsage(identifier: string, isGuest: boolean, endpoint: string): Promise<UsageResult> {
    const limit = isGuest ? USAGE_LIMITS.guest : USAGE_LIMITS.user
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Upsert usage count safely using an RPC or ON CONFLICT handling
    // For standard Supabase usage, ON CONFLICT requires a unique index:
    // identifier, endpoint, date
    const { data, error } = await supabase
        .from('usage')
        .select('count')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .eq('date', today)
        .single() as any

    const currentCount = data?.count || 0

    if (currentCount >= limit) {
        return {
            allowed: false,
            currentCount,
            limit,
            message: `Usage limit exceeded. ${isGuest ? 'Please sign in to increase your limit.' : 'You have reached your daily limit.'}`
        }
    }

    // Increment usage using upsert
    await supabase
        .from('usage')
        .upsert({
            identifier,
            endpoint,
            date: today,
            count: currentCount + 1,
        } as any, { onConflict: 'identifier, endpoint, date' })

    return {
        allowed: true,
        currentCount: currentCount + 1,
        limit,
        message: 'Success',
    }
}

// Higher-order function to wrap API handlers with usage tracking
export function withUsageLimit(endpointName: string, handler: Function) {
    return async (req: Request, ...args: any[]) => {
        // In a real app, you would pass the session here if using next-auth Server Sessions
        const { identifier, isGuest } = await getUsageIdentifier()
        const usage = await checkAndIncrementUsage(identifier, isGuest, endpointName)

        if (!usage.allowed) {
            return Response.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 })
        }

        return handler(req, ...args)
    }
}
