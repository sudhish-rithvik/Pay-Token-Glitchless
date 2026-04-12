"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ArrowLeft, Trash2, Smartphone, Building, CreditCard, Bitcoin, CheckCircle } from "lucide-react"

interface User { id: string; username: string }
interface Account { id: string; user_id: string; balance: number; account_type: string; account_number?: string; cvv?: string; expiry_date?: string; upi_id?: string; ifsc?: string; bank_name?: string; wallet_address?: string; network?: string }

function Select({ name, value, onChange, children, className = "" }: any) {
    return (
        <select name={name} value={value} onChange={onChange} className={`w-full h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}>
            {children}
        </select>
    )
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    UPI:         { label: "UPI",        icon: <Smartphone className="w-5 h-5" />,  color: "text-blue-600",   bgColor: "bg-blue-50" },
    NET_BANKING: { label: "Net Banking", icon: <Building className="w-5 h-5" />,   color: "text-emerald-600", bgColor: "bg-emerald-50" },
    CARD:        { label: "Card",       icon: <CreditCard className="w-5 h-5" />, color: "text-violet-600", bgColor: "bg-violet-50" },
    CRYPTO:      { label: "Crypto",     icon: <Bitcoin className="w-5 h-5" />,    color: "text-amber-600",  bgColor: "bg-amber-50" },
}

export default function AccountsPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [accountType, setAccountType] = useState("UPI")
    const [formData, setFormData] = useState({ account_number: "", cvv: "", expiry_date: "", upi_id: "", ifsc: "", bank_name: "", wallet_address: "", network: "Ethereum", balance: "1000" })
    const [showOTP, setShowOTP] = useState(false)
    const [otp, setOtp] = useState("")

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (!userData) { router.push("/login"); return }
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        fetchAccounts(parsedUser.id)
    }, [router])

    const fetchAccounts = async (userId: string) => {
        try {
            const res = await fetch(`${API_BASE}/accounts/${userId}`)
            if (res.ok) setAccounts(await res.json())
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    const handleDelete = async (accountId: string) => {
        if (!confirm("Delete this account?")) return
        try {
            const res = await fetch(`${API_BASE}/accounts/${accountId}`, { method: "DELETE" })
            if (res.ok && user) fetchAccounts(user.id)
            else { const e = await res.json(); alert("Failed: " + (e.detail || "Unknown error")) }
        } catch (e) { console.error(e) }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })

    const handleCreateInitiate = (e: React.FormEvent) => { e.preventDefault(); accountType === "UPI" ? setShowOTP(true) : submitAccount() }

    const handleOTPVerify = (e: React.FormEvent) => {
        e.preventDefault()
        if (otp === "123456") { setShowOTP(false); submitAccount(); setOtp("") }
        else alert("Invalid OTP! (Use 123456 for demo)")
    }

    const submitAccount = async () => {
        if (!user) return
        let payload: any = { user_id: user.id, balance: parseFloat(formData.balance), account_type: accountType }
        if (accountType === "UPI") payload = { ...payload, upi_id: formData.upi_id }
        else if (accountType === "NET_BANKING") payload = { ...payload, account_number: formData.account_number, ifsc: formData.ifsc, bank_name: formData.bank_name }
        else if (accountType === "CARD") payload = { ...payload, account_number: formData.account_number, cvv: formData.cvv, expiry_date: formData.expiry_date }
        else if (accountType === "CRYPTO") payload = { ...payload, wallet_address: formData.wallet_address, network: formData.network }
        try {
            const res = await fetch(`${API_BASE}/accounts/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            if (res.ok) { if (user) fetchAccounts(user.id); setShowCreateForm(false); setFormData({ account_number: "", cvv: "", expiry_date: "", upi_id: "", ifsc: "", bank_name: "", wallet_address: "", network: "Ethereum", balance: "1000" }) }
            else { const e = await res.json(); alert("Failed: " + (e.detail || "Unknown error")) }
        } catch (e) { console.error(e) }
    }

    if (loading) return <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                    <Plus className="mr-1.5 h-4 w-4" /> {showCreateForm ? "Cancel" : "Add Account"}
                </Button>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Accounts</h1>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="card-base p-6 mb-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Add New Account</h2>
                        {/* Type tabs */}
                        <div className="flex gap-2 flex-wrap mb-5">
                            {["UPI", "NET_BANKING", "CARD", "CRYPTO"].map(t => (
                                <button key={t} onClick={() => setAccountType(t)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${accountType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {t.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                        <form onSubmit={handleCreateInitiate} className="space-y-3">
                            {accountType === "UPI" && (
                                <div><label className="text-xs text-gray-400 block mb-1">UPI ID</label><Input name="upi_id" placeholder="example@upi" value={formData.upi_id} onChange={handleChange} required /></div>
                            )}
                            {accountType === "NET_BANKING" && (
                                <div className="space-y-3">
                                    <div><label className="text-xs text-gray-400 block mb-1">Account Number</label><Input name="account_number" placeholder="123456789012" value={formData.account_number} onChange={handleChange} required /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-400 block mb-1">IFSC</label><Input name="ifsc" placeholder="ABCD0123456" value={formData.ifsc} onChange={handleChange} required /></div>
                                        <div><label className="text-xs text-gray-400 block mb-1">Bank Name</label><Input name="bank_name" placeholder="State Bank" value={formData.bank_name} onChange={handleChange} required /></div>
                                    </div>
                                </div>
                            )}
                            {accountType === "CARD" && (
                                <div className="space-y-3">
                                    <div><label className="text-xs text-gray-400 block mb-1">Card Number</label><Input name="account_number" maxLength={16} placeholder="0000 0000 0000 0000" value={formData.account_number} onChange={handleChange} required /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-gray-400 block mb-1">CVV</label><Input name="cvv" maxLength={3} placeholder="123" value={formData.cvv} onChange={handleChange} required /></div>
                                        <div><label className="text-xs text-gray-400 block mb-1">Expiry (MM/YY)</label><Input name="expiry_date" placeholder="12/30" value={formData.expiry_date} onChange={handleChange} required /></div>
                                    </div>
                                </div>
                            )}
                            {accountType === "CRYPTO" && (
                                <div className="space-y-3">
                                    <div><label className="text-xs text-gray-400 block mb-1">Wallet Address</label><Input name="wallet_address" placeholder="0x..." value={formData.wallet_address} onChange={handleChange} required /></div>
                                    <div><label className="text-xs text-gray-400 block mb-1">Network</label>
                                        <Select name="network" value={formData.network} onChange={handleChange}>
                                            <option value="Ethereum">Ethereum</option>
                                            <option value="Polygon">Polygon</option>
                                            <option value="Solana">Solana</option>
                                        </Select>
                                    </div>
                                </div>
                            )}
                            <div className="pt-3 border-t border-gray-100 mt-3">
                                <label className="text-xs text-gray-400 block mb-1">Initial Balance (INR equiv.)</label>
                                <Input type="number" name="balance" placeholder="1000" value={formData.balance} onChange={handleChange} required />
                            </div>
                            <Button type="submit" className="w-full">{accountType === "UPI" ? "Verify & Add" : "Add Account"}</Button>
                        </form>
                    </div>
                )}

                {/* Accounts list */}
                {accounts.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-400 mb-4 text-sm">No accounts linked yet.</p>
                        <Button onClick={() => setShowCreateForm(true)} variant="outline" size="sm">Add your first account</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accounts.map((acc) => {
                            const meta = TYPE_META[acc.account_type] || TYPE_META["CARD"]
                            return (
                                <div key={acc.id} className="card-base p-5 flex items-center gap-4">
                                    <div className={`h-11 w-11 rounded-xl ${meta.bgColor} ${meta.color} flex items-center justify-center flex-shrink-0`}>
                                        {meta.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm">{meta.label}</p>
                                        <p className="text-xs text-gray-400 truncate font-mono">
                                            {acc.account_type === 'CARD' && `**** **** **** ${acc.account_number?.slice(-4)}`}
                                            {acc.account_type === 'UPI' && acc.upi_id}
                                            {acc.account_type === 'NET_BANKING' && `${acc.bank_name} · ****${acc.account_number?.slice(-4)}`}
                                            {acc.account_type === 'CRYPTO' && `${acc.wallet_address?.slice(0, 8)}...${acc.wallet_address?.slice(-6)} · ${acc.network}`}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0 mr-3">
                                        <p className="font-bold text-gray-900 text-sm">₹{acc.balance.toFixed(2)}</p>
                                        <p className="text-[10px] text-gray-400">balance</p>
                                    </div>
                                    <button onClick={() => handleDelete(acc.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* OTP Modal */}
            {showOTP && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                    <div className="card-base w-full max-w-sm p-8 text-center">
                        <div className="h-12 w-12 rounded-full bg-blue-50 mx-auto mb-4 flex items-center justify-center">
                            <Smartphone className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Verify UPI</h3>
                        <p className="text-sm text-gray-400 mb-5">Enter OTP sent for <span className="font-mono text-gray-700">{formData.upi_id}</span></p>
                        <form onSubmit={handleOTPVerify} className="space-y-3">
                            <Input autoFocus placeholder="Enter OTP (123456)" value={otp} onChange={e => setOtp(e.target.value)} className="text-center tracking-[0.4em] font-mono text-xl h-14" required />
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowOTP(false)}>Cancel</Button>
                                <Button type="submit">Verify</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
