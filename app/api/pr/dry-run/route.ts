import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { owner, repo, filePath, originalContent, newContent, challengeId } = await req.json();

        if (!owner || !repo || !newContent) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const prompt = `
You are a senior CI/CD engineer analyzing a proposed code change for the repository ${owner}/${repo}.

File: ${filePath || "unknown"}

Original code:
\`\`\`
${(originalContent || "// New file").substring(0, 5000)}
\`\`\`

Proposed change:
\`\`\`
${newContent.substring(0, 5000)}
\`\`\`

Analyze this change and predict the CI/CD pipeline results. Respond ONLY with valid JSON:
{
  "tests": { "status": "pass" | "warn" | "fail", "reason": "explanation" },
  "linting": { "status": "pass" | "warn" | "fail", "reason": "explanation" },
  "conflicts": { "status": "pass" | "warn" | "fail", "reason": "explanation" },
  "typeSafety": { "status": "pass" | "warn" | "fail", "reason": "explanation" },
  "riskScore": 1-10,
  "summary": "Overall assessment in 1-2 sentences"
}

Be realistic but encouraging. Most simple documentation or test changes should pass.
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

        const prediction = JSON.parse(content);

        // Store in database
        const supabase: any = createAdminClient();
        const repoFullName = `${owner}/${repo}`.toLowerCase();
        const { data: repository } = await supabase
            .from("repositories")
            .select("id")
            .eq("name", repoFullName)
            .single() as any;

        if (repository) {
            await (supabase as any).from("dry_run_results").insert({
                challenge_id: challengeId || null,
                profile_id: auth.userId,
                repository_id: repository.id,
                original_content: (originalContent || "").substring(0, 10000),
                new_content: newContent.substring(0, 10000),
                prediction,
                risk_score: prediction.riskScore || 5,
            });
        }

        return NextResponse.json({ success: true, prediction });
    } catch (error: any) {
        console.error("Dry Run API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
