"use client"

import { motion } from "framer-motion"
import { Quote } from "lucide-react"

const testimonials = [
    {
        quote: "DevOne completely altered how I approach open source. Instead of spending 3 days decoding folders, the onboarding plan had my first PR submitted within 4 hours.",
        author: "Alex Rivera",
        role: "Frontend Developer",
        avatar: "https://picsum.photos/seed/alex/100/100",
    },
    {
        quote: "The interactive sandbox simulating a strict AI senior developer reviewing my PR drafts is literally a cheat code for shipping safer patches.",
        author: "Samantha Lee",
        role: "Fullstack Engineer",
        avatar: "https://picsum.photos/seed/samantha/100/100",
    },
    {
        quote: "We use DevOne internally now to automatically onboard our junior hires into our sprawling monorepo. It saves our seniors countless hours of mentoring.",
        author: "David Chen",
        role: "Engineering Manager",
        avatar: "https://picsum.photos/seed/david/100/100",
    },
]

export function Testimonials() {
    return (
        <section id="testimonials" className="py-24 relative overflow-hidden bg-slate-950">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Loved by Developers
                    </h2>
                    <p className="text-slate-400">Join thousands of engineers onboarding faster.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((test, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.15 }}
                            className="glass border border-slate-700/50 p-8 rounded-2xl relative group"
                        >
                            <Quote className="absolute top-6 right-6 h-8 w-8 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />

                            <div className="flex flex-col h-full">
                                <p className="relative z-10 text-slate-300 leading-relaxed mb-8 italic text-sm md:text-base flex-1">
                                    "{test.quote}"
                                </p>
                                <div className="flex items-center gap-4 mt-auto">
                                    <img
                                        src={test.avatar}
                                        alt={test.author}
                                        className="w-12 h-12 rounded-full border-2 border-slate-800"
                                    />
                                    <div>
                                        <h4 className="text-white font-medium">{test.author}</h4>
                                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">{test.role}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
