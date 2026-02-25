import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Cannot generate embeddings.");
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);

        return result.embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return null;
    }
}
