"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { API_BASE } from "@/lib/api"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const endpoint = isLogin ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Authentication failed")
      localStorage.setItem("user", JSON.stringify(data))
      router.push("/home")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#000", display: "flex",
      fontFamily: "'Inter', sans-serif", color: "#fff",
    }}>
      {/* Left panel — branding (desktop) */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px", background: "linear-gradient(135deg, #0a0f2e 0%, #1a2463 50%, #3B5BDB 100%)",
        position: "relative", overflow: "hidden",
        minWidth: 0,
      }} className="desktop-only">
        {/* Circles */}
        <div style={{ position: "absolute", top: -80, left: -60, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "absolute", bottom: -100, right: -80, width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", position: "relative" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.04em", color: "#fff" }}>TokenOne</span>
        </Link>

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "clamp(28px,3vw,40px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: 20 }}>
            One app.<br />Every payment<br />rail.
          </div>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.6, maxWidth: 340 }}>
            Connect your bank accounts, wallets, and cards. Let TokenOne handle the routing.
          </p>

          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "⚡", text: "Instant payments across all rails" },
              { icon: "🏦", text: "Bank transfers with full beneficiary details" },
              { icon: "🔒", text: "Biometric confirmation on every payment" },
            ].map(f => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 TokenOne</div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: "100%", maxWidth: 480,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
        background: "#060606",
      }}>
        {/* Mobile logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 48 }} className="mobile-only">
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#3B5BDB,#5B7BEB)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.04em" }}>TokenOne</span>
        </Link>

        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 36 }}>
            {isLogin ? "Sign in to your TokenOne account." : "Start your payment journey with TokenOne."}
          </p>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#F87171", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, letterSpacing: "0.02em" }}>
                USERNAME
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{
                  width: "100%", height: 48, borderRadius: 12, padding: "0 16px",
                  background: "#111", border: "1.5px solid #1e1e1e",
                  color: "#fff", fontSize: 15, outline: "none", fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#3B5BDB"}
                onBlur={e => e.target.style.borderColor = "#1e1e1e"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, letterSpacing: "0.02em" }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%", height: 48, borderRadius: 12, padding: "0 48px 0 16px",
                    background: "#111", border: "1.5px solid #1e1e1e",
                    color: "#fff", fontSize: 15, outline: "none", fontFamily: "inherit",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#3B5BDB"}
                  onBlur={e => e.target.style.borderColor = "#1e1e1e"}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex",
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                height: 52, borderRadius: 999, marginTop: 8,
                background: loading || !username || !password ? "#1a1a1a" : "linear-gradient(135deg,#3B5BDB,#5B7BEB)",
                border: "none", color: loading || !username || !password ? "#444" : "#fff",
                fontSize: 16, fontWeight: 700, cursor: loading || !username || !password ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading || !username || !password ? "none" : "0 4px 20px rgba(59,91,219,0.4)",
                transition: "all 0.2s", fontFamily: "inherit", letterSpacing: "-0.01em",
              }}
            >
              {loading && <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} />}
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Biometric hint */}
          {isLogin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, padding: "12px 16px", background: "#0d0d0d", borderRadius: 12, border: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <span style={{ fontSize: 12, color: "#555" }}>Face ID &amp; biometric login available after first sign-in</span>
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "#444" }}>
            {isLogin ? "New to TokenOne? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError("") }}
              style={{ background: "none", border: "none", color: "#5B7BEB", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
            >
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) { .desktop-only { display: none !important; } }
        @media (min-width: 768px) { .mobile-only { display: none !important; } }
      `}</style>
    </div>
  )
}
