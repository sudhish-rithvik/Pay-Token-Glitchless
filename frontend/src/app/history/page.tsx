"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Loader2, ArrowLeft, ArrowUpRight, Clock, Trash2 } from "lucide-react"

interface Transaction { transaction_id: string; from_account_id: string; to_account_id: string; amount: number; currency: string; method: string; status: string; speed_mode?: string }
interface User { id: string; username: string }

export default function HistoryPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (!userData) { router.push("/login"); return }
        setUser(JSON.parse(userData))
        fetchHistory()
    }, [router])

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_BASE}/payments/history`)
            if (res.ok) setTransactions((await res.json()).reverse())
            else setError("Failed to fetch history")
        } catch { setError("Error connecting to server") } finally { setLoading(false) }
    }

    const clearHistory = async () => {
        if (!confirm("Are you sure you want to delete all transaction history?")) return
        setLoading(true)
        try {
            await fetch(`${API_BASE}/payments/history`, { method: "DELETE" })
            setTransactions([])
        } catch { setError("Error clearing history") } finally { setLoading(false) }
    }

    if (loading) return <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                {transactions.length > 0 && (
                    <button onClick={clearHistory} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1.5 transition-colors">
                        <Trash2 className="h-4 w-4" /> Clear All
                    </button>
                )}
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h1>

                {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}

                {transactions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                        <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No transactions yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map(tx => (
                            <div key={tx.transaction_id} className="card-base p-4 flex items-center gap-4">
                                {/* Icon */}
                                <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                        Sent to <span className="font-mono">{tx.to_account_id.slice(0, 10)}…</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-400 capitalize">{tx.method.replace("_", " ")}</span>
                                        <span className="text-gray-200">•</span>
                                        <span className={`badge ${tx.status === "COMPLETED" ? "badge-green" : "badge-red"}`}>{tx.status}</span>
                                        {tx.speed_mode && (
                                            <>
                                                <span className="text-gray-200">•</span>
                                                <span className="badge badge-gray">{tx.speed_mode}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Amount */}
                                <div className="text-right flex-shrink-0">
                                    <p className="font-bold text-gray-900 text-sm">-{tx.currency} {tx.amount.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-400 font-mono truncate w-20" title={tx.transaction_id}>
                                        {tx.transaction_id.slice(0, 8)}…
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
