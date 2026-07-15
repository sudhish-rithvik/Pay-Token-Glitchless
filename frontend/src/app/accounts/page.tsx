"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle, X } from "lucide-react"

interface User { id: string; username: string }
interface Account {
  id: string; user_id: string; balance: number; account_type: string
  account_number?: string; cvv?: string; expiry_date?: string
  upi_id?: string; ifsc?: string; bank_name?: string
  wallet_address?: string; network?: string
}

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  UPI:         { icon: "📱", label: "UPI",         color: "#3B5BDB", bg: "#EEF2FF" },
  NET_BANKING: { icon: "🏦", label: "Net Banking",  color: "#059669", bg: "#ECFDF5" },
  CARD:        { icon: "💳", label: "Card",         color: "#7C3AED", bg: "#F5F3FF" },
  CRYPTO:      { icon: "₿",  label: "Crypto Wallet",color: "#D97706", bg: "#FFFBEB" },
}

const ACCOUNT_TYPES = Object.keys(TYPE_META)
const NETWORKS = ["Ethereum", "Polygon", "Solana", "BNB Smart Chain"]

export default function AccountsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accountType, setAccountType] = useState("UPI")
  const [otp, setOtp] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const [formData, setFormData] = useState({
    account_number: "", cvv: "", expiry_date: "",
    upi_id: "", ifsc: "", bank_name: "", wallet_address: "", network: "Ethereum", balance: "5000",
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) { router.push("/login"); return }
    const u = JSON.parse(userData)
    setUser(u)
    fetchAccounts(u.id)
  }, [router])

  const fetchAccounts = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/accounts/${userId}`)
      if (res.ok) setAccounts(await res.json())
    } catch { } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this account?")) return
    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, { method: "DELETE" })
      if (res.ok && user) fetchAccounts(user.id)
    } catch { }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (accountType === "UPI") { setShowOtp(true); return }
    submitAccount()
  }

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp === "123456") { setShowOtp(false); submitAccount(); setOtp("") }
    else alert("Invalid OTP — use 123456 for demo")
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
      if (res.ok) {
        if (user) fetchAccounts(user.id)
        setShowForm(false)
        setFormData({ account_number: "", cvv: "", expiry_date: "", upi_id: "", ifsc: "", bank_name: "", wallet_address: "", network: "Ethereum", balance: "5000" })
      } else { const e = await res.json(); alert("Failed: " + (e.detail ?? "Unknown")) }
    } catch { }
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }} className="page-enter">
      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--border)", background: "var(--surface)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/profile" style={{ color: "var(--text-primary)", display: "flex" }}><ArrowLeft size={22} /></Link>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>Connected Accounts</div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: showForm ? "var(--surface-2)" : "var(--accent)", border: "none", borderRadius: 20,
          color: showForm ? "var(--text-secondary)" : "#fff", fontSize: 13, fontWeight: 700,
          padding: "7px 16px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add</>}
        </button>
      </div>

      <div style={{ padding: "20px" }}>

        {/* Add Account Form */}
        {showForm && (
          <div className="slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add New Account</div>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {ACCOUNT_TYPES.map(t => {
                const m = TYPE_META[t]
                return (
                  <button key={t} onClick={() => setAccountType(t)} style={{
                    padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${accountType === t ? m.color : "var(--border)"}`,
                    background: accountType === t ? m.bg : "var(--surface-2)",
                    color: accountType === t ? m.color : "var(--text-secondary)",
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span>{m.icon}</span> {m.label}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {accountType === "UPI" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>UPI ID</label>
                  <input name="upi_id" placeholder="yourname@upi" value={formData.upi_id} onChange={handleChange} required
                    style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
                </div>
              )}

              {accountType === "NET_BANKING" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Account Number</label>
                    <input name="account_number" placeholder="123456789012" value={formData.account_number} onChange={handleChange} required
                      style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "monospace", outline: "none" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>IFSC</label>
                      <input name="ifsc" placeholder="ABCD0123456" value={formData.ifsc} onChange={handleChange} required
                        style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bank Name</label>
                      <input name="bank_name" placeholder="SBI, HDFC…" value={formData.bank_name} onChange={handleChange} required
                        style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                    </div>
                  </div>
                </>
              )}

              {accountType === "CARD" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Card Number</label>
                    <input name="account_number" maxLength={16} placeholder="0000 0000 0000 0000" value={formData.account_number} onChange={handleChange} required
                      style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "monospace", letterSpacing: "0.1em", outline: "none" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>CVV</label>
                      <input name="cvv" maxLength={3} type="password" placeholder="•••" value={formData.cvv} onChange={handleChange} required
                        style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "monospace", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Expiry</label>
                      <input name="expiry_date" placeholder="MM/YY" value={formData.expiry_date} onChange={handleChange} required
                        style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "monospace", outline: "none" }} />
                    </div>
                  </div>
                </>
              )}

              {accountType === "CRYPTO" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Wallet Address</label>
                    <input name="wallet_address" placeholder="0x..." value={formData.wallet_address} onChange={handleChange} required
                      style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Network</label>
                    <select name="network" value={formData.network} onChange={handleChange}
                      style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none" }}>
                      {NETWORKS.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Initial Balance (₹ — demo)</label>
                <input type="number" name="balance" placeholder="5000" value={formData.balance} onChange={handleChange} required
                  style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
              </div>

              <button type="submit" style={{
                width: "100%", height: 52, borderRadius: 999, marginTop: 4,
                background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
                border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--accent-glow)",
              }}>
                {accountType === "UPI" ? "Verify & Add →" : "Add Account →"}
              </button>
            </form>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length === 0 && !showForm ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No accounts connected</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Add a bank account, UPI, card, or crypto wallet</div>
            <button onClick={() => setShowForm(true)} style={{
              padding: "12px 24px", borderRadius: 999, background: "var(--accent)", border: "none",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>
              Add your first account
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {accounts.map(acc => {
              const meta = TYPE_META[acc.account_type] ?? TYPE_META.CARD
              return (
                <div key={acc.id} style={{
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{meta.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.account_type === "CARD" && `**** **** **** ${acc.account_number?.slice(-4)}`}
                      {acc.account_type === "UPI" && acc.upi_id}
                      {acc.account_type === "NET_BANKING" && `${acc.bank_name} · ****${acc.account_number?.slice(-4)}`}
                      {acc.account_type === "CRYPTO" && `${acc.wallet_address?.slice(0, 8)}…${acc.wallet_address?.slice(-6)} · ${acc.network}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>₹{acc.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>balance</div>
                  </div>
                  <button onClick={() => handleDelete(acc.id)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4, borderRadius: 8, display: "flex" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* OTP Modal */}
      {showOtp && (
        <div className="overlay">
          <div className="sheet">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EEF2FF", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📱</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Verify UPI</div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Enter OTP sent to your registered mobile for <strong>{formData.upi_id}</strong></div>
            </div>
            <form onSubmit={verifyOtp}>
              <input
                autoFocus
                placeholder="Enter OTP (demo: 123456)"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                style={{
                  width: "100%", height: 60, borderRadius: 14, textAlign: "center",
                  fontFamily: "monospace", fontSize: 24, letterSpacing: "0.4em",
                  background: "var(--surface-2)", border: "1.5px solid var(--border)",
                  color: "var(--text-primary)", marginBottom: 16, outline: "none",
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button type="button" onClick={() => setShowOtp(false)} style={{ height: 52, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" style={{ height: 52, borderRadius: 999, background: "var(--accent)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
