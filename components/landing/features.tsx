"use client"

import { motion } from "framer-motion"
import { Map, Terminal, GitPullRequest, SearchCheck, LayoutDashboard, BrainCircuit } from "lucide-react"

const features = [
    {
        title: "AI Onboarding Plans",
        description: "Generate structured, step-by-step learning paths tailored to your experience level by indexing the entire repository.",
        icon: Map,
        color: "text-blue-400",
        bg: "bg-blue-500/10"
    },
    {
        title: "Simulated Code Review",
        description: "Get real-time feedback on your code from an AI Senior Engineer before submitting an actual Pull Request.",
        icon: GitPullRequest,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10"
    },
    {
        title: "Contribution Sandbox",
        description: "Experiment in an isolated environment that suggests and tests 'good first issues' natively inside your browser.",
        icon: Terminal,
        color: "text-purple-400",
        bg: "bg-purple-500/10"
    },
    {
        title: "Intelligent Search",
        description: "Query codebase vectors using natural language to locate exactly where a feature, bug, or dependency resides.",
        icon: SearchCheck,
        color: "text-amber-400",
        bg: "bg-amber-500/10"
    },
    {
        title: "Interactive Dashboards",
        description: "Visualize file topologies, health metrics, and community engagement stats via customizable dynamic widgets.",
        icon: LayoutDashboard,
        color: "text-teal-400",
        bg: "bg-teal-500/10"
    },
    {
        title: "Repo Evolution Story",
        description: "Understand the 'why' behind the codebase with LLM-generated historical narratives from commit logs.",
        icon: BrainCircuit,
        color: "text-rose-400",
        bg: "bg-rose-500/10"
    }
]

export function Features() {
    return (
        <section id="features" className="py-24 relative">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                        Stop guessing. Start <span className="text-blue-500">contributing.</span>
                    </h2>
                    <p className="text-lg text-slate-400 leading-relaxed">
                        Everything you need to traverse unknown codebases natively equipped with state-of-the-art vector mapping and generative assistance.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="group relative"
                            >
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl blur opacity-50 group-hover:opacity-100 group-hover:from-blue-500/30 group-hover:to-teal-500/30 transition duration-500" />
                                <div className="relative h-full bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-colors">
                                    <div className={`inline-flex p-3 rounded-lg ${feature.bg} ${feature.color} mb-6`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
