import GithubProvider from "next-auth/providers/github"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"
import { createAdminClient } from "@/lib/supabase/server"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
            authorization: { params: { scope: 'read:user user:email repo' } }
        }),
    ],
    session: {
        strategy: "jwt",
    },
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? {
        adapter: SupabaseAdapter({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }),
    } : {}),
    callbacks: {
        async signIn({ user }) {
            const supabase = createAdminClient()
            if (user) {
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                        user_id: user.id
                    } as any, { onConflict: 'id' });
            }
            return true;
        },
        async jwt({ token, account, user }) {
            if (account) {
                token.accessToken = account.access_token;
            }
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.id = token.id || token.sub;
                session.accessToken = token.accessToken;
            }
            return session;
        },
    },
};
