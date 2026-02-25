"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"

interface CounterProps {
    value: number
    suffix?: string
}

function AnimatedCounter({ value, suffix = "" }: CounterProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: true, margin: "-100px" })

    const springValue = useSpring(0, {
        bounce: 0,
        duration: 2000,
    })

    const displayValue = useTransform(springValue, (current) =>
        Math.round(current).toLocaleString()
    )

    useEffect(() => {
        if (inView) {
            springValue.set(value)
        }
    }, [inView, value, springValue])

    return (
        <span ref={ref} className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            <motion.span>{displayValue}</motion.span>
            <span className="text-blue-500">{suffix}</span>
        </span>
    )
}

const stats = [
    { label: "Repositories Analyzed", value: 10000, suffix: "+" },
    { label: "Onboarding Plans", value: 50000, suffix: "+" },
    { label: "Contributors Helped", value: 100, suffix: "+" },
]

export function Stats() {
    return (
        <section className="py-20 border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="flex flex-col gap-3 py-6 md:py-0"
                        >
                            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                            <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
