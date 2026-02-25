"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error boundary caught:", error)
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />

                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto" strokeWidth={1.5} />
                </div>

                <h1 className="text-3xl font-extrabold mb-3 text-white">Something snapped</h1>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    We encountered an unexpected error processing your request. We've notified our engineering tracking systems.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full bg-white text-slate-900 hover:bg-slate-200 transition-colors font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                    </button>

                    <Link
                        href="/"
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white transition-colors font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Home size={18} /> Return Home
                    </Link>
                </div>

                {process.env.NODE_ENV === "development" && (
                    <div className="mt-8 text-left bg-slate-950 p-4 rounded-xl border border-red-500/20 overflow-x-auto">
                        <p className="text-red-400 font-mono text-xs">{error.message}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
