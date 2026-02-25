import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import { analyzePersona } from "@/lib/persona";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { owner, repo, persona } = await req.json();
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

        // To get a holistic view, we ideally want a vector search over "architecture", "setup", "getting started"
        // Since we don't have the match_embeddings RPC yet, we will just pull a sample of chunks for now.
        // In a real scenario, you'd create a Postgres function \`match_embeddings\` for cosine similarity.

        // Fallback: Just grab up to 20 random chunks if match_embeddings is missing
        const { data: contextChunks } = await supabase
            .from('embeddings')
            .select('content')
            .eq('repository_id', (repository as any).id)
            .limit(20) as any;

        const contextText = contextChunks?.map((c: any) => c.content).join("\n---\n") || "No context found.";

        let targetPersona = persona;
        if (!targetPersona && owner) {
            // Ideally we'd pass the auth user's github name, but we can default test the owner or skip
            targetPersona = await analyzePersona(owner); // Simplified heuristic using the repo owner 
        } else if (!targetPersona) {
            targetPersona = "Junior Developer";
        }

        const prompt = `
You are an expert technical mentor. Based on the codebase context for ${repoFullName}, create a highly structured onboarding plan tailored for a ${targetPersona}.

Respond ONLY with valid JSON. Do not include markdown formatting or backticks around the JSON.

Expected JSON schema:
{
  "overview": "A 2-3 sentence summary of what this repository is about and why it matters.",
  "learningPath": [
    "Step 1...",
    "Step 2..."
  ],
  "importantFiles": [
    { "path": "src/index.ts", "description": "Entry point..." }
  ],
  "firstContribution": {
    "title": "A suggestion for a first PR or task",
    "description": "Details about how to achieve this task"
  },
  "difficulty": "Beginner" | "Intermediate" | "Advanced"
}

Code Context:
${contextText.substring(0, 15000)} // Truncated to avoid huge limits
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are a helpful assistant that only outputs raw JSON. Do not use block codes.",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        let content = result.response.text() || "{}";

        // Clean potential markdown blocks
        if (content.startsWith("```json")) {
            content = content.replace(/^```json\n/, "").replace(/\n```$/, "");
        }

        const planData = JSON.parse(content);

        // Save plan
        const { data: savedPlan, error: saveError } = await supabase
            .from('onboarding_plans')
            .insert({
                plan_data: planData
                // note: ideally tie to profile_id / guest_id
            } as any)
            .select('id')
            .single() as any;

        if (saveError) console.error("Could not save plan:", saveError);

        return NextResponse.json({ success: true, plan: planData, planId: (savedPlan as any)?.id });

    } catch (error: any) {
        console.error("Onboarding Plan API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
