import { fetchRepoMetadata, fetchFileTree, fetchFileContent } from "./github";
import { generateEmbedding } from "./embeddings";
import { createAdminClient } from "./supabase/server";

export const jobStatusMap = new Map<string, any>();

const IGNORED_PATHS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "test",
    "__tests__",
    ".env"
];

function shouldIgnorePath(path: string): boolean {
    return IGNORED_PATHS.some(ignored => path.includes(ignored) || path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".ico"));
}

function chunkText(text: string, maxLines: number = 100): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const line of lines) {
        currentChunk.push(line);
        if (currentChunk.length >= maxLines) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    return chunks;
}

export async function indexRepository(owner: string, repo: string, jobId: string) {
    const supabase = createAdminClient();
    const repoFullName = `${owner}/${repo}`.toLowerCase();

    try {
        // 1. Fetch metadata
        console.log(`[${jobId}] Fetching metadata for ${repoFullName}`);
        const metadata = await fetchRepoMetadata(owner, repo);
        const defaultBranch = metadata.default_branch || "main";

        // In strict schema, profile_id is required. Fetch a fallback profile if guest indexing
        const { data: existingProfiles } = await supabase.from('profiles').select('id').limit(1);
        let fallbackProfileId = (existingProfiles as any)?.[0]?.id;

        if (!fallbackProfileId) {
            console.log(`[${jobId}] No profiles exist. Creating a dummy system user...`);
            const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
                email: 'system_devone_agent@example.com',
                password: 'devone_secure_password_123',
                email_confirm: true
            });

            if (authUser?.user) {
                fallbackProfileId = authUser.user.id;
                // Explicitly insert into profiles since we bypassed the standard sign-in flow
                await supabase.from('profiles').upsert({
                    id: fallbackProfileId,
                    name: 'System Agent',
                    email: 'system_devone_agent@example.com'
                } as any);
            } else {
                console.error(`[${jobId}] CRITICAL ERROR: Could not create system user.`, authErr);
                throw new Error("No database profiles available to bind the repository to.");
            }
        }

        const { data: repository, error: repoError } = await supabase
            .from('repositories')
            .upsert({
                name: repoFullName,
                url: metadata.html_url,
                profile_id: fallbackProfileId
            } as any, { onConflict: 'id' }) // simplified upsert
            .select('id')
            .single();

        if (repoError) console.warn("Repo insert warning:", repoError.message);
        const repoId = (repository as any)?.id || '00000000-0000-0000-0000-000000000000'; // fallback uuid

        // 2. Fetch File Tree
        console.log(`[${jobId}] Fetching file tree from branch ${defaultBranch}`);
        const treeData = await fetchFileTree(owner, repo, defaultBranch);
        const files = treeData.tree.filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path));

        // Process files in parallel batches (e.g., 5 at a time)
        const batchSize = 5;
        // Limit to 30 files for fast UX during the demo
        const filesToProcess = files.slice(0, 30);
        console.log(`[${jobId}] Found ${files.length} files. Indexing top ${filesToProcess.length} for speed.`);

        let processedFiles = 0;
        const allEmbeddingsToInsert: any[] = [];

        for (let i = 0; i < filesToProcess.length; i += batchSize) {
            const batch = filesToProcess.slice(i, i + batchSize);

            await Promise.all(batch.map(async (file: any) => {
                try {
                    const content = await fetchFileContent(owner, repo, file.path, defaultBranch);
                    if (!content) return;

                    const chunks = chunkText(content as string, 150);

                    // Generate embeddings concurrently for all chunks in this file
                    const chunkData = await Promise.all(chunks.map(async (chunk, index) => {
                        const embedding = await generateEmbedding(chunk);
                        if (embedding) {
                            return {
                                repository_id: repoId,
                                content: `File: ${file.path} (Part ${index + 1})\n\n${chunk}`,
                                embedding: embedding,
                                file_path: file.path
                            };
                        }
                        return null;
                    }));

                    const validData = chunkData.filter(Boolean);
                    if (validData.length > 0) {
                        allEmbeddingsToInsert.push(...validData);
                    }
                    processedFiles++;
                } catch (err) {
                    console.error(`[${jobId}] Error processing file ${file.path}:`, err);
                }
            }));
        }

        if (allEmbeddingsToInsert.length > 0) {
            console.log(`[${jobId}] Batch inserting ${allEmbeddingsToInsert.length} embeddings to Supabase...`);
            // Insert in chunks of 100 to avoid request payload limits
            const insertBatchSize = 100;
            for (let i = 0; i < allEmbeddingsToInsert.length; i += insertBatchSize) {
                const insertBatch = allEmbeddingsToInsert.slice(i, i + insertBatchSize);
                const { error: insertErr } = await supabase.from('embeddings').insert(insertBatch as any);
                if (insertErr) {
                    console.error(`[${jobId}] Bulk insert failed:`, insertErr);
                }
            }
        }

        console.log(`[${jobId}] Indexing completed for ${repoFullName}`);
        return { success: true, filesIndexed: processedFiles };

    } catch (error) {
        console.error(`[${jobId}] Indexing failed:`, error);
        throw error;
    }
}
