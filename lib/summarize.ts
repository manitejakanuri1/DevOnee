import { createAdminClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Summarize a batch of files given their chunks.
 * Returns a concise summary for each file in the batch.
 */
async function summarizeFileBatch(
    model: any,
    fileBatch: { path: string; content: string }[]
): Promise<{ path: string; summary: string }[]> {
    const fileDescriptions = fileBatch
        .map(f => `### ${f.path}\n\`\`\`\n${f.content.substring(0, 3000)}\n\`\`\``)
        .join("\n\n");

    const prompt = `You are a senior software engineer analyzing source files. For each file below, write a 1-2 sentence summary covering: what it does, what it exports or defines, and its role in the project. Be specific and technical.

${fileDescriptions}

Respond with one summary per file in this exact format (no extra text):
FILE: <file_path>
SUMMARY: <your summary>
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text() || "";

        const summaries: { path: string; summary: string }[] = [];
        const blocks = text.split(/FILE:\s*/i).filter(Boolean);

        for (const block of blocks) {
            const lines = block.trim().split("\n");
            const path = lines[0]?.trim();
            const summaryMatch = block.match(/SUMMARY:\s*([\s\S]*?)(?=FILE:|$)/i);
            const summary = summaryMatch?.[1]?.trim() || lines.slice(1).join(" ").replace(/^SUMMARY:\s*/i, "").trim();

            if (path && summary) {
                summaries.push({ path, summary });
            }
        }

        return summaries;
    } catch (error) {
        console.error("Error summarizing file batch:", error);
        return fileBatch.map(f => ({
            path: f.path,
            summary: `[Could not summarize: ${f.path}]`
        }));
    }
}

/**
 * Generate a comprehensive project summary using a map-reduce approach.
 * Map: Summarize each file's chunks.
 * Reduce: Synthesize all file summaries into a project-level summary.
 */
export async function generateProjectSummary(
    repoId: string,
    repoName: string
): Promise<string> {
    const supabase = createAdminClient();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Fetch all embeddings for this repo
    const { data: embeddings, error } = await supabase
        .from("embeddings")
        .select("content, file_path")
        .eq("repository_id", repoId)
        .order("file_path");

    if (error || !embeddings || embeddings.length === 0) {
        return "No indexed files found for this repository. Please index the repository first.";
    }

    // Group chunks by file path
    const fileMap = new Map<string, string[]>();
    for (const emb of embeddings) {
        const path = emb.file_path || "unknown";
        if (!fileMap.has(path)) fileMap.set(path, []);
        fileMap.get(path)!.push(emb.content);
    }

    // MAP PHASE: Summarize files in batches of 5
    const filePaths = Array.from(fileMap.keys());
    const fileBatches: { path: string; content: string }[][] = [];

    for (let i = 0; i < filePaths.length; i += 5) {
        const batch = filePaths.slice(i, i + 5).map(path => ({
            path,
            content: fileMap.get(path)!.join("\n\n")
        }));
        fileBatches.push(batch);
    }

    const allFileSummaries: { path: string; summary: string }[] = [];

    // Process batches sequentially to respect rate limits
    for (const batch of fileBatches) {
        const summaries = await summarizeFileBatch(model, batch);
        allFileSummaries.push(...summaries);
    }

    // REDUCE PHASE: Synthesize into comprehensive project summary
    const fileSummaryText = allFileSummaries
        .map(s => `- **${s.path}**: ${s.summary}`)
        .join("\n");

    // Truncate to stay within context limits
    const truncatedSummaries = fileSummaryText.substring(0, 30000);

    const synthesisPrompt = `You are a senior software architect writing a comprehensive project summary for a repository called "${repoName}".

Based on the following per-file summaries from the codebase, write a detailed project summary. Structure your response with these sections using markdown:

## Project Overview
A clear description of what this project does and its primary purpose.

## Tech Stack
List the key technologies, frameworks, and libraries used.

## Architecture
Describe the high-level architecture — how the project is organized, key modules, and how they interact.

## Key Modules & Files
Describe the most important modules/directories and their responsibilities.

## Data Flow
Explain how data flows through the application (e.g., user request → API → database → response).

## Entry Points
Identify the main entry points (e.g., main files, API routes, CLI commands).

---

Per-file summaries:
${truncatedSummaries}

Write the summary in clear, technical markdown. Be specific about this project — don't use generic language.`;

    try {
        const result = await model.generateContent(synthesisPrompt);
        return result.response.text() || "Could not generate project summary.";
    } catch (error) {
        console.error("Error in synthesis phase:", error);
        return "Failed to generate comprehensive summary. Please try again.";
    }
}
