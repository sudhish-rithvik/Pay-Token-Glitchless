"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Loader2, ArrowUpRight, ArrowDownLeft, Clock, Trash2, X } from "lucide-react"

interface Transaction {
  transaction_id: string
  from_account_id: string
  to_account_id: string
  amount: number
  currency: string
  method: string
  status: string
  speed_mode?: string
}

const FILTERS = ["All", "Sent", "Received"] as const
type Filter = typeof FILTERS[number]

const sym = (c: string) => c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : "₹"

export default function ActivityPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("All")
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!localStorage.getItem("user")) { router.push("/login"); return }
    fetchHistory()
  }, [router])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/payments/history`)
      if (res.ok) setTransactions((await res.json()).reverse())
      else setError("Failed to fetch activity")
    } catch { setError("Error connecting to server") } finally { setLoading(false) }
  }

  const clearHistory = async () => {
    if (!confirm("Delete all transaction history?")) return
    setLoading(true)
    try {
      await fetch(`${API_BASE}/payments/history`, { method: "DELETE" })
      setTransactions([])
    } catch { setError("Error clearing history") } finally { setLoading(false) }
  }

  const filtered = transactions.filter(tx => {
    if (filter === "All") return true
    if (filter === "Sent") return true // All our tx are outgoing for now
    return false
  })

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="page-enter" style={{ paddingBottom: "var(--nav-h)" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>Activity</div>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</div>
        </div>
        {transactions.length > 0 && (
          <button onClick={clearHistory} style={{
            background: "none", border: "none", color: "var(--danger)", cursor: "pointer",
            fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
            padding: "6px 10px", borderRadius: 8, fontFamily: "inherit",
          }}>
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 8 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            background: filter === f ? "var(--accent)" : "var(--surface)",
            color: filter === f ? "#fff" : "var(--text-secondary)",
            boxShadow: filter === f ? "0 4px 12px var(--accent-glow)" : "none",
            transition: "all 0.15s",
          }}>
            {f}
          </button>
        ))}
      </div>

      {error && <div style={{ margin: "0 20px 16px", padding: "12px 16px", background: "var(--danger-subtle)", borderRadius: 12, fontSize: 13, color: "var(--danger)" }}>{error}</div>}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-tertiary)" }}>
          <Clock size={48} style={{ display: "block", margin: "0 auto 16px", opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No transactions yet</div>
          <div style={{ fontSize: 13 }}>Payments you send and receive will appear here</div>
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          {filtered.map((tx, i) => {
            const isOk = tx.status === "COMPLETED"
            return (
              <button key={tx.transaction_id} onClick={() => setSelected(tx)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "16px 0", borderBottom: "1px solid var(--border)",
                background: "none", border: "none",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: isOk ? "var(--success-subtle)" : "var(--danger-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isOk
                    ? <ArrowUpRight size={18} style={{ color: "var(--success)" }} />
                    : <ArrowUpRight size={18} style={{ color: "var(--danger)" }} />}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Sent to <span style={{ fontFamily: "monospace", fontSize: 12 }}>{tx.to_account_id.slice(0, 12)}…</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{tx.method.replace("_", " ")}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                      background: isOk ? "var(--success-subtle)" : "var(--danger-subtle)",
                      color: isOk ? "var(--success)" : "var(--danger)",
                    }}>{tx.status}</span>
                  </div>
                </div>
                {/* Amount */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: isOk ? "var(--text-primary)" : "var(--danger)" }}>
                    -{sym(tx.currency)}{tx.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                    {tx.transaction_id.slice(0, 8)}…
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Transaction Details</div>
              <button onClick={() => setSelected(null)} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Status badge */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 999, marginBottom: 16,
                background: selected.status === "COMPLETED" ? "var(--success-subtle)" : "var(--danger-subtle)",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: selected.status === "COMPLETED" ? "var(--success)" : "var(--danger)" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: selected.status === "COMPLETED" ? "var(--success)" : "var(--danger)" }}>
                  {selected.status}
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em" }}>
                -{sym(selected.currency)}{selected.amount.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4, textTransform: "capitalize" }}>
                {selected.method.replace("_", " ")}
              </div>
            </div>

            {/* Detail rows */}
            <div style={{ background: "var(--surface-2)", borderRadius: 16, padding: "4px 16px", marginBottom: 20 }}>
              {[
                { l: "Transaction ID", v: selected.transaction_id, mono: true, small: true },
                { l: "From", v: selected.from_account_id, mono: true, small: true },
                { l: "To", v: selected.to_account_id, mono: true, small: true },
                { l: "Currency", v: selected.currency },
                { l: "Speed", v: selected.speed_mode ?? "Standard" },
                { l: "Method", v: selected.method.replace("_", " ") },
              ].map(r => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{r.l}</span>
                  <span style={{ fontSize: (r as any).small ? 11 : 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: (r as any).mono ? "monospace" : "inherit", maxWidth: "55%", textAlign: "right", wordBreak: "break-all", textTransform: "capitalize" }}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => setSelected(null)} style={{
              width: "100%", height: 52, borderRadius: 999,
              background: "var(--accent)", border: "none", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
