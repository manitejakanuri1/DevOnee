"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowRight, Github } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Hero() {
    const router = useRouter()
    const [repoUrl, setRepoUrl] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!repoUrl) {
            setError("Please enter a repository URL")
            return
        }

        // Basic parsing for github.com/owner/repo or owner/repo
        const regex = /(?:github\.com\/)?([a-zA-Z0-9.-]+\/[a-zA-Z0-9.-]+)/
        const match = repoUrl.match(regex)

        if (match && match[1]) {
            const [owner, repo] = match[1].split("/")
            const cleanRepo = repo.replace(/\.git$/, "")
            router.push(`/repo/loading?owner=${owner}&repo=${cleanRepo}`)
        } else {
            setError("Invalid repository format. Try owner/repo")
        }
    }

    return (
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-md mb-8">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-sm font-medium text-slate-300">DevOne Beta is live</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
                        Your AI Senior Engineer <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                            for Any Codebase
                        </span>
                    </h1>

                    <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Instantly understand complex projects, generate tailored onboarding plans,
                        and make your first open-source contribution in minutes with AI-guided mentorship.
                    </p>

                    <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl p-2 pl-4 focus-within:border-blue-500 transition-colors">
                                <Github className="h-5 w-5 text-slate-400 mr-2 shrink-0" />
                                <Input
                                    type="text"
                                    placeholder="github.com/facebook/react"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 px-0 placeholder:text-slate-600 h-12"
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-6 h-12 font-medium transition-all"
                                >
                                    Analyze
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -bottom-8 left-0 w-full text-center text-red-400 text-sm font-medium"
                            >
                                {error}
                            </motion.p>
                        )}
                    </form>
                </motion.div>
            </div>
        </section>
    )
}
