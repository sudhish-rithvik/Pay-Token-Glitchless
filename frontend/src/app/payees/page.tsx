"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { ArrowLeft, Plus, Trash2, Loader2, X, Users } from "lucide-react"

interface User { id: string; username: string }
interface Payee { id: string; user_id: string; name: string; account_type: string; account_identifier: string }

const AVATAR_COLORS = ["#3B5BDB", "#7C3AED", "#059669", "#D97706", "#DB2777", "#DC2626", "#2563EB"]
const TYPE_LABELS: Record<string, string> = {
  UPI: "UPI", BANK_ACCOUNT: "Bank Account", CRYPTO_WALLET: "Crypto Wallet",
}

export default function PayeesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [payees, setPayees] = useState<Payee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newPayee, setNewPayee] = useState({ name: "", account_type: "UPI", account_identifier: "" })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) { router.push("/login"); return }
    const u = JSON.parse(userData)
    setUser(u)
    fetchPayees(u.id)
  }, [router])

  const fetchPayees = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/payees/${userId}`)
      if (res.ok) setPayees(await res.json())
    } catch { } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this payee?")) return
    try {
      const res = await fetch(`${API_BASE}/payees/${id}`, { method: "DELETE" })
      if (res.ok && user) fetchPayees(user.id)
    } catch { }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      const res = await fetch(`${API_BASE}/payees/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, ...newPayee }),
      })
      if (res.ok) { fetchPayees(user.id); setShowForm(false); setNewPayee({ name: "", account_type: "UPI", account_identifier: "" }) }
      else alert("Failed to add payee")
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
        <Link href="/home" style={{ color: "var(--text-primary)", display: "flex" }}><ArrowLeft size={22} /></Link>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>Payees</div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: showForm ? "var(--surface-2)" : "var(--accent)", border: "none", borderRadius: 20,
          color: showForm ? "var(--text-secondary)" : "#fff", fontSize: 13, fontWeight: 700,
          padding: "7px 16px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add</>}
        </button>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Add Form */}
        {showForm && (
          <div className="slide-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Save Payee</div>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</label>
                <input
                  placeholder="Full name" value={newPayee.name} onChange={e => setNewPayee({ ...newPayee, name: e.target.value })} required
                  style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</label>
                <select value={newPayee.account_type} onChange={e => setNewPayee({ ...newPayee, account_type: e.target.value })}
                  style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none" }}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Identifier</label>
                <input
                  placeholder={newPayee.account_type === "UPI" ? "name@upi" : newPayee.account_type === "BANK_ACCOUNT" ? "Account number" : "0x..."}
                  value={newPayee.account_identifier} onChange={e => setNewPayee({ ...newPayee, account_identifier: e.target.value })} required
                  style={{ width: "100%", height: 48, borderRadius: 12, padding: "0 14px", background: "var(--surface-2)", border: "1.5px solid transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "monospace", outline: "none" }}
                />
              </div>
              <button type="submit" style={{
                width: "100%", height: 52, borderRadius: 999, marginTop: 4,
                background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
                border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px var(--accent-glow)",
              }}>
                Save Payee
              </button>
            </form>
          </div>
        )}

        {/* Payees list */}
        {payees.length === 0 && !showForm ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-tertiary)" }}>
            <Users size={48} style={{ display: "block", margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No payees yet</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Save contacts you pay frequently</div>
            <button onClick={() => setShowForm(true)} style={{
              padding: "12px 24px", borderRadius: 999, background: "var(--accent)", border: "none",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>
              Add first payee
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payees.map((payee, i) => (
              <div key={payee.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 20,
                  boxShadow: `0 4px 12px ${AVATAR_COLORS[i % AVATAR_COLORS.length]}44`,
                }}>
                  {payee.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{payee.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {TYPE_LABELS[payee.account_type] ?? payee.account_type}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {payee.account_identifier}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(payee.id)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4, borderRadius: 8, display: "flex" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
