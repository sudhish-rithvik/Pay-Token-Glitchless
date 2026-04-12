"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE } from "@/lib/api"
import { Loader2, ArrowRightLeft, CreditCard, Clock, Users, User as UserIcon, ChevronRight, Search } from "lucide-react"

interface User {
    id: string
    username: string
}

export default function Dashboard() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const [txHash, setTxHash] = useState("")
    const [txResult, setTxResult] = useState<any>(null)
    const [txError, setTxError] = useState("")
    const [txLoading, setTxLoading] = useState(false)

    const handleVerifyTx = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!txHash) return
        setTxLoading(true)
        setTxError("")
        setTxResult(null)
        try {
            const res = await fetch(`${API_BASE}/payments/transaction/${txHash}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Transaction not found")
            setTxResult(data)
        } catch (err: any) {
            setTxError(err.message)
        } finally {
            setTxLoading(false)
        }
    }

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (!userData) {
            router.push("/login")
            return
        }
        setUser(JSON.parse(userData))
        setLoading(false)
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("user")
        router.push("/")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
        )
    }

    const navItems = [
        {
            title: "Accounts",
            description: "Manage bank accounts, cards, UPI, and crypto wallets.",
            icon: <CreditCard className="w-5 h-5 text-blue-600" />,
            iconBg: "bg-blue-50",
            href: "/accounts",
        },
        {
            title: "Send Money",
            description: "Make a new payment or transfer funds instantly.",
            icon: <ArrowRightLeft className="w-5 h-5 text-emerald-600" />,
            iconBg: "bg-emerald-50",
            href: "/payments",
        },
        {
            title: "Transaction History",
            description: "View your past payments and receipts.",
            icon: <Clock className="w-5 h-5 text-amber-600" />,
            iconBg: "bg-amber-50",
            href: "/history",
        },
        {
            title: "Payees",
            description: "Save and manage receiver information.",
            icon: <Users className="w-5 h-5 text-violet-600" />,
            iconBg: "bg-violet-50",
            href: "/payees",
        },
        {
            title: "Profile",
            description: "View your profile and app information.",
            icon: <UserIcon className="w-5 h-5 text-pink-600" />,
            iconBg: "bg-pink-50",
            href: "/about",
        },
    ]

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            {/* Top bar */}
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <span className="font-bold text-gray-900">Unified Pay</span>
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline">@{user?.username}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                {/* Greeting */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Hello, {user?.username} 👋</h1>
                            <p className="text-sm text-gray-400">What would you like to do today?</p>
                        </div>
                    </div>
                </div>

                {/* Nav cards */}
                <div className="space-y-3">
                    {navItems.map((item, idx) => (
                        <Link href={item.href} key={idx}>
                            <div className="card-base p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
                                <div className={`h-10 w-10 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Transaction Lookup Widget */}
                <div className="mt-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Verify Transaction</h2>
                    <div className="card-base p-5">
                        <form onSubmit={handleVerifyTx} className="flex gap-2 mb-4">
                            <Input
                                placeholder="Enter transaction hash / ID"
                                value={txHash}
                                onChange={(e) => setTxHash(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={txLoading || !txHash}>
                                {txLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Verify</span>
                            </Button>
                        </form>

                        {txError && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                {txError}
                            </div>
                        )}

                        {txResult && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${txResult.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : txResult.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {txResult.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Amount</span>
                                    <span className="text-sm font-bold text-gray-900">{txResult.currency} {txResult.amount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Method</span>
                                    <span className="text-sm font-medium text-gray-900">{txResult.method}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">From (Masked)</span>
                                    <span className="text-sm font-mono text-gray-700">{txResult.from_account_id}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">To (Masked)</span>
                                    <span className="text-sm font-mono text-gray-700">{txResult.to_account_id}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
