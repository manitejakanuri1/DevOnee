"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Loader2, X, FileCode, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DependencyGraphProps {
    owner: string;
    repo: string;
}

interface LegendItem {
    type: string;
    color: string;
}

export function DependencyGraph({ owner, repo }: DependencyGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null);
    const [legend, setLegend] = useState<LegendItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const pulseRef = useRef(0);

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight || 500,
            });

            const observer = new ResizeObserver((entries) => {
                if (entries[0]) {
                    setDimensions({
                        width: entries[0].contentRect.width,
                        height: entries[0].contentRect.height,
                    });
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    // Pulse animation timer
    useEffect(() => {
        const interval = setInterval(() => {
            pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch("/api/repo/dependencies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner, repo }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setGraphData(data.graphData);
                    setLegend(data.legend || []);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [owner, repo]);

    const paintNode = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.4);

            // Beginner-friendly pulse ring
            if (node.beginner_friendly) {
                const pulseAlpha = 0.3 + 0.3 * Math.sin(pulseRef.current);
                ctx.beginPath();
                ctx.arc(node.x, node.y, fontSize * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 222, 128, ${pulseAlpha})`;
                ctx.fill();
            }

            // Node background
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fillRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1]
            );

            // Border with node color
            ctx.strokeStyle = node.color || "#60a5fa";
            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1]
            );

            // Label
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = node.color || "#60a5fa";
            ctx.fillText(label, node.x, node.y);

            node.__bckgDimensions = bckgDimensions;
        },
        []
    );

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode(node);
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
        <div className="relative">
            <div
                ref={containerRef}
                className="w-full h-[600px] bg-[#0f172a] rounded-2xl border border-slate-700 overflow-hidden shadow-inner"
            >
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
                            ctx.fillRect(
                                node.x - bckgDimensions[0] / 2,
                                node.y - bckgDimensions[1] / 2,
                                bckgDimensions[0],
                                bckgDimensions[1]
                            );
                        }
                    }}
                    onNodeClick={handleNodeClick}
                    linkColor={() => "rgba(148, 163, 184, 0.15)"}
                    linkWidth={1}
                    cooldownTicks={100}
                    d3VelocityDecay={0.1}
                />
            </div>

            {/* Legend */}
            {legend.length > 0 && (
                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legend</p>
                    {legend.map((item) => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs text-slate-300 capitalize">{item.type}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-700 mt-1">
                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400">Start Here</span>
                    </div>
                </div>
            )}

            {/* Selected Node Side Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-3 left-3 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileCode size={16} style={{ color: selectedNode.color }} />
                                <span className="text-sm font-semibold text-white">{selectedNode.name}</span>
                            </div>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Path:</span>
                                <span className="text-slate-300 font-mono truncate">{selectedNode.id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Type:</span>
                                <span
                                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                                    style={{
                                        backgroundColor: selectedNode.color + "20",
                                        color: selectedNode.color,
                                    }}
                                >
                                    {selectedNode.type}
                                </span>
                            </div>
                            {selectedNode.beginner_friendly && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    Beginner Friendly
                                </div>
                            )}
                        </div>

                        <a
                            href={`/repo/${owner}/${repo}/blob/${selectedNode.id}`}
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2"
                        >
                            View File <ExternalLink size={12} />
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
