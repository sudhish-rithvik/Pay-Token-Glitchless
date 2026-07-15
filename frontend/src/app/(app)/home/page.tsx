"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"

interface User { id: string; username: string }
interface Account { id: string; balance: number; account_type: string; account_number?: string; upi_id?: string }
interface Transaction {
  transaction_id: string
  to_account_id: string
  amount: number
  currency: string
  method: string
  status: string
}

const QUICK_CONTACTS = [
  { name: "Nandhini", color: "#7C3AED" },
  { name: "Raakesh",  color: "#059669" },
  { name: "Dijo",     color: "#3B5BDB" },
  { name: "Hema",     color: "#DB2777" },
]

const currencySymbol = (c: string) => c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : "₹"

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cardFlipped, setCardFlipped] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) { router.push("/login"); return }
    const u = JSON.parse(userData)
    setUser(u)
    Promise.all([
      fetch(`${API_BASE}/accounts/${u.id}`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/payments/history`).then(r => r.json()).catch(() => []),
    ]).then(([accs, txs]) => {
      const validAccs = Array.isArray(accs) ? accs : []
      const validTxs  = Array.isArray(txs)  ? txs  : []
      setAccounts(validAccs)
      setTransactions(validTxs.slice().reverse().slice(0, 5))
      setTotalBalance(validAccs.reduce((s: number, a: Account) => s + (a.balance ?? 0), 0))
    }).finally(() => setLoading(false))
  }, [router])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading TokenOne...</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ padding: "0 0 8px" }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>{greeting()},</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            {user?.username}
          </div>
        </div>
        <Link href="/profile" style={{ textDecoration: "none" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#3B5BDB,#5B7BEB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em",
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>

      {/* ── TOKEN CARD ── */}
      <div style={{ padding: "20px 20px 0" }}>
        <div
          className="token-card"
          onClick={() => setCardFlipped(!cardFlipped)}
          style={{ cursor: "pointer", transition: "transform 0.15s" }}
        >
          <div className="card-circles" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 2 }}>TOKENONE</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Unified Payment Account</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ position: "relative", zIndex: 1, marginBottom: 24 }}>
            {!cardFlipped ? (
              <>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Available across connected accounts</div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>
                  ₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {accounts.slice(0, 3).map(acc => (
                  <div key={acc.id} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{acc.account_type}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>₹{acc.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                {accounts.length > 0 ? `${accounts.length} account${accounts.length > 1 ? "s" : ""} connected` : "No accounts"}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              T1-{user?.id?.slice(0, 4).toUpperCase() ?? "----"}-TOKEN
            </span>
          </div>
        </div>
      </div>

      {/* ── PAY NOW ── */}
      <div style={{ padding: "20px 20px 0" }}>
        <Link href="/payments" style={{ textDecoration: "none", display: "block" }}>
          <button style={{
            width: "100%", height: 56, borderRadius: 999,
            background: "linear-gradient(135deg,var(--accent),#5B7BEB)",
            border: "none", color: "#fff", fontSize: 17, fontWeight: 700,
            cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit",
            boxShadow: "0 4px 20px var(--accent-glow)", transition: "transform 0.15s, box-shadow 0.15s",
          }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            Pay Now
          </button>
        </Link>

        {/* Secondary actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          {[
            { label: "Scan", icon: "⊡", href: "/payments" },
            { label: "Transfer", icon: "⇄", href: "/transfer" },
            { label: "Request", icon: "↩", href: "/payments" },
          ].map(a => (
            <Link key={a.label} href={a.href} style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", height: 52, borderRadius: 16,
                background: "var(--surface)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", display: "flex",
                flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                transition: "background 0.15s",
              }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{a.label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── QUICK SEND ── */}
      <div style={{ padding: "28px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Quick Send</span>
          <Link href="/payees" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Manage</Link>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
          {QUICK_CONTACTS.map(c => (
            <Link key={c.name} href="/payments" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: c.color, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em",
                boxShadow: `0 4px 12px ${c.color}44`,
              }}>
                {c.name.charAt(0)}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{c.name}</span>
            </Link>
          ))}
          <Link href="/payees" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--surface-2)", border: "1.5px dashed var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-tertiary)", fontSize: 22,
            }}>
              +
            </div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>Add</span>
          </Link>
        </div>
      </div>

      {/* ── RECENT TRANSACTIONS ── */}
      <div style={{ padding: "28px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Recent</span>
          <Link href="/activity" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>See all</Link>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-tertiary)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
            Your transactions will appear here
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {transactions.map(tx => (
              <div key={tx.transaction_id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 0", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: tx.status === "COMPLETED" ? "var(--success-subtle)" : "var(--danger-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 16 }}>{tx.status === "COMPLETED" ? "↑" : "✕"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                    Sent to <span style={{ fontFamily: "monospace", fontSize: 12 }}>{tx.to_account_id.slice(0, 8)}…</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "capitalize" }}>
                    {tx.method.replace("_", " ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tx.status === "COMPLETED" ? "var(--text-primary)" : "var(--danger)" }}>
                    -{currencySymbol(tx.currency)}{tx.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: tx.status === "COMPLETED" ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ACCOUNTS OVERVIEW ── */}
      {accounts.length > 0 && (
        <div style={{ padding: "28px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Connected Accounts</span>
            <Link href="/accounts" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Manage</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {accounts.slice(0, 3).map(acc => {
              const meta: Record<string, { icon: string; label: string }> = {
                UPI:         { icon: "📱", label: "UPI" },
                NET_BANKING: { icon: "🏦", label: "Net Banking" },
                CARD:        { icon: "💳", label: "Card" },
                CRYPTO:      { icon: "₿", label: "Crypto Wallet" },
              }
              const m = meta[acc.account_type] ?? { icon: "💰", label: acc.account_type }
              return (
                <div key={acc.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: 16,
                }}>
                  <div style={{ fontSize: 20 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                      {acc.upi_id ?? (acc.account_number ? `****${acc.account_number.slice(-4)}` : acc.id.slice(0, 8))}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                    ₹{acc.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
