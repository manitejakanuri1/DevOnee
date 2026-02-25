"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { OnboardCard } from '@/components/ui/onboard-card';

function LoadingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<any>({ status: 'initializing', progress: 0, message: 'Waking up agent...' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!owner || !repo) {
            setError('Missing owner or repo parameters');
            return;
        }

        setStatus({ status: 'processing', progress: 50, message: 'Chunking & Embedding Code (Sync)' });

        fetch('/api/repo/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.message || data.error);

                setStatus({ status: 'completed', progress: 100, message: 'Finalizing Knowledge Base' });

                setTimeout(() => {
                    router.push(`/repo/${owner}/${repo}`);
                }, 1000);
            })
            .catch(err => {
                console.error("Indexing trigger error:", err);
                setError(err.message);
            });
    }, [owner, repo, router]);

    const STAGES = [
        { label: "Waking up AI Agent", threshold: 0 },
        { label: "Fetching Metadata & Commits", threshold: 10 },
        { label: "Chunking & Emdedding Code", threshold: 30 },
        { label: "Finalizing Knowledge Base", threshold: 90 }
    ];

    const currentStageIndex = STAGES.findIndex((stage, i) => {
        const nextStage = STAGES[i + 1];
        return status.progress >= stage.threshold && (!nextStage || status.progress < nextStage.threshold);
    });

    return (
        <div className="w-full max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center text-white">
                Preparing <span className="text-blue-500">{repo}</span>
            </h2>
            <OnboardCard
                steps={[
                    { id: '1', name: "Waking up AI Agent" },
                    { id: '2', name: "Fetching Metadata & Commits" },
                    { id: '3', name: "Chunking & Emdedding Code" },
                    { id: '4', name: "Finalizing Knowledge Base" }
                ]}
                currentStepIndex={currentStageIndex}
                progress={status.progress}
                className="w-full max-w-md mx-auto"
            />
        </div>
    );
}

export default function LoadingPage() {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <Suspense fallback={<div style={{ color: 'white' }}><Loader2 className="animate-spin" /></div>}>
                <LoadingContent />
            </Suspense>
        </main>
    );
}
