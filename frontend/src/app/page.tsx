import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
            {/* Header */}
            <header className="px-5 sm:px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <span className="font-bold text-lg text-gray-900 tracking-tight">Unified Pay</span>
                </div>
                <nav className="flex items-center gap-2">
                    <Link href="/login">
                        <Button variant="ghost" size="sm" className="text-gray-600">Login</Button>
                    </Link>
                    <Link href="/login">
                        <Button size="sm">Get Started</Button>
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-5 py-20">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border border-blue-100">
                    ⚡ AI-Powered Payment Routing
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight max-w-3xl mb-5">
                    The Smarter Way to<br />
                    <span className="text-blue-600">Move Money</span>
                </h1>
                <p className="text-base sm:text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
                    Multi-rail routing, AI-driven decisioning, and instant settlement.
                    Crypto, Fiat, UPI — all in one unified protocol.
                </p>
                <Link href="/login">
                    <Button size="lg" className="rounded-full px-10 text-base shadow-md shadow-blue-200">
                        Launch App
                    </Button>
                </Link>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-3 mt-14">
                    {["UPI Payments", "Crypto Wallets", "Net Banking", "AI Routing", "Cross-border"].map(f => (
                        <span key={f} className="badge badge-gray">{f}</span>
                    ))}
                </div>
            </main>

            <footer className="py-6 border-t border-gray-100 text-center text-gray-400 text-sm">
                © 2026 Unified Pay. All rights reserved.
            </footer>
        </div>
    )
}
