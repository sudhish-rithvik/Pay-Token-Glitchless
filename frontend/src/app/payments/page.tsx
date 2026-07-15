"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { ArrowLeft, Search, CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface User { id: string; username: string }
interface Account { id: string; balance: number; account_type: string; account_number?: string; upi_id?: string; wallet_address?: string }
type Step = "recipient" | "amount" | "routing" | "confirm" | "success" | "failed"

const RECENT = [
  { name: "Nandhini",  id: "nandhini@oksbi",  color: "#7C3AED" },
  { name: "Raakesh",   id: "raakesh@paytm",   color: "#059669" },
  { name: "Dijo",      id: "dijo@okicici",    color: "#3B5BDB" },
  { name: "Hema",      id: "hema@okaxis",     color: "#DB2777" },
]

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" }

export default function PaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Flow state
  const [step, setStep] = useState<Step>("recipient")
  const [recipient, setRecipient] = useState<typeof RECENT[0] | null>(null)
  const [search, setSearch] = useState("")
  const [resolvedAccount, setResolvedAccount] = useState<Account | null>(null)
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [fromAccountId, setFromAccountId] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [processing, setProcessing] = useState(false)
  const [transaction, setTransaction] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [showRouteDetail, setShowRouteDetail] = useState(false)
  const [routeMsg, setRouteMsg] = useState("Analyzing payment options...")
  const [routeDone, setRouteDone] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState("")

  // Rail scores (simulated)
  const [rails] = useState([
    { label: "IMPS", desc: "Instant · ₹0 fee", score: 0.94, selected: true },
    { label: "NEFT", desc: "~2 hrs · ₹0 fee",  score: 0.78, selected: false },
    { label: "UPI",  desc: "Instant · ₹2 fee",  score: 0.61, selected: false },
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) { router.push("/login"); return }
    const u = JSON.parse(userData)
    setUser(u)
    fetch(`${API_BASE}/accounts/${u.id}`)
      .then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          setAccounts(data)
          if (data.length > 0) setFromAccountId(data[0].id)
        }
      }).catch(() => {}).finally(() => setLoading(false))
  }, [router])

  const fromAccount = accounts.find(a => a.id === fromAccountId)

  // Routing animation
  const runRouting = () => {
    setRouteDone(false)
    setRouteMsg("Analyzing payment options...")
    const msgs = [
      "Analyzing payment options...",
      "Evaluating rail scores...",
      "Checking network availability...",
      "Best route selected",
    ]
    let i = 0
    const t = setInterval(() => {
      i++
      if (i < msgs.length) {
        setRouteMsg(msgs[i])
      } else {
        setRouteMsg("Best route selected")
        setRouteDone(true)
        clearInterval(t)
      }
    }, 700)
  }

  const handleRecipientSelect = async (r: typeof RECENT[0]) => {
    setRecipient(r)
    setToAccountId(r.id)
    // Try to resolve
    try {
      const res = await fetch(`${API_BASE}/payments/lookup/${r.id}`)
      if (res.ok) setResolvedAccount(await res.json())
    } catch {}
    setStep("amount")
  }

  const handleAmountContinue = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return }
    setError("")
    setProcessing(true)
    try {
      const payload = {
        from_account_id: fromAccountId,
        to_account_id: resolvedAccount?.id ?? toAccountId,
        amount: parseFloat(amount),
        currency,
        target_currency: currency,
        method: null,
        auto_pick_method: true,
        need_instant: true,
        speed_mode: "Express",
      }
      const res = await fetch(`${API_BASE}/payments/initiate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail ?? "Failed") }
      setTransaction(await res.json())
    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
      return
    }
    setProcessing(false)
    setStep("routing")
    runRouting()
  }

  const handleConfirmStep = () => setStep("confirm")

  const handleHoldStart = () => {
    holdRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdRef.current!)
          handlePay()
          return 100
        }
        return p + 4
      })
    }, 50)
  }

  const handleHoldEnd = () => {
    if (holdRef.current) clearInterval(holdRef.current)
    if (holdProgress < 100) setHoldProgress(0)
  }

  const handlePay = async () => {
    if (!transaction) return
    setProcessing(true)
    try {
      const res = await fetch(`${API_BASE}/payments/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transaction.transaction_id }),
      })
      if (!res.ok) throw new Error("Confirmation failed")
      const data = await res.json()
      setResult(data)
      setStep(data.status === "COMPLETED" ? "success" : "failed")
    } catch (err: any) {
      setError(err.message)
      setStep("failed")
    } finally {
      setProcessing(false)
    }
  }

  const reset = () => {
    setStep("recipient"); setRecipient(null); setAmount("")
    setNote(""); setTransaction(null); setResult(null)
    setHoldProgress(0); setError(""); setRouteDone(false)
  }

  const sym = CURRENCY_SYMBOL[currency] ?? "₹"

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }} className="page-enter">
      {/* Header */}
      {step !== "success" && step !== "failed" && (
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid var(--border)", background: "var(--surface)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          {step === "recipient" ? (
            <Link href="/home" style={{ color: "var(--text-primary)", display: "flex" }}><ArrowLeft size={22} /></Link>
          ) : (
            <button onClick={() => {
              if (step === "amount") setStep("recipient")
              else if (step === "routing") setStep("amount")
              else if (step === "confirm") setStep("routing")
            }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", display: "flex", padding: 0 }}>
              <ArrowLeft size={22} />
            </button>
          )}
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
              {step === "recipient" && "Pay"}
              {step === "amount" && "Enter Amount"}
              {step === "routing" && "Smart Routing"}
              {step === "confirm" && "Confirm Payment"}
            </span>
          </div>
          <div style={{ width: 22 }} />
        </div>
      )}

      {/* ── STEP: RECIPIENT ── */}
      {step === "recipient" && (
        <div style={{ padding: "24px 20px", flex: 1 }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              className="t-input"
              style={{ paddingLeft: 44 }}
              placeholder="Search name or Token ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Recent */}
          <div style={{ marginBottom: 8 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Recent</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {RECENT.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                <button key={c.id} onClick={() => handleRecipientSelect(c)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  borderBottom: "1px solid var(--border)", fontFamily: "inherit", width: "100%",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0,
                    boxShadow: `0 4px 12px ${c.color}44`,
                  }}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{c.id}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual entry */}
          {search && (
            <button onClick={() => {
              setRecipient({ name: search, id: search, color: "#3B5BDB" })
              setToAccountId(search)
              setStep("amount")
            }} style={{
              width: "100%", padding: "14px 20px", background: "var(--accent-subtle)",
              border: "1px solid rgba(59,91,219,0.2)", borderRadius: 16,
              color: "var(--accent)", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>➔</span> Pay to &quot;{search}&quot;
            </button>
          )}

          {/* Scan QR */}
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <button style={{
              background: "none", border: "none", color: "var(--accent)", fontSize: 14,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>⊡</span> Scan QR Code
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: AMOUNT ── */}
      {step === "amount" && recipient && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 20px 24px" }}>
          {/* Recipient */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 12 }}>Paying</div>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", background: recipient.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 24, margin: "0 auto 10px",
              boxShadow: `0 8px 24px ${recipient.color}55`,
            }}>
              {recipient.name.charAt(0)}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{recipient.name}</div>
          </div>

          {/* Amount */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: "var(--text-tertiary)" }}>{sym}</span>
              <input
                className="amount-input"
                style={{ width: "auto", minWidth: 80 }}
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ width: 120, height: 2, background: "var(--border)", borderRadius: 1, marginBottom: 24 }} />

            {/* Currency */}
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{
              background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "6px 12px", fontSize: 13, color: "var(--text-primary)", marginBottom: 20, fontFamily: "inherit",
            }}>
              {["INR", "USD", "EUR", "GBP"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Note */}
            <input
              className="t-input"
              placeholder="Add a note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ marginBottom: 20, textAlign: "center", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", borderRadius: 0, fontSize: 14, color: "var(--text-secondary)" }}
            />
          </div>

          {/* From account */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>From</div>
            <select
              value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}
              style={{
                width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "var(--text-primary)",
                fontFamily: "inherit", appearance: "none",
              }}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_type}: {acc.upi_id ?? (acc.account_number ? `****${acc.account_number.slice(-4)}` : acc.id.slice(0, 8))} — ₹{acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{error}</div>}

          <button onClick={handleAmountContinue} disabled={processing || !amount} style={{
            height: 56, borderRadius: 999, background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
            border: "none", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", boxShadow: "0 4px 20px var(--accent-glow)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: !amount ? 0.5 : 1,
          }}>
            {processing ? <Loader2 size={20} style={{ animation: "spin 0.8s linear infinite" }} /> : "Continue"}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── STEP: ROUTING ── */}
      {step === "routing" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          {!routeDone ? (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                <div className="route-dot" />
                <div className="route-dot" />
                <div className="route-dot" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Optimizing payment…</div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{routeMsg}</div>
            </>
          ) : (
            <div className="slide-up" style={{ width: "100%", maxWidth: 340 }}>
              {/* Success route */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-subtle)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={28} style={{ color: "var(--success)" }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 4 }}>Best route selected</div>
                <div style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Instant · ₹0 fee</div>
              </div>

              {/* Route summary */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Payment route</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>IMPS</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Estimated time</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Instant</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Fee</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>₹0</span>
                </div>
              </div>

              {/* Advanced toggle */}
              <button onClick={() => setShowRouteDetail(!showRouteDetail)} style={{
                background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, margin: "0 auto 24px",
              }}>
                Payment details {showRouteDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showRouteDetail && (
                <div className="slide-up" style={{ background: "var(--surface-2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase", fontSize: 10 }}>Rail analysis</div>
                  {rails.map(r => (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 40, fontSize: 12, fontWeight: 700, color: r.selected ? "var(--accent)" : "var(--text-tertiary)" }}>{r.label}</div>
                      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.score * 100}%`, background: r.selected ? "var(--accent)" : "var(--border-strong)", borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", width: 30, textAlign: "right" }}>{(r.score * 100).toFixed(0)}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, color: "var(--text-tertiary)", fontFamily: "monospace", fontSize: 10 }}>
                    PAY_TOKEN repr. · Route latency: ~{Math.round(80 + Math.random() * 60)}ms
                  </div>
                </div>
              )}

              <button onClick={handleConfirmStep} style={{
                width: "100%", height: 56, borderRadius: 999,
                background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
                border: "none", color: "#fff", fontSize: 17, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 20px var(--accent-glow)",
              }}>
                Review &amp; Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: CONFIRM ── */}
      {step === "confirm" && recipient && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          {/* Recipient */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: recipient.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 28, marginBottom: 16,
            boxShadow: `0 8px 28px ${recipient.color}55`,
          }}>
            {recipient.name.charAt(0)}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{recipient.name}</div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", margin: "20px 0 4px" }}>
            {sym}{parseFloat(amount).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 32 }}>
            {fromAccount?.account_type ?? "Primary Account"}
          </div>

          {/* Details */}
          <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "4px 20px", marginBottom: 32 }}>
            {[
              { label: "Route", value: "IMPS (Smart)", color: "var(--accent)" },
              { label: "Speed", value: "Instant" },
              { label: "Fee", value: "₹0", color: "var(--success)" },
              ...(note ? [{ label: "Note", value: note }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: (row as any).color ?? "var(--text-primary)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          {/* Hold to Pay */}
          <div style={{ width: "100%", marginBottom: 12 }}>
            <div
              className="btn-hold"
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
            >
              <div className="btn-hold-fill" style={{ width: `${holdProgress}%` }} />
              <span style={{ position: "relative", zIndex: 1 }}>
                {processing ? "Processing…" : holdProgress === 100 ? "Confirmed!" : "Hold to Pay"}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🔒</span> Confirm with Face ID
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {step === "success" && recipient && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div className="success-ring" style={{
            width: 96, height: 96, borderRadius: "50%", background: "var(--success-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28,
            boxShadow: "0 0 0 16px rgba(34,197,94,0.08)",
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path className="check-draw" d="M12 22l8 8 14-16" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>Paid</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", marginBottom: 4 }}>
            {sym}{parseFloat(amount).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 15, color: "var(--text-tertiary)", marginBottom: 40 }}>to {recipient.name}</div>

          {/* Receipt */}
          <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "4px 20px", marginBottom: 32 }}>
            {[
              { label: "Transaction ID", value: result?.transaction_id?.slice(0, 16) + "…", mono: true },
              { label: "Method", value: result?.method?.replace("_", " ") ?? "IMPS" },
              { label: "Status", value: "Completed", color: "var(--success)" },
              { label: "Fee", value: "₹0", color: "var(--success)" },
              { label: "Timestamp", value: new Date().toLocaleTimeString() },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: (r as any).color ?? "var(--text-primary)", fontFamily: (r as any).mono ? "monospace" : "inherit", fontSize: (r as any).mono ? "11px" : "13px" }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
            <button onClick={reset} style={{
              height: 52, borderRadius: 999, background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Done</button>
            <button style={{
              height: 52, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Share</button>
          </div>
        </div>
      )}

      {/* ── FAILED ── */}
      {step === "failed" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--danger-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <AlertTriangle size={36} style={{ color: "var(--danger)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Payment Failed</div>
          <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40, textAlign: "center" }}>
            {error || result?.metadata?.failure_reason || "Something went wrong. Please try again."}
          </div>
          <button onClick={reset} style={{
            width: "100%", height: 52, borderRadius: 999, background: "var(--accent)",
            border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>Try Again</button>
        </div>
      )}
    </div>
  )
}
