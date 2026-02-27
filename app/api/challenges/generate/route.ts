import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const { owner, repo } = await req.json();
        if (!owner || !repo) {
            return NextResponse.json({ success: false, error: "Missing owner or repo" }, { status: 400 });
        }

        const supabase: any = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();

        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .single() as any;

        if (!repository) {
            return NextResponse.json(
                { success: false, error: "Repository not found. Please index the repo first." },
                { status: 404 }
            );
        }

        // Check if challenges already exist for this repo
        const { data: existing } = await (supabase as any)
            .from("challenges")
            .select("id")
            .eq("repository_id", repository.id)
            .limit(1);

        if (existing && existing.length > 0) {
            // Return existing challenges
            const { data: challenges } = await (supabase as any)
                .from("challenges")
                .select("*")
                .eq("repository_id", repository.id)
                .order("difficulty", { ascending: true });

            return NextResponse.json({ success: true, challenges, cached: true });
        }

        // Fetch repo context from embeddings
        const { data: chunks } = await supabase
            .from("embeddings")
            .select("content")
            .eq("repository_id", repository.id)
            .limit(15);

        const contextText = chunks?.map((c: any) => c.content).join("\n---\n") || "";

        const prompt = `
You are a senior open-source maintainer for ${repoFullName}. Generate exactly 6 contribution challenges for new contributors.

Rules:
- Mix of 2 easy, 2 medium, 2 hard challenges
- Categories MUST be one of: "docs", "tests", "bugfix", "feature", "refactor"
- Challenges must be specific and actionable based on the actual codebase
- Each challenge should reference real files when possible

Respond ONLY with valid JSON in this schema:
{
  "challenges": [
    {
      "title": "Short title",
      "description": "What needs to be done and why",
      "difficulty": "easy" | "medium" | "hard",
      "category": "docs" | "tests" | "bugfix" | "feature" | "refactor",
      "xp_reward": 50 | 100 | 200,
      "target_files": ["path/to/file.ts"],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

XP values: easy=50, medium=100, hard=200

Codebase context:
${contextText.substring(0, 20000)}
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You output valid JSON only.",
            generationConfig: { responseMimeType: "application/json" },
        });

        const result = await model.generateContent(prompt);
        let content = result.response.text() || "{}";
        if (content.startsWith("```json")) {
            content = content.replace(/^```json\n/, "").replace(/\n```$/, "");
        }

        const parsed = JSON.parse(content);
        const challenges = parsed.challenges || [];

        // Insert into database
        const insertData = challenges.map((c: any) => ({
            repository_id: repository.id,
            title: c.title,
            description: c.description,
            difficulty: c.difficulty,
            category: c.category,
            xp_reward: c.xp_reward || (c.difficulty === "easy" ? 50 : c.difficulty === "medium" ? 100 : 200),
            target_files: c.target_files || [],
            steps: c.steps || [],
            status: "open",
        }));

        const { data: inserted, error } = await (supabase as any)
            .from("challenges")
            .insert(insertData)
            .select();

        if (error) {
            console.error("Failed to insert challenges:", error);
            return NextResponse.json({ success: true, challenges: insertData });
        }

        return NextResponse.json({ success: true, challenges: inserted });
    } catch (error: any) {
        console.error("Challenges Generate API Error:", error);
        return NextResponse.json(
            { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
