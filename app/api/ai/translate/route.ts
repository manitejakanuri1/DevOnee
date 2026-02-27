import { NextRequest, NextResponse } from "next/server";
import { getUserIdentity } from "@/lib/auth-guard";
import { checkAndIncrementUsage } from "@/lib/usage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const identity = await getUserIdentity();
        const usage = await checkAndIncrementUsage(identity.userId, identity.isGuest, "ai_translate");
        if (!usage.allowed) {
            return NextResponse.json({ error: "LIMIT_EXCEEDED", message: usage.message }, { status: 429 });
        }

        const { code, sourceLanguage, targetLanguage } = await req.json();

        if (!code || !targetLanguage) {
            return NextResponse.json({ error: "Missing code or targetLanguage" }, { status: 400 });
        }

        if (code.length > 10000) {
            return NextResponse.json({ error: "Code exceeds 10,000 character limit" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are an expert programmer and code translator. Translate code accurately while preserving logic, comments, and structure. Use idiomatic patterns for the target language. Return ONLY the translated code with no explanation, no markdown fences, no additional text.",
        });

        const sourceLang = sourceLanguage || "auto-detect";
        const prompt = `Translate the following ${sourceLang} code to ${targetLanguage}. Preserve the logic, comments, and structure. Use idiomatic ${targetLanguage} patterns.

Code:
${code}`;

        const result = await model.generateContent(prompt);
        let translatedCode = result.response.text() || "";

        // Strip markdown code fences if present
        translatedCode = translatedCode
            .replace(/^```[\w]*\n?/m, "")
            .replace(/\n?```\s*$/m, "")
            .trim();

        return NextResponse.json({
            success: true,
            translatedCode,
            sourceLanguage: sourceLang,
            targetLanguage,
        });
    } catch (error: any) {
        console.error("Translation API Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: error.message },
            { status: 500 }
        );
    }
}
