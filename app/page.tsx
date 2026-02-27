import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
import { Testimonials } from "@/components/landing/testimonials"
import { CTA } from "@/components/landing/cta"
import { NavbarAuthButton } from "@/components/navbar-auth-button"

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-50 font-sans selection:bg-blue-500/30">
            {/* Top Navbar Simulation (Optional, but good for aesthetic) */}
            <header className="absolute top-0 w-full z-50 border-b border-white/5 bg-transparent p-4">
                <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg outline outline-1 outline-white/10 bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg">
                            D1
                        </div>
                        <span className="font-bold text-lg tracking-tight">DevOne</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <NavbarAuthButton />
                        <a href="/dashboard" className="hidden sm:inline-flex bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-md transition-colors border border-white/10">
                            Get Started
                        </a>
                    </div>
                </div>
            </header>

            <main>
                <Hero />
                <Stats />
                <Features />
                <Testimonials />
                <CTA />
            </main>

            <footer className="border-t border-slate-800 bg-[#0a0a0f] py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border border-slate-700 bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                            D1
                        </div>
                        <span className="font-semibold text-slate-400">© 2026 DevOne Inc.</span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-400">
                        <span className="hover:text-slate-200 transition-colors cursor-pointer">Privacy Policy</span>
                        <span className="hover:text-slate-200 transition-colors cursor-pointer">Terms of Service</span>
                        <a href="https://github.com/manitejakanuri1/DevOnee" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
