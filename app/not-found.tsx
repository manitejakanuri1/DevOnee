"use client";

import Link from "next/link";
import { SearchX, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none" />

                <div className="w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-6 relative">
                    <SearchX className="text-slate-400 w-12 h-12 relative z-10" />
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                </div>

                <h1 className="text-4xl font-extrabold mb-2 text-white tracking-tight">404</h1>
                <h2 className="text-xl font-semibold text-slate-300 mb-4">Lost in the Matrix</h2>

                <p className="text-slate-400 mb-8 leading-relaxed max-w-[280px] mx-auto">
                    We couldn't locate the repository or page you were looking for. It might be private or deleted.
                </p>

                <div className="flex flex-col gap-3">
                    <Link
                        href="/"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                    >
                        <Home size={18} /> Head back Home
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18} /> Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
