import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        // Get repo ID and existing summary
        const { data: repository, error: lookupError } = await supabase
            .from('repositories')
            .select('id, summary')
            .eq('name', repoFullName)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lookupError || !repository) {
            return NextResponse.json({ error: "Repository not found or not indexed yet." }, { status: 404 });
        }

        let overview = (repository as any).summary;

        // Generate overview if it doesn't exist yet
        if (!overview) {
            // Try to find README or package.json chunks
            const { data: embeddings } = await supabase
                .from('embeddings')
                .select('content')
                .eq('repository_id', (repository as any).id)
                .ilike('content', '%readme%')
                .limit(5) as any;

            const contextTexts = embeddings?.map((e: any) => e.content).join("\n\n") || "No README found.";

            const prompt = `
You are an expert developer analyzer. Based on the following snippets from a repository called ${repoFullName}, write a clear and concise 3-5 sentence overview of what this project does, its main technologies, and its primary purpose.

Repository Snippets:
${contextTexts}

Overview:
`;

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const result = await model.generateContent(prompt);
            overview = result.response.text() || "Could not generate overview.";

            // Save the generated overview to the database asynchronously
            await (supabase as any)
                .from('repositories')
                .update({ summary: overview })
                .eq('id', (repository as any).id);
        }

        // Parallel stats fetching
        const [
            { count: totalEmbeddings },
            { count: chatQueries },
            { count: plansGenerated }
        ] = await Promise.all([
            // Get files indexed (approximate from embeddings count for repo, e.g. 5 chunks per file on avg)
            supabase.from('embeddings').select('*', { count: 'exact', head: true }).eq('repository_id', (repository as any).id),
            // Get total chat queries from chats table instead of missing prompts table
            supabase.from('chats').select('*', { count: 'exact', head: true }).eq('repository_id', (repository as any).id),
            // Get total plans generated
            supabase.from('onboarding_plans').select('*', { count: 'exact', head: true }).eq('repository_id', (repository as any).id)
        ]);

        const filesIndexed = totalEmbeddings ? Math.max(1, Math.floor(totalEmbeddings / 3)) : 0;

        return NextResponse.json({
            success: true,
            overview,
            stats: {
                filesIndexed: filesIndexed || 0,
                chatQueries: chatQueries || 0,
                plansGenerated: plansGenerated || 0
            }
        });

    } catch (error: any) {
        console.error("Overview API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
