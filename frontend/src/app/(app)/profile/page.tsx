"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { LogOut, ChevronRight, Shield, Zap, Bell, HelpCircle, Lock, Globe } from "lucide-react"

interface User { id: string; username: string }
interface Account { id: string; balance: number; account_type: string }

type Preference = "smart" | "fastest" | "cheapest"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [preference, setPreference] = useState<Preference>("smart")

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) { router.push("/login"); return }
    const u = JSON.parse(userData)
    setUser(u)
    fetch(`${API_BASE}/accounts/${u.id}`)
      .then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          setAccounts(data)
          setTotalBalance(data.reduce((s: number, a: Account) => s + a.balance, 0))
        }
      }).catch(() => {})
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  if (!user) return null

  const PREFS: { id: Preference; label: string; desc: string }[] = [
    { id: "smart",    label: "Smart",       desc: "Automatically selects the best route" },
    { id: "fastest",  label: "Fastest",     desc: "Prioritizes payment speed" },
    { id: "cheapest", label: "Lowest Cost", desc: "Minimizes transaction fees" },
  ]

  const MENU = [
    {
      section: "Account",
      items: [
        { icon: <Shield size={18} style={{ color: "#059669" }} />, bg: "#F0FDF4", label: "Security & Privacy", sub: "Face ID, device binding" },
        { icon: <Bell size={18} style={{ color: "#D97706" }} />, bg: "#FFFBEB", label: "Notifications", sub: "Alerts and payment confirmations" },
        { icon: <Globe size={18} style={{ color: "#7C3AED" }} />, bg: "#F5F3FF", label: "Language & Region", sub: "English · India (INR)" },
      ],
    },
    {
      section: "Support",
      items: [
        { icon: <HelpCircle size={18} style={{ color: "#2563EB" }} />, bg: "#EFF6FF", label: "Help Center", sub: "FAQs and support" },
        { icon: <Lock size={18} style={{ color: "#6B7280" }} />, bg: "#F9FAFB", label: "Privacy Policy", sub: "How we handle your data" },
      ],
    },
  ]

  return (
    <div className="page-enter" style={{ paddingBottom: "var(--nav-h)" }}>

      {/* Token Card (identity) */}
      <div style={{ padding: "20px 20px 0" }}>
        <div className="token-card">
          <div className="card-circles" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 2 }}>TOKENONE ID</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>@{user.username}</div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 20,
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>Unified Balance</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
                ₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{accounts.length} accounts</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                {user.id.slice(0, 16)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Connected Accounts</span>
          <Link href="/accounts" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Manage →</Link>
        </div>
        {accounts.length === 0 ? (
          <Link href="/accounts" style={{ textDecoration: "none" }}>
            <div style={{ padding: "20px", background: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              + Connect your first account
            </div>
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
            {accounts.map(acc => {
              const icons: Record<string, string> = { UPI: "📱", NET_BANKING: "🏦", CARD: "💳", CRYPTO: "₿" }
              return (
                <div key={acc.id} style={{ flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", minWidth: 120 }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{icons[acc.account_type] ?? "💰"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 2 }}>{acc.account_type.replace("_", " ")}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>₹{acc.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                </div>
              )
            })}
            <Link href="/accounts" style={{ textDecoration: "none", flexShrink: 0 }}>
              <div style={{ background: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 14, padding: "14px 16px", minWidth: 80, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <span style={{ fontSize: 22, color: "var(--text-tertiary)" }}>+</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Payment Preference */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Payment Preference</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
          {PREFS.map((p, i) => (
            <button key={p.id} onClick={() => setPreference(p.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
              background: "none", border: "none", borderBottom: i < PREFS.length - 1 ? "1px solid var(--border)" : "none",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${preference === p.id ? "var(--accent)" : "var(--border-strong)"}`,
                background: preference === p.id ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {preference === p.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: preference === p.id ? "var(--accent)" : "var(--text-primary)" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Sections */}
      {MENU.map(section => (
        <div key={section.section} style={{ padding: "24px 20px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{section.section}</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
            {section.items.map((item, i) => (
              <button key={item.label} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                background: "none", border: "none", borderBottom: i < section.items.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{item.sub}</div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Sign Out */}
      <div style={{ padding: "24px 20px 0" }}>
        <button onClick={handleLogout} style={{
          width: "100%", height: 52, borderRadius: 16,
          background: "var(--danger-subtle)", border: "1px solid rgba(239,68,68,0.15)",
          color: "var(--danger)", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div style={{ padding: "20px", textAlign: "center", fontSize: 11, color: "var(--text-tertiary)" }}>
        TokenOne v1.0.0 · © 2026
      </div>
    </div>
  )
}
