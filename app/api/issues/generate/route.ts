import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "issues_generate");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { owner, repo } = await req.json();

        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository } = await supabase.from('repositories').select('id').eq('name', repoFullName).single();
        if (!repository) return NextResponse.json({ error: "Repo not indexed" }, { status: 404 });

        const { data: chunks } = await supabase.from('embeddings').select('content').eq('repository_id', (repository as any).id).limit(15) as any;
        const contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";

        const prompt = `
You are an expert technical product manager. Based on this codebase context for ${repoFullName}, generate TWO distinct GitHub issues that are perfectly scoped as "Good First Issues" for beginners.

Respond ONLY with valid JSON in this schema:
{
  "issues": [
    {
       "title": "Clear description of issue",
       "body": "Detailed github markdown body explaining the context, problem, and expected solution approach. Mention specific files.",
       "labels": ["good first issue", "enhancement"]
    }
  ]
}

Context limit 10k chars:
${contextText.substring(0, 10000)}
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You output valid JSON only.",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        let content = result.response.text() || "{}";
        if (content.startsWith("```json")) content = content.replace(/^```json\n/, "").replace(/\n```$/, "");

        return NextResponse.json({ success: true, ...JSON.parse(content) });

    } catch (error: any) {
        console.error("Issues Generation API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
