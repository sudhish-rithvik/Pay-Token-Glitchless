"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ArrowLeft, Trash2, Users } from "lucide-react"

interface User { id: string; username: string }
interface Payee { id: string; user_id: string; name: string; account_type: string; account_identifier: string }

export default function PayeesPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [payees, setPayees] = useState<Payee[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newPayee, setNewPayee] = useState({ name: "", account_type: "UPI", account_identifier: "" })

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (!userData) { router.push("/login"); return }
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        fetchPayees(parsedUser.id)
    }, [router])

    const fetchPayees = async (userId: string) => {
        try {
            const res = await fetch(`${API_BASE}/payees/${userId}`)
            if (res.ok) setPayees(await res.json())
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    const handleDelete = async (payeeId: string) => {
        if (!confirm("Remove this payee?")) return
        try {
            const res = await fetch(`${API_BASE}/payees/${payeeId}`, { method: "DELETE" })
            if (res.ok && user) fetchPayees(user.id)
        } catch (e) { console.error(e) }
    }

    const handleCreatePayee = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        try {
            const res = await fetch(`${API_BASE}/payees/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, ...newPayee }) })
            if (res.ok) { fetchPayees(user.id); setShowCreateForm(false); setNewPayee({ name: "", account_type: "UPI", account_identifier: "" }) }
            else alert("Failed to create payee")
        } catch (e) { console.error(e) }
    }

    if (loading) return <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>

    const avatarColors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"]

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                    <Plus className="mr-1.5 h-4 w-4" />{showCreateForm ? "Cancel" : "Add Payee"}
                </Button>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Payees</h1>

                {/* Create form */}
                {showCreateForm && (
                    <div className="card-base p-6 mb-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Save Receiver Details</h2>
                        <form onSubmit={handleCreatePayee} className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Name</label>
                                <Input placeholder="John Doe" value={newPayee.name} onChange={e => setNewPayee({ ...newPayee, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Type</label>
                                <select value={newPayee.account_type} onChange={e => setNewPayee({ ...newPayee, account_type: e.target.value })} className="w-full h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="UPI">UPI</option>
                                    <option value="BANK_ACCOUNT">Bank Account</option>
                                    <option value="CRYPTO_WALLET">Crypto Wallet</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Identifier</label>
                                <Input placeholder="UPI ID / Account No / Wallet" value={newPayee.account_identifier} onChange={e => setNewPayee({ ...newPayee, account_identifier: e.target.value })} required />
                            </div>
                            <Button type="submit" className="w-full">Save Payee</Button>
                        </form>
                    </div>
                )}

                {/* Payees list */}
                {payees.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No payees saved yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payees.map((payee, i) => (
                            <div key={payee.id} className="card-base p-4 flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                                    {payee.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{payee.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="badge badge-gray">{payee.account_type.replace("_", " ")}</span>
                                        <span className="text-xs text-gray-400 font-mono truncate">{payee.account_identifier}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(payee.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
