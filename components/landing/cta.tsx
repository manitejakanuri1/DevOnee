"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7 }}
                    className="relative glass-card rounded-3xl p-10 md:p-16 text-center border border-slate-700/50 overflow-hidden"
                >
                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

                    <h2 className="relative z-10 text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to dive in?
                    </h2>
                    <p className="relative z-10 text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                        Stop wasting hours reading outdated documentation. Paste any GitHub URL and let DevOne's AI generate your roadmap instantly.
                    </p>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            size="lg"
                            onClick={scrollToTop}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg font-medium w-full sm:w-auto shadow-lg shadow-blue-500/25 transition-transform hover:scale-105"
                        >
                            Analyze a Repository Now
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="border-slate-600 hover:border-slate-500 bg-transparent hover:bg-slate-800 text-white rounded-full px-8 py-6 text-lg font-medium w-full sm:w-auto transition-colors"
                        >
                            View Docs <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
