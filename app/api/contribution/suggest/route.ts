import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "contribution_suggest");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        // Get repo ID
        const { data: repository } = await supabase
            .from('repositories')
            .select('id')
            .eq('name', repoFullName)
            .single();

        if (!repository) {
            return NextResponse.json({ error: "Repository not found or not indexed yet." }, { status: 404 });
        }

        // Heuristic: Gather snippets that look like loose utility functions, configs, or documentation to suggest simple tasks.
        // In reality, this would be a vector search over "TODO", "FIXME", or simple module strings.
        const { data: chunks } = await supabase
            .from('embeddings')
            .select('content')
            .eq('repository_id', (repository as any).id)
            .limit(10) as any;

        const contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";

        const prompt = `
You are a senior open-source maintainer looking for "good first issues" for a new contributor to ${repoFullName}.
Analyze the following snippets from the codebase and suggest exactly ONE concrete, low-risk contribution task.

Respond ONLY with valid JSON in this schema:
{
  "title": "Short descriptive title of the task",
  "description": "Why this task is useful and what it entails",
  "files": ["path/to/file1.ts"],
  "steps": ["Step 1: Do X", "Step 2: Do Y"]
}

Context:
${contextText.substring(0, 15000)}
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You output valid JSON only.",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        let content = result.response.text() || "{}";
        if (content.startsWith("```json")) {
            content = content.replace(/^```json\n/, "").replace(/\n```$/, "");
        }

        const suggestion = JSON.parse(content);

        return NextResponse.json({ success: true, suggestion });

    } catch (error: any) {
        console.error("Contribution Suggest API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
