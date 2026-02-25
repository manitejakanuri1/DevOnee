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

        // 1. Fetch GitHub history
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DevOne-App'
        };
        if (process.env.GITHUB_TOKEN) {
            // @ts-ignore
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        // Fetch commits
        const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, { headers });
        const commits = commitsRes.ok ? await commitsRes.json() : [];

        // Fetch PRs
        const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=5`, { headers });
        const prs = prsRes.ok ? await prsRes.json() : [];

        // Synthesize context array
        const events = [
            ...commits.map((c: any) => `- Commit: ${c.commit.message} by ${c.commit.author.name} (${new Date(c.commit.author.date).toLocaleDateString()})`),
            ...prs.map((p: any) => `- PR [${p.state}]: ${p.title} (${new Date(p.created_at).toLocaleDateString()})`)
        ].join('\n');

        const prompt = `
You are a technical historian. Based on these recent events from the repository ${repoFullName}, write a short engaging narrative (3-4 paragraphs) summarizing the project's recent evolution, focus areas, and story. Also, extract a JSON array of 3-5 major timeline milestones.

Events:
${events}

Respond ONLY with valid JSON in this schema:
{
  "narrative": "The engaging story of the repository's recent evolution...",
  "timeline": [
    { "date": "YYYY-MM-DD", "event": "Short description of milestone" }
  ]
}
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

        const storyData = JSON.parse(content);

        // Get Repo ID to store optional community_insights generic hook or a new story table.
        // For now we'll just return it so Frontend can render it, but we can also cache it in insights
        const { data: repository } = await supabase.from('repositories').select('id').eq('name', repoFullName).single();

        if (repository) {
            await supabase.from('community_insights').insert({
                title: `Evolution Story of ${repoFullName}`,
                content: content, // Store the JSON blob
            } as any);
        }

        return NextResponse.json({ success: true, story: storyData });

    } catch (error: any) {
        console.error("Story API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
