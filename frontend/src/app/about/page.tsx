"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Shield, Zap, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserData { id: string; username: string }

export default function AboutPage() {
    const router = useRouter()
    const [user, setUser] = useState<UserData | null>(null)

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (!userData) { router.push("/login"); return }
        setUser(JSON.parse(userData))
    }, [router])

    if (!user) return null

    const handleLogout = () => { localStorage.removeItem("user"); router.push("/") }

    const infoItems = [
        { icon: <Shield className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50", title: "Account Security", desc: "Your account uses standard mock encryption for demo purposes." },
        { icon: <Zap className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50", title: "AI Routing", desc: "Payments use AI routing to optimize for speed and low fees." },
    ]

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
            </header>

            <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

                {/* Profile card */}
                <div className="card-base overflow-hidden mb-5">
                    <div className="h-24 bg-gradient-to-r from-blue-50 to-violet-50" />
                    <div className="px-6 pb-6 relative">
                        <div className="absolute -top-8 h-14 w-14 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-2xl font-extrabold text-white shadow-md">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="pt-10">
                            <h2 className="text-lg font-bold text-gray-900">@{user.username}</h2>
                            <p className="text-xs text-gray-400 font-mono mt-0.5 break-all">ID: {user.id}</p>
                        </div>
                    </div>
                </div>

                {/* Info cards */}
                <div className="space-y-3 mb-6">
                    {infoItems.map((item) => (
                        <div key={item.title} className="card-base p-5 flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                                {item.icon}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                                <p className="text-xs text-gray-400">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Button variant="outline" onClick={handleLogout} className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
            </main>
        </div>
    )
}
