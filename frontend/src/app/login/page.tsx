"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const endpoint = isLogin ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Authentication failed")
            localStorage.setItem("user", JSON.stringify(data))
            router.push("/dashboard")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
            {/* Top bar */}
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white">
                <Link href="/" className="inline-flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <span className="font-bold text-gray-900">Unified Pay</span>
                </Link>
            </header>

            {/* Card */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="card-base w-full max-w-sm p-8">
                    <div className="mb-7 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            {isLogin ? "Welcome back" : "Create account"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isLogin ? "Sign in to your wallet" : "Start your payment journey"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                                <span className="text-red-500">⚠</span> {error}
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Username</label>
                            <Input
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <Input
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? "Sign In" : "Create Account"}
                        </Button>
                    </form>

                    <div className="mt-5 text-center text-sm text-gray-500">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError("") }}
                            className="text-blue-600 font-medium hover:underline"
                        >
                            {isLogin ? "Sign Up" : "Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
