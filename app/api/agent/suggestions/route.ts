import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { analyzePersona } from "@/lib/persona";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "agent_suggestions");
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
            return NextResponse.json({ error: "Repository not indexed yet. Please index it first from the Overview tab." }, { status: 404 });
        }

        const seedHash = simpleHash(identity.userId + repoFullName);
        const seedStr = String(seedHash);

        // Check cache — return if valid suggestions exist
        const { data: cached } = await supabase
            .from('agent_suggestions')
            .select('suggestions, user_persona')
            .eq('user_id', identity.userId)
            .eq('repository_id', (repository as any).id)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (cached) {
            return NextResponse.json({
                success: true,
                suggestions: cached.suggestions,
                persona: cached.user_persona,
                cached: true,
            });
        }

        // Determine user persona
        let persona = "Junior Developer";
        if (!identity.isGuest) {
            const session = await getServerSession(authOptions);
            const githubName = (session?.user as any)?.name || owner;
            persona = await analyzePersona(githubName);
        }

        // Fetch embeddings with seed-based offset for personalization
        const { count } = await supabase
            .from('embeddings')
            .select('id', { count: 'exact', head: true })
            .eq('repository_id', (repository as any).id);

        const totalChunks = count || 0;
        const offset = totalChunks > 15 ? seedHash % (totalChunks - 15) : 0;

        const { data: chunks } = await supabase
            .from('embeddings')
            .select('content')
            .eq('repository_id', (repository as any).id)
            .range(offset, offset + 14);

        const contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";

        if (!contextText) {
            return NextResponse.json({
                error: "No indexed content found. Please index the repository first.",
            }, { status: 404 });
        }

        const prompt = `You are a senior open-source maintainer for ${repoFullName}.
The contributor is a "${persona}" with variation seed ${seedStr}.

Use the seed to influence which areas of the codebase you focus on — different seeds should produce completely different suggestions.
Each suggestion MUST target different files and different types of improvements.

Suggest EXACTLY 3 unique, concrete contribution tasks suitable for this contributor's experience level. Tasks must be:
- Low-risk and self-contained
- Clearly actionable with specific file paths from the codebase
- Varied: mix of code improvement, documentation/tests, and feature/enhancement

Return a JSON array of exactly 3 objects with this schema:
[{
  "id": "unique-kebab-slug",
  "title": "Short clear title (under 60 chars)",
  "description": "2-3 sentence explanation of what to do and why it matters",
  "files": ["path/to/file.ts"],
  "steps": ["Step 1: Do X", "Step 2: Do Y", "Step 3: Verify"],
  "impact": "low" | "medium" | "high",
  "category": "bug" | "docs" | "test" | "feature" | "refactor" | "security" | "performance",
  "estimated_effort": "10 min" | "15 min" | "20 min" | "30 min"
}]

Codebase context:
${contextText.substring(0, 20000)}`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You output valid JSON only. Always return exactly 3 suggestions.",
            generationConfig: { responseMimeType: "application/json" },
        });

        const result = await model.generateContent(prompt);
        let content = result.response.text() || "[]";
        if (content.startsWith("```json")) {
            content = content.replace(/^```json\n/, "").replace(/\n```$/, "");
        }

        let suggestions = JSON.parse(content);

        // Ensure we have exactly 3
        if (!Array.isArray(suggestions)) suggestions = [];
        suggestions = suggestions.slice(0, 3);

        // Add ids if missing
        suggestions = suggestions.map((s: any, i: number) => ({
            id: s.id || `suggestion-${i + 1}`,
            title: s.title || `Suggestion ${i + 1}`,
            description: s.description || "",
            files: s.files || [],
            steps: s.steps || [],
            impact: s.impact || "medium",
            category: s.category || "feature",
            estimated_effort: s.estimated_effort || "15 min",
        }));

        // Cache in Supabase (upsert)
        await supabase
            .from('agent_suggestions')
            .upsert({
                user_id: identity.userId,
                repository_id: (repository as any).id,
                suggestions,
                user_persona: persona,
                seed_hash: seedStr,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: 'user_id, repository_id' });

        return NextResponse.json({
            success: true,
            suggestions,
            persona,
            cached: false,
        });

    } catch (error: any) {
        console.error("Agent Suggestions API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
