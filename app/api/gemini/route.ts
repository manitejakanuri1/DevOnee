import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const { userId: identifier, isGuest } = identity;
        const usage = await checkAndIncrementUsage(identifier, isGuest, "gemini_chat");

        if (!usage.allowed) {
            return NextResponse.json(
                { error: "LIMIT_EXCEEDED", message: usage.message },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { message, owner, repo, selectedFiles = [] } = body;

        if (!message) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Message is required." }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();
        let contextText = "";

        if (owner && repo) {
            const { data: repository } = await supabase
                .from('repositories')
                .select('id')
                .eq('name', repoFullName)
                .single();

            if (repository) {
                // Basic non-vector retrieval for prototype: grab chunks from selected files
                if (selectedFiles.length > 0) {
                    const fileConditions = selectedFiles.map((f: string) => `content.ilike.%${f}%`).join(',');
                    const { data: chunks } = await supabase
                        .from('embeddings')
                        .select('content')
                        .eq('repository_id', (repository as any).id)
                        .or(fileConditions)
                        .limit(10) as any;

                    contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";
                } else {
                    // Fallback to top random chunks
                    const { data: chunks } = await supabase
                        .from('embeddings')
                        .select('content')
                        .eq('repository_id', (repository as any).id)
                        .limit(5) as any;
                    contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";
                }
            }
        }

        const systemPrompt = `
You are a Senior Systems Engineer mentoring a developer. 
When explaining concepts, adhere strictly to this three-part structure:
1. Analogy: Start with a real-world analogy.
2. Concept: Provide the technical explanation.
3. Example: Show a clear, relevant code example.

Context from Repository (${owner}/${repo}):
${contextText.substring(0, 10000)}
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(message);
        const responseText = result.response.text() || "No response generated.";

        // Log prompt usage
        await supabase.from('prompts').insert({
            guest_id: isGuest ? identifier : null,
            profile_id: isGuest ? null : identifier,
            content: message as string,
            response: responseText as string
        } as any);

        return NextResponse.json({
            success: true,
            response: responseText,
            usage: {
                limit: usage.limit,
                remaining: Math.max(0, usage.limit - usage.currentCount),
            }
        });

    } catch (error: any) {
        console.error("Gemini API Error details:", error?.message || error);
        if (error.cause) console.error("Error cause:", error.cause);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error?.message || "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
