import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "ai_commit_message");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { originalContent, newContent, filePath, repoContext } = await req.json();

        if (!newContent || !filePath) {
            return NextResponse.json({ error: "Missing newContent or filePath" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You generate concise conventional commit messages. Return ONLY the commit message, nothing else. No quotes, no explanation.",
        });

        const original = (originalContent || "").substring(0, 3000);
        const modified = (newContent || "").substring(0, 3000);

        const prompt = `Generate a conventional commit message for the following file change.

Format: type(scope): description
Types: feat, fix, refactor, docs, style, test, chore
Scope: derive from file path
Description: imperative mood, max 72 chars

${repoContext ? `Repository: ${repoContext}` : ""}
File: ${filePath}

Original content:
${original || "(new file)"}

Modified content:
${modified}`;

        const result = await model.generateContent(prompt);
        let commitMessage = result.response.text() || "chore: update file";

        // Clean up response
        commitMessage = commitMessage
            .replace(/^["'`]+|["'`]+$/g, "")
            .split("\n")[0]
            .trim();

        return NextResponse.json({
            success: true,
            commitMessage,
        });
    } catch (error: any) {
        console.error("Commit Message API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
