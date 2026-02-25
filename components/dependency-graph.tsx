"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader2 } from 'lucide-react';

interface DependencyGraphProps {
    owner: string;
    repo: string;
}

export function DependencyGraph({ owner, repo }: DependencyGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        // Resize observer
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight || 500
            });

            const observer = new ResizeObserver(entries => {
                if (entries[0]) {
                    setDimensions({
                        width: entries[0].contentRect.width,
                        height: entries[0].contentRect.height
                    });
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    useEffect(() => {
        fetch('/api/repo/dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setGraphData(data.graphData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [owner, repo]);

    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#60a5fa'; // Blue 400
        ctx.fillText(label, node.x, node.y);

        node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[500px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Projecting Repository Topology...</p>
            </div>
        );
    }

    if (!graphData) {
        return (
            <div className="w-full h-[500px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                Failed to map dependencies.
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-[600px] bg-[#0f172a] rounded-2xl border border-slate-700 overflow-hidden shadow-inner">
            <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="id"
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    ctx.fillStyle = color;
                    const bckgDimensions = node.__bckgDimensions;
                    if (bckgDimensions) {
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                    }
                }}
                linkColor={() => 'rgba(148, 163, 184, 0.2)'}
                linkWidth={1}
                cooldownTicks={100}
                d3VelocityDecay={0.1}
            />
        </div>
    );
}
