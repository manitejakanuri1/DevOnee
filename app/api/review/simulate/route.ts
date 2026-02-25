import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { code, systemPrompt } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Missing code snippet" }, { status: 400 });
        }

        const defaultPrompt = `
You are a strict but fair senior software engineer reviewing a pull request.
Review the following code snippet. Focus on:
1. Logic errors or bugs
2. Performance optimizations
3. Readability and best practices

Provide actionable, constructive feedback. If the code looks perfect, say so.
`;

        const prompt = systemPrompt || defaultPrompt;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: prompt
        });

        const result = await model.generateContent(`Review this code:\n\n\`\`\`\n${code}\n\`\`\``);
        const feedback = result.response.text() || "No feedback generated.";

        return NextResponse.json({ success: true, feedback });

    } catch (error: any) {
        console.error("Review Simulation API Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message }, { status: 500 });
    }
}
