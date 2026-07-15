"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle, Copy, ChevronDown, ExternalLink } from "lucide-react"

interface User { id: string; username: string }
interface Account {
  id: string; balance: number; account_type: string
  account_number?: string; upi_id?: string; wallet_address?: string
  bank_name?: string; ifsc?: string; network?: string
}

type TransferType = "BANK_BANK" | "BANK_CRYPTO" | "CRYPTO_BANK" | "CARD_BANK"
type TransferMode = "NEFT" | "IMPS" | "RTGS"
type Step = "type" | "details" | "review" | "processing" | "success" | "failed"

const TRANSFER_TYPES: { id: TransferType; label: string; from: string; to: string; icon: string; desc: string }[] = [
  { id: "BANK_BANK",   label: "Bank → Bank",   from: "NET_BANKING", to: "bank",   icon: "🏦", desc: "NEFT / IMPS / RTGS transfers" },
  { id: "BANK_CRYPTO", label: "Bank → Crypto",  from: "NET_BANKING", to: "crypto", icon: "₿", desc: "Fund your crypto wallet" },
  { id: "CRYPTO_BANK", label: "Crypto → Bank",  from: "CRYPTO",      to: "bank",   icon: "🔄", desc: "Withdraw crypto to bank" },
  { id: "CARD_BANK",   label: "Card → Bank",    from: "CARD",        to: "bank",   icon: "💳", desc: "Transfer from card to bank" },
]

const MODES: { id: TransferMode; label: string; desc: string; fee: string; time: string }[] = [
  { id: "IMPS", label: "IMPS",  desc: "Immediate Payment Service", fee: "₹5",    time: "Instant (24×7)" },
  { id: "NEFT", label: "NEFT",  desc: "National Electronic Funds Transfer", fee: "₹2.50", time: "2–4 hours" },
  { id: "RTGS", label: "RTGS",  desc: "Real Time Gross Settlement", fee: "₹25",   time: "Instant (business hours)" },
]

const NETWORKS = ["Ethereum (ERC-20)", "Polygon", "Solana", "BNB Smart Chain"]
const CURRENCIES = ["INR", "USD", "EUR", "GBP"]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{
      width: "100%", height: 48, borderRadius: 12, padding: "0 14px",
      background: "var(--surface-2)", border: "1.5px solid transparent",
      color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", outline: "none",
      transition: "border-color 0.15s, box-shadow 0.15s",
      ...(props.style ?? {}),
    }}
      onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)" }}
      onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.boxShadow = "none" }}
    />
  )
}

function TSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{
      width: "100%", height: 48, borderRadius: 12, padding: "0 14px",
      background: "var(--surface-2)", border: "1.5px solid transparent",
      color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", outline: "none",
      appearance: "none", cursor: "pointer",
    }}>
      {children}
    </select>
  )
}

export default function TransferPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>("type")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  // Transfer config
  const [transferType, setTransferType] = useState<TransferType>("BANK_BANK")
  const [fromAccountId, setFromAccountId] = useState("")
  const [transferMode, setTransferMode] = useState<TransferMode>("IMPS")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")

  // Destination — Bank fields
  const [destAccNumber, setDestAccNumber] = useState("")
  const [destIfsc, setDestIfsc] = useState("")
  const [destBankName, setDestBankName] = useState("")
  const [destBranch, setDestBranch] = useState("")
  const [destHolderName, setDestHolderName] = useState("")

  // Destination — Crypto fields
  const [destWalletAddr, setDestWalletAddr] = useState("")
  const [destNetwork, setDestNetwork] = useState(NETWORKS[0])
  const [destToken, setDestToken] = useState("ETH")

  // Result
  const [txId, setTxId] = useState("")
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState("")
  const [holdProgress, setHoldProgress] = useState(0)
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const eligibleSources = accounts.filter(a => {
    const tt = TRANSFER_TYPES.find(t => t.id === transferType)
    return a.account_type === tt?.from
  })

  const selectedMode = MODES.find(m => m.id === transferMode)!
  const tt = TRANSFER_TYPES.find(t => t.id === transferType)!

  const isDestBank = tt.to === "bank"
  const isDestCrypto = tt.to === "crypto"

  const canProceed = () => {
    if (!amount || parseFloat(amount) <= 0) return false
    if (!fromAccountId) return false
    if (isDestBank) {
      if (!destAccNumber || !destIfsc || !destHolderName) return false
    } else {
      if (!destWalletAddr) return false
    }
    return true
  }

  const handleHoldStart = () => {
    holdRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdRef.current!)
          handleExecuteTransfer()
          return 100
        }
        return p + 3.5
      })
    }, 50)
  }

  const handleHoldEnd = () => {
    if (holdRef.current) clearInterval(holdRef.current)
    if (holdProgress < 100) setHoldProgress(0)
  }

  const runProcessingAnimation = async () => {
    const msgs = [
      "Validating account details...",
      "Verifying IFSC code...",
      "Initiating PAY_TOKEN representation...",
      "Routing through " + transferMode + " rail...",
      "Compliance & risk check...",
      "Submitting to payment network...",
      "Transfer submitted successfully",
    ]
    for (const msg of msgs) {
      setProcessingMsg(msg)
      await new Promise(r => setTimeout(r, 600))
    }
  }

  const handleExecuteTransfer = async () => {
    if (!fromAccountId) return
    setProcessing(true)
    setStep("processing")

    // Run the animation alongside the API call
    runProcessingAnimation()

    try {
      const destId = isDestBank
        ? `BANK_${destAccNumber.slice(-6)}_${destIfsc}`
        : `CRYPTO_${destWalletAddr.slice(2, 10)}_${destNetwork.split(" ")[0]}`

      const payload = {
        from_account_id: fromAccountId,
        to_account_id: destId,
        amount: parseFloat(amount),
        currency,
        target_currency: currency,
        method: transferMode.toLowerCase().replace("imps", "bank_transfer").replace("neft", "bank_transfer").replace("rtgs", "bank_transfer"),
        auto_pick_method: false,
        need_instant: transferMode === "IMPS" || transferMode === "RTGS",
        speed_mode: transferMode === "IMPS" ? "Express" : "Standard",
      }
      const initRes = await fetch(`${API_BASE}/payments/initiate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      if (!initRes.ok) { const e = await initRes.json(); throw new Error(e.detail ?? "Initiation failed") }
      const tx = await initRes.json()

      const confirmRes = await fetch(`${API_BASE}/payments/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: tx.transaction_id }),
      })
      if (!confirmRes.ok) throw new Error("Confirmation failed")
      const confirmed = await confirmRes.json()

      // Wait for animation to finish
      await new Promise(r => setTimeout(r, 800))
      setTxId(confirmed.transaction_id ?? tx.transaction_id)
      setStep(confirmed.status === "COMPLETED" ? "success" : "failed")
    } catch (err: any) {
      await new Promise(r => setTimeout(r, 600))
      setError(err.message)
      setStep("failed")
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(""), 2000)
  }

  const reset = () => {
    setStep("type"); setAmount(""); setError(""); setHoldProgress(0)
    setDestAccNumber(""); setDestIfsc(""); setDestBankName(""); setDestBranch("")
    setDestHolderName(""); setDestWalletAddr(""); setTxId("")
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }} className="page-enter">

      {/* Header */}
      {step !== "success" && step !== "failed" && step !== "processing" && (
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid var(--border)", background: "var(--surface)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          {step === "type" ? (
            <Link href="/home" style={{ color: "var(--text-primary)", display: "flex" }}><ArrowLeft size={22} /></Link>
          ) : (
            <button onClick={() => {
              if (step === "details") setStep("type")
              else if (step === "review") setStep("details")
            }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", display: "flex", padding: 0 }}>
              <ArrowLeft size={22} />
            </button>
          )}
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
              {step === "type"    && "Transfer"}
              {step === "details" && "Transfer Details"}
              {step === "review"  && "Review Transfer"}
            </span>
          </div>
          <div style={{ width: 22 }} />
        </div>
      )}

      {/* Progress bar */}
      {["type", "details", "review"].includes(step) && (
        <div style={{ height: 3, background: "var(--surface-2)" }}>
          <div style={{
            height: "100%", background: "var(--accent)", borderRadius: 2, transition: "width 0.4s",
            width: step === "type" ? "33%" : step === "details" ? "66%" : "100%",
          }} />
        </div>
      )}

      <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }}>

        {/* ── STEP 1: TRANSFER TYPE ── */}
        {step === "type" && (
          <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Bank Transfer</div>
              <div style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Move money across accounts with full banking details.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
              {TRANSFER_TYPES.map(t => (
                <button key={t.id} onClick={() => setTransferType(t.id)} style={{
                  padding: "18px 14px", borderRadius: 18, cursor: "pointer", fontFamily: "inherit",
                  background: transferType === t.id ? "var(--accent-subtle)" : "var(--surface)",
                  border: `2px solid ${transferType === t.id ? "var(--accent)" : "var(--border)"}`,
                  textAlign: "left", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: transferType === t.id ? "var(--accent)" : "var(--text-primary)", marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Transfer Mode */}
            <Field label="Transfer Mode">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODES.map(m => (
                  <button key={m.id} onClick={() => setTransferMode(m.id)} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                    background: transferMode === m.id ? "var(--accent-subtle)" : "var(--surface)",
                    border: `1.5px solid ${transferMode === m.id ? "var(--accent)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${transferMode === m.id ? "var(--accent)" : "var(--border-strong)"}`,
                      background: transferMode === m.id ? "var(--accent)" : "transparent",
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: transferMode === m.id ? "var(--accent)" : "var(--text-primary)" }}>
                        {m.label} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)" }}>— {m.desc}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                        {m.time} · Fee: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{m.fee}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            <button onClick={() => setStep("details")} style={{
              width: "100%", height: 56, borderRadius: 999, marginTop: 16,
              background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
              border: "none", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", boxShadow: "0 4px 20px var(--accent-glow)",
            }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: DETAILS ── */}
        {step === "details" && (
          <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>{tt.label}</div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{tt.desc} · {selectedMode.label}</div>
            </div>

            {/* Source Account */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Source Account</div>

              {eligibleSources.length === 0 ? (
                <div style={{ color: "var(--danger)", fontSize: 13, padding: "8px 0" }}>
                  No {tt.from.replace("_", " ")} accounts found. <Link href="/accounts" style={{ color: "var(--accent)" }}>Add one</Link>
                </div>
              ) : (
                <TSelect value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
                  {eligibleSources.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type === "NET_BANKING" && `${acc.bank_name ?? "Bank"} — ****${acc.account_number?.slice(-4)}`}
                      {acc.account_type === "CARD" && `Card — ****${acc.account_number?.slice(-4)}`}
                      {acc.account_type === "CRYPTO" && `${acc.network ?? "Crypto"} — ${acc.wallet_address?.slice(0, 10)}...`}
                      {" "}(₹{acc.balance.toFixed(2)})
                    </option>
                  ))}
                </TSelect>
              )}

              {fromAccount && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 12, fontSize: 12 }}>
                  {fromAccount.account_type === "NET_BANKING" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><div style={{ color: "var(--text-tertiary)", marginBottom: 2 }}>Account No.</div><div style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 600 }}>****{fromAccount.account_number?.slice(-4)}</div></div>
                      <div><div style={{ color: "var(--text-tertiary)", marginBottom: 2 }}>IFSC</div><div style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 600 }}>{fromAccount.ifsc ?? "—"}</div></div>
                      <div><div style={{ color: "var(--text-tertiary)", marginBottom: 2 }}>Bank</div><div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fromAccount.bank_name ?? "—"}</div></div>
                      <div><div style={{ color: "var(--text-tertiary)", marginBottom: 2 }}>Balance</div><div style={{ color: "var(--success)", fontWeight: 700 }}>₹{fromAccount.balance.toFixed(2)}</div></div>
                    </div>
                  )}
                  {fromAccount.account_type === "CRYPTO" && (
                    <div>
                      <div style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>Wallet Address</div>
                      <div style={{ fontFamily: "monospace", color: "var(--text-primary)", wordBreak: "break-all", fontSize: 11 }}>{fromAccount.wallet_address}</div>
                      <div style={{ marginTop: 8, color: "var(--text-tertiary)" }}>Network: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fromAccount.network}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Amount</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <TInput
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}
                />
                <TSelect value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 100 }}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </TSelect>
              </div>
              {fromAccount && amount && parseFloat(amount) > fromAccount.balance && (
                <div style={{ marginTop: 8, color: "var(--danger)", fontSize: 12 }}>⚠ Exceeds available balance (₹{fromAccount.balance.toFixed(2)})</div>
              )}
            </div>

            {/* Destination */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                {isDestBank ? "Beneficiary Bank Details" : "Destination Wallet"}
              </div>

              {isDestBank && (
                <>
                  <Field label="Account Holder Name">
                    <TInput placeholder="Full name as per bank records" value={destHolderName} onChange={e => setDestHolderName(e.target.value)} />
                  </Field>
                  <Field label="Account Number">
                    <TInput placeholder="e.g. 123456789012" value={destAccNumber} onChange={e => setDestAccNumber(e.target.value)} style={{ fontFamily: "monospace" }} />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="IFSC Code">
                      <TInput placeholder="ABCD0123456" value={destIfsc} onChange={e => setDestIfsc(e.target.value.toUpperCase())} style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />
                    </Field>
                    <Field label="Bank Name">
                      <TInput placeholder="State Bank of India" value={destBankName} onChange={e => setDestBankName(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Branch (Optional)">
                    <TInput placeholder="Branch name or city" value={destBranch} onChange={e => setDestBranch(e.target.value)} />
                  </Field>

                  {/* IFSC quick info */}
                  {destIfsc.length === 11 && (
                    <div style={{ marginTop: -8, padding: "10px 12px", background: "var(--accent-subtle)", borderRadius: 10, fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={13} /> IFSC format valid · {destIfsc.slice(0, 4)} bank
                    </div>
                  )}
                </>
              )}

              {isDestCrypto && (
                <>
                  <Field label="Wallet Address">
                    <TInput
                      placeholder="0x... or base58..."
                      value={destWalletAddr}
                      onChange={e => setDestWalletAddr(e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Network">
                      <TSelect value={destNetwork} onChange={e => setDestNetwork(e.target.value)}>
                        {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                      </TSelect>
                    </Field>
                    <Field label="Token">
                      <TInput placeholder="ETH / MATIC / SOL" value={destToken} onChange={e => setDestToken(e.target.value.toUpperCase())} />
                    </Field>
                  </div>
                  <div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.1)", borderRadius: 10, fontSize: 12, color: "#F59E0B", display: "flex", gap: 6 }}>
                    ⚠ Always verify the wallet address. Crypto transfers are irreversible.
                  </div>
                </>
              )}
            </div>

            {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              onClick={() => { if (canProceed()) setStep("review"); else setError("Please fill in all required fields") }}
              style={{
                width: "100%", height: 56, borderRadius: 999,
                background: canProceed() ? "linear-gradient(135deg,var(--accent),#5B7BEB)" : "var(--surface-2)",
                border: canProceed() ? "none" : "1px solid var(--border)",
                color: canProceed() ? "#fff" : "var(--text-tertiary)",
                fontSize: 17, fontWeight: 700, cursor: canProceed() ? "pointer" : "not-allowed",
                fontFamily: "inherit", boxShadow: canProceed() ? "0 4px 20px var(--accent-glow)" : "none",
                transition: "all 0.2s",
              }}
            >
              Review Transfer
            </button>
          </div>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === "review" && (
          <div className="page-enter">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>Total amount</div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.05em", color: "var(--text-primary)" }}>
                {currency === "INR" ? "₹" : currency === "USD" ? "$" : currency}{parseFloat(amount || "0").toLocaleString("en-IN")}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 14px", background: "var(--accent-subtle)", borderRadius: 999 }}>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{tt.label} · {selectedMode.label}</span>
              </div>
            </div>

            {/* Source details */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>From</div>
              {fromAccount?.account_type === "NET_BANKING" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { l: "Bank", v: fromAccount.bank_name ?? "—" },
                    { l: "Account", v: `****${fromAccount.account_number?.slice(-4)}` },
                    { l: "IFSC", v: fromAccount.ifsc ?? "—" },
                    { l: "Balance", v: `₹${fromAccount.balance.toFixed(2)}` },
                  ].map(r => (
                    <div key={r.l} style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              )}
              {fromAccount?.account_type === "CRYPTO" && (
                <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>WALLET</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "var(--text-primary)" }}>{fromAccount.wallet_address}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Network: {fromAccount.network}</div>
                </div>
              )}
            </div>

            {/* Destination details */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>To — Beneficiary Details</div>

              {isDestBank && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[
                    { l: "Account Holder", v: destHolderName, big: true },
                    { l: "Account Number", v: destAccNumber, mono: true },
                    { l: "IFSC Code", v: destIfsc, mono: true },
                    ...(destBankName ? [{ l: "Bank", v: destBankName }] : []),
                    ...(destBranch ? [{ l: "Branch", v: destBranch }] : []),
                  ].map(r => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{r.l}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: (r as any).big ? 15 : 13, fontWeight: (r as any).big ? 700 : 600, color: "var(--text-primary)", fontFamily: (r as any).mono ? "monospace" : "inherit" }}>
                          {r.v}
                        </span>
                        {(r as any).mono && (
                          <button onClick={() => copyToClipboard(r.v, r.l)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === r.l ? "var(--success)" : "var(--text-tertiary)", padding: 0 }}>
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isDestCrypto && (
                <div>
                  {[
                    { l: "Wallet Address", v: destWalletAddr, mono: true, long: true },
                    { l: "Network", v: destNetwork },
                    { l: "Token", v: destToken },
                  ].map(r => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0, marginRight: 12 }}>{r.l}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, textAlign: "right" }}>
                        <span style={{ fontSize: (r as any).long ? 11 : 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: (r as any).mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
                          {r.v}
                        </span>
                        {(r as any).mono && (
                          <button onClick={() => copyToClipboard(r.v, r.l)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === r.l ? "var(--success)" : "var(--text-tertiary)", padding: 0, flexShrink: 0 }}>
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fee & timeline */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Transfer Summary</div>
              {[
                { l: "Transfer mode", v: `${selectedMode.label} — ${selectedMode.desc}` },
                { l: "Estimated time", v: selectedMode.time, highlight: true },
                { l: "Fee", v: selectedMode.fee },
                { l: "Amount", v: `${currency === "INR" ? "₹" : currency}${parseFloat(amount || "0").toFixed(2)}` },
                { l: "You pay total", v: `${currency === "INR" ? "₹" : currency}${(parseFloat(amount || "0") + parseFloat(selectedMode.fee.replace("₹", "").replace(",", ""))).toFixed(2)}`, big: true },
              ].map(r => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{r.l}</span>
                  <span style={{ fontSize: (r as any).big ? 16 : 13, fontWeight: (r as any).big ? 800 : 600, color: (r as any).highlight ? "var(--accent)" : "var(--text-primary)" }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Hold to Transfer */}
            <div
              className="btn-hold"
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              style={{ marginBottom: 12 }}
            >
              <div className="btn-hold-fill" style={{ width: `${holdProgress}%` }} />
              <span style={{ position: "relative", zIndex: 1 }}>
                {holdProgress === 100 ? "Initiating…" : "Hold to Transfer"}
              </span>
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>🔒 Secured by TokenOne · Transfer ID generated on confirmation</div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
            <div style={{ position: "relative", marginBottom: 32 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent)",
                animation: "spin 1s linear infinite",
              }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⇄</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Processing Transfer</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", minHeight: 20 }}>{processingMsg}</div>

            <div style={{ marginTop: 40, width: "100%", maxWidth: 300 }}>
              {["Validating", "Routing", "Compliance", "Settlement"].map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? "var(--success-subtle)" : "var(--surface-2)", border: `2px solid ${i === 0 ? "var(--success)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i === 0 && <CheckCircle size={11} style={{ color: "var(--success)" }} />}
                  </div>
                  <span style={{ fontSize: 13, color: i === 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>{label}</span>
                </div>
              ))}
            </div>

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="page-enter" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48 }}>
            <div className="success-ring" style={{
              width: 96, height: 96, borderRadius: "50%", background: "var(--success-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
              boxShadow: "0 0 0 16px rgba(34,197,94,0.08)",
            }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <path className="check-draw" d="M12 22l8 8 14-16" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Transfer Initiated</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>
              {currency === "INR" ? "₹" : currency}{parseFloat(amount).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>{tt.label} · {selectedMode.label}</div>

            {/* Receipt */}
            <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 20px", marginBottom: 24 }}>
              <div style={{ padding: "16px 0 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Transfer Receipt</div>
              </div>
              {[
                { l: "Reference / UTR", v: txId.slice(0, 20) + "…", mono: true, copy: txId },
                { l: "Beneficiary", v: isDestBank ? destHolderName : destWalletAddr.slice(0, 12) + "…" },
                ...(isDestBank ? [
                  { l: "Account Number", v: destAccNumber, mono: true },
                  { l: "IFSC", v: destIfsc, mono: true },
                  { l: "Bank", v: destBankName || "—" },
                ] : [
                  { l: "Network", v: destNetwork },
                  { l: "Token", v: destToken },
                ]),
                { l: "Transfer Mode", v: `${selectedMode.label}` },
                { l: "Est. Credit Time", v: selectedMode.time },
                { l: "Fee Charged", v: selectedMode.fee },
                { l: "Status", v: "Submitted to Network", color: "var(--success)" },
                { l: "Initiated at", v: new Date().toLocaleString("en-IN") },
              ].map(r => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0, marginRight: 8 }}>{r.l}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: (r as any).color ?? "var(--text-primary)", fontFamily: (r as any).mono ? "monospace" : "inherit", textAlign: "right" }}>
                      {r.v}
                    </span>
                    {(r as any).copy && (
                      <button onClick={() => copyToClipboard((r as any).copy, r.l)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === r.l ? "var(--success)" : "var(--text-tertiary)", padding: 0 }}>
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", marginBottom: 16 }}>
              <button onClick={reset} style={{ height: 52, borderRadius: 999, background: "linear-gradient(135deg,var(--accent),#5B7BEB)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                New Transfer
              </button>
              <button style={{ height: 52, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ExternalLink size={15} /> Share
              </button>
            </div>
            <Link href="/activity" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>View in Activity →</Link>
          </div>
        )}

        {/* ── FAILED ── */}
        {step === "failed" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--danger-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <AlertTriangle size={36} style={{ color: "var(--danger)" }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Transfer Failed</div>
            <div style={{ fontSize: 14, color: "var(--text-tertiary)", textAlign: "center", marginBottom: 40, maxWidth: 280 }}>{error || "Something went wrong. Please try again."}</div>
            <button onClick={reset} style={{ width: "100%", height: 52, borderRadius: 999, background: "var(--accent)", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
