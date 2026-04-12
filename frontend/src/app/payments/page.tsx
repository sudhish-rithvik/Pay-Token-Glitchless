"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft, Send, Search, CheckCircle, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react"

interface User { id: string; username: string }
interface Account { id: string; user_id: string; balance: number; account_number?: string; type?: string; account_type?: string; upi_id?: string; wallet_address?: string }
type PaymentStep = "INPUT" | "REVIEW" | "RESULT"

/* Shared page shell */
function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            <header className="px-5 sm:px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Link>
            </header>
            <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
                {children}
            </main>
        </div>
    )
}

/* Step indicator */
function StepBar({ step }: { step: PaymentStep }) {
    const steps = ["INPUT", "REVIEW", "RESULT"]
    const idx = steps.indexOf(step)
    return (
        <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {i + 1}
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`h-0.5 w-8 sm:w-12 rounded ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                </div>
            ))}
        </div>
    )
}

/* Light select */
function Select({ value, onChange, children, className = "" }: any) {
    return (
        <select
            value={value}
            onChange={onChange}
            className={`w-full h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        >
            {children}
        </select>
    )
}

/* Detail row for review/result */
function DetailRow({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${valueClass}`}>{value}</span>
        </div>
    )
}

export default function PaymentsPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [step, setStep] = useState<PaymentStep>("INPUT")

    const [fromAccountId, setFromAccountId] = useState("")
    const [toAccountNumber, setToAccountNumber] = useState("")
    const [resolvedAccount, setResolvedAccount] = useState<Account | null>(null)
    const [isResolving, setIsResolving] = useState(false)
    const [amount, setAmount] = useState("")
    const [fromCurrency, setFromCurrency] = useState("INR")
    const [toCurrency, setToCurrency] = useState("INR")
    const [exchangeRate, setExchangeRate] = useState<number | null>(null)
    const [isFetchingRate, setIsFetchingRate] = useState(false)
    const [speedMode, setSpeedMode] = useState("Standard")
    const [useAI, setUseAI] = useState(true)
    const [manualMethod, setManualMethod] = useState("card")
    const [transaction, setTransaction] = useState<any>(null)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState("")

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
            if (res.ok) {
                const data = await res.json()
                setAccounts(data)
                if (data.length > 0) setFromAccountId(data[0].id)
            }
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    const handleLookup = async () => {
        if (!toAccountNumber) return
        setIsResolving(true); setError(""); setResolvedAccount(null)
        try {
            const res = await fetch(`${API_BASE}/payments/lookup/${toAccountNumber}`)
            if (res.ok) setResolvedAccount(await res.json())
            else setError("Account not found")
        } catch { setError("Failed to verify account") } finally { setIsResolving(false) }
    }

    const fetchExchangeRate = async (base: string, target: string) => {
        if (base === target) { setExchangeRate(1); return }
        setIsFetchingRate(true)
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`)
            const data = await res.json()
            setExchangeRate(data?.rates?.[target] ?? null)
        } catch { setExchangeRate(null) } finally { setIsFetchingRate(false) }
    }

    useEffect(() => { fetchExchangeRate(fromCurrency, toCurrency) }, [fromCurrency, toCurrency])

    const handleInitiate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!toAccountNumber) { setError("Please enter a receiver account number"); return }
        setProcessing(true); setError(""); setTransaction(null)
        try {
            const targetAccountId = resolvedAccount ? resolvedAccount.id : toAccountNumber
            const isCrossBorder = fromCurrency !== toCurrency
            let finalMethod = useAI ? null : manualMethod
            if (isCrossBorder && !useAI && finalMethod === "upi") {
                setError("UPI cannot be used for cross-border payments."); setProcessing(false); return
            }
            const payload = { from_account_id: fromAccountId, to_account_id: targetAccountId, amount: parseFloat(amount), currency: fromCurrency, target_currency: toCurrency, method: finalMethod, auto_pick_method: useAI, need_instant: speedMode !== "Standard", speed_mode: speedMode }
            const initRes = await fetch(`${API_BASE}/payments/initiate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            if (!initRes.ok) { const e = await initRes.json(); throw new Error(e.detail || "Initiation failed") }
            setTransaction(await initRes.json()); setStep("REVIEW")
        } catch (err: any) { setError(err.message) } finally { setProcessing(false) }
    }

    const handleConfirm = async () => {
        if (!transaction) return
        setProcessing(true); setError("")
        try {
            const confirmRes = await fetch(`${API_BASE}/payments/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_id: transaction.transaction_id }) })
            if (!confirmRes.ok) throw new Error("Confirmation failed")
            setResult(await confirmRes.json()); setStep("RESULT")
        } catch (err: any) { setError(err.message) } finally { setProcessing(false) }
    }

    const resetForm = () => { setResult(null); setTransaction(null); setAmount(""); setResolvedAccount(null); setToAccountNumber(""); setStep("INPUT") }

    if (loading) return <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>

    const currSymbol = (c: string) => c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : "₹"

    return (
        <PageShell title="Send Money">
            <StepBar step={step} />

            {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
            )}

            {/* RESULT */}
            {step === "RESULT" && result ? (
                <div className="card-base p-8 text-center">
                    <div className={`h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center ${result.status === "COMPLETED" ? "bg-emerald-50" : "bg-red-50"}`}>
                        {result.status === "COMPLETED"
                            ? <CheckCircle className="h-8 w-8 text-emerald-500" />
                            : <AlertTriangle className="h-8 w-8 text-red-500" />}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                        Payment {result.status === "COMPLETED" ? "Successful" : "Failed"}
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">Transaction details</p>

                    <div className="text-left bg-gray-50 rounded-xl p-4 mb-6">
                        <DetailRow label="Transaction ID" value={<span className="font-mono text-xs">{result.transaction_id?.slice(0, 16)}...</span>} />
                        <DetailRow label="Amount" value={`${currSymbol(result.currency)}${result.amount} ${result.currency}`} />
                        <DetailRow label="Method" value={result.method?.replace("_", " ")} valueClass="capitalize text-blue-600" />
                        {result.metadata?.failure_reason && <DetailRow label="Reason" value={result.metadata.failure_reason} valueClass="text-red-500" />}
                    </div>

                    <Button onClick={resetForm} className="w-full rounded-xl" size="lg">Make Another Payment</Button>
                    <Link href="/dashboard"><Button variant="ghost" className="w-full mt-2" size="lg">Back to Home</Button></Link>
                </div>
            ) : step === "REVIEW" && transaction ? (
                /* REVIEW */
                <div className="card-base p-6">
                    <h2 className="font-bold text-gray-900 text-lg mb-1">Review Payment</h2>
                    <p className="text-sm text-gray-400 mb-5">Confirm AI-selected details before sending.</p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-5">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                        <p className="text-3xl font-extrabold text-gray-900">{currSymbol(transaction.currency || fromCurrency)}{transaction.amount}</p>

                        {fromCurrency !== toCurrency && exchangeRate && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-400">Recipient gets approx.</p>
                                <p className="font-bold text-emerald-600">{(parseFloat(transaction.amount) * exchangeRate).toFixed(2)} {toCurrency}</p>
                                <p className="text-xs text-gray-400">Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}</p>
                            </div>
                        )}
                    </div>

                    <div className="mb-5">
                        <DetailRow label="To Account" value={<span className="font-mono text-xs">{resolvedAccount?.account_number || transaction.to_account_id?.slice(0,12)}...</span>} />
                        <DetailRow label="Speed" value={transaction.speed_mode || speedMode} valueClass="text-amber-600" />
                        <DetailRow
                            label="Payment Method"
                            value={
                                <span className="flex items-center gap-2 capitalize">
                                    {transaction.method?.replace("_", " ")}
                                    <span className="badge badge-blue">{useAI ? "AI" : "Manual"}</span>
                                </span>
                            }
                        />
                    </div>

                    <div className="grid gap-3">
                        <Button onClick={handleConfirm} className="w-full" size="lg" disabled={processing}>
                            {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            Confirm & Pay
                        </Button>
                        <Button variant="outline" onClick={() => { setUseAI(false); setStep("INPUT") }} className="w-full" disabled={processing}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Change Method
                        </Button>
                    </div>
                </div>
            ) : (
                /* INPUT */
                <form onSubmit={handleInitiate} className="space-y-5">
                    {/* From */}
                    <div className="card-base p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">From</h3>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Account</label>
                            <Select value={fromAccountId} onChange={(e: any) => setFromAccountId(e.target.value)}>
                                {accounts.map(acc => {
                                    let d = acc.id.slice(0, 8) + "..."
                                    if (acc.account_type === "UPI") d = acc.upi_id || d
                                    else if (acc.account_type === "NET_BANKING") d = "A/C ****" + (acc.account_number?.slice(-4) || "")
                                    else if (acc.account_type === "CARD") d = "**** " + (acc.account_number?.slice(-4) || "")
                                    else if (acc.account_type === "CRYPTO") d = "Wallet " + (acc.wallet_address?.slice(0, 6) || "")
                                    return <option key={acc.id} value={acc.id}>{acc.account_type}: {d} (₹{acc.balance})</option>
                                })}
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {resolvedAccount?.account_type !== "CRYPTO" && (
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Currency</label>
                                    <Select value={fromCurrency} onChange={(e: any) => setFromCurrency(e.target.value)}>
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </Select>
                                </div>
                            )}
                            <div className={resolvedAccount?.account_type === "CRYPTO" ? "col-span-2" : ""}>
                                <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required className="text-lg font-bold" />
                            </div>
                        </div>
                        {fromCurrency !== toCurrency && amount && resolvedAccount?.account_type !== "CRYPTO" && (
                            <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex justify-between items-center">
                                <span className="text-xs text-gray-500">Recipient gets</span>
                                {isFetchingRate ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> :
                                    exchangeRate ? <span className="text-sm font-bold text-emerald-600">{(parseFloat(amount) * exchangeRate).toFixed(2)} {toCurrency}</span> :
                                        <span className="text-xs text-red-400">Rate unavailable</span>}
                            </div>
                        )}
                    </div>

                    {/* To */}
                    <div className="card-base p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">To</h3>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Recipient Identifier (UPI / Card / Wallet)</label>
                            <div className="flex gap-2">
                                <Input placeholder="e.g. john@upi" value={toAccountNumber} onChange={(e) => { setToAccountNumber(e.target.value); setResolvedAccount(null) }} required />
                                <Button type="button" onClick={handleLookup} variant="outline" disabled={isResolving || !toAccountNumber} className="px-3">
                                    {isResolving ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                            {resolvedAccount && (
                                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                                    <CheckCircle className="h-3.5 w-3.5" /> Verified · {resolvedAccount.account_type?.replace("_", " ")}
                                </div>
                            )}
                        </div>
                        {resolvedAccount?.account_type !== "CRYPTO" && (
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Currency</label>
                                <Select value={toCurrency} onChange={(e: any) => setToCurrency(e.target.value)}>
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="card-base p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">Options</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Speed</label>
                                <Select value={speedMode} onChange={(e: any) => setSpeedMode(e.target.value)}>
                                    <option>Standard</option>
                                    <option>Priority</option>
                                    <option>Express</option>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Routing</label>
                                <button
                                    type="button"
                                    onClick={() => setUseAI(!useAI)}
                                    className={`w-full h-10 rounded-xl border text-sm font-semibold transition-colors ${useAI ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                                >
                                    {useAI ? "⚡ AI Routing" : "Manual"}
                                </button>
                            </div>
                        </div>
                        {!useAI && (
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Method</label>
                                <Select value={manualMethod} onChange={(e: any) => setManualMethod(e.target.value)}>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Net Banking</option>
                                    <option value="crypto">Crypto</option>
                                    {fromCurrency === toCurrency && <option value="upi">UPI</option>}
                                </Select>
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full rounded-xl" size="lg" disabled={processing || !toAccountNumber || !amount}>
                        {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <>Review Payment <ArrowRight className="ml-2 h-4 w-4" /></>}
                    </Button>
                </form>
            )}
        </PageShell>
    )
}
