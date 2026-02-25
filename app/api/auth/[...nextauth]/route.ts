import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"
import { createAdminClient } from "@/lib/supabase/server"

import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            authorization: { params: { scope: 'read:user user:email repo' } }
        }),
    ],
    session: {
        strategy: "jwt",
    },
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
    callbacks: {
        async signIn({ user, account, profile }) {
            const supabase = createAdminClient()

            // Sync the user to the generic profiles table if needed.
            // NextAuth automatically creates records in next-auth tables (users, accounts),
            // we can optionally link it to our custom profiles table using the user.id.
            if (user) {
                const { error } = await supabase
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
        async jwt({ token, account, user, profile }) {
            // Persist the OAuth access_token right after signin
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
