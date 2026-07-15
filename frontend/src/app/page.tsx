"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
]

const CONTACTS = [
  { name: "Arjun", initials: "A", color: "#3B5BDB" },
  { name: "Priya", initials: "P", color: "#7C3AED" },
  { name: "Kevin", initials: "K", color: "#059669" },
  { name: "Nandhini", initials: "N", color: "#D97706" },
]

const RAILS = [
  { label: "Rail A", desc: "Low fee · 2–3 min", score: 0.94, active: true },
  { label: "Rail B", desc: "Fast · ₹2 fee", score: 0.78, active: false },
  { label: "Rail C", desc: "Variable", score: 0.61, active: false },
]

export default function LandingPage() {
  const [visible, setVisible] = useState(false)
  const [routeStep, setRouteStep] = useState(0)

  useEffect(() => {
    setVisible(true)
    // Animate routing demo
    const timer = setInterval(() => setRouteStep(s => (s + 1) % 4), 1200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ background: "#000", minHeight: "100dvh", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid #1a1a1a",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(16px)",
        padding: "0 24px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1100, margin: "0 auto", width: "100%",
      }}>
        <div style={{ position: "sticky", top: 0, left: 0, right: 0, zIndex: 50, background: "transparent", padding: "0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#3B5BDB,#5B7BEB)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(59,91,219,0.5)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.04em", color: "#fff" }}>TokenOne</span>
            </Link>

            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/login" style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid #333", color: "#ccc", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "all 0.15s" }}>
                Sign in
              </Link>
              <Link href="/login" style={{ padding: "8px 18px", borderRadius: 999, background: "#3B5BDB", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", boxShadow: "0 4px 16px rgba(59,91,219,0.4)" }}>
                Get TokenOne
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* ── HERO ── */}
        <section style={{
          minHeight: "90dvh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "80px 0 60px",
          opacity: visible ? 1 : 0, transition: "opacity 0.6s",
        }}>
          {/* Pill badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(59,91,219,0.12)", border: "1px solid rgba(59,91,219,0.3)",
            color: "#7B97F0", borderRadius: 999, padding: "6px 16px",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
            marginBottom: 36, textTransform: "uppercase",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5B7BEB", display: "inline-block", animation: "pulse 2s infinite" }} />
            Multi-Rail Payment Orchestration · PAY_TOKEN Engine
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(42px, 8vw, 80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1.05, marginBottom: 24, maxWidth: 800 }}>
            One app.<br />
            <span style={{ background: "linear-gradient(90deg, #5B7BEB, #818cf8, #3B5BDB)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Every payment rail.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: "#888", maxWidth: 540, lineHeight: 1.6, marginBottom: 48 }}>
            TokenOne intelligently routes your transactions across banks, wallets, and payment networks — automatically selecting the best path for every payment.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 72 }}>
            <Link href="/login" style={{
              padding: "16px 36px", borderRadius: 999,
              background: "linear-gradient(135deg,#3B5BDB,#5B7BEB)",
              color: "#fff", fontSize: 16, fontWeight: 700,
              textDecoration: "none", boxShadow: "0 8px 32px rgba(59,91,219,0.45)",
              letterSpacing: "-0.01em",
            }}>
              Start for free →
            </Link>
            <Link href="/login" style={{
              padding: "16px 36px", borderRadius: 999,
              border: "1px solid #2a2a2a", color: "#ccc",
              fontSize: 16, fontWeight: 500, textDecoration: "none",
              background: "rgba(255,255,255,0.03)",
            }}>
              View demo
            </Link>
          </div>

          {/* Token Card + Phone mockup */}
          <div style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto" }}>
            {/* Glow */}
            <div style={{ position: "absolute", inset: "-40px", background: "radial-gradient(ellipse at center, rgba(59,91,219,0.25) 0%, transparent 70%)", pointerEvents: "none" }} />
            
            {/* Card */}
            <div style={{
              borderRadius: 24, padding: "28px 28px 24px",
              background: "linear-gradient(135deg,#1e2d6b 0%,#3B5BDB 50%,#5B7BEB 100%)",
              boxShadow: "0 24px 64px rgba(59,91,219,0.45)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -50, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
              <div style={{ position: "absolute", bottom: -40, left: -20, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, position: "relative" }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: 4 }}>TOKENONE</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Unified Payment Account</div>
                </div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div style={{ marginBottom: 28, position: "relative" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Unified Balance</div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>₹24,580.00</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 8px #4ADE80" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Connected · 3 accounts</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>T1-2847-4291</div>
              </div>
            </div>

            {/* Route animation below card */}
            <div style={{ marginTop: 20, background: "#111", border: "1px solid #222", borderRadius: 16, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: routeStep < 3 ? "#F59E0B" : "#4ADE80", transition: "background 0.4s" }} />
                <span style={{ fontSize: 12, color: "#888" }}>
                  {routeStep === 0 && "Analyzing available rails..."}
                  {routeStep === 1 && "Scoring routes for ₹2,000..."}
                  {routeStep === 2 && "Applying risk & compliance checks..."}
                  {routeStep === 3 && "✓ Best route selected — Instant · ₹0 fee"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {RAILS.map((r, i) => (
                  <div key={r.label} style={{
                    flex: 1, padding: "8px 10px", borderRadius: 10,
                    border: `1px solid ${i === 0 && routeStep === 3 ? "#3B5BDB" : "#222"}`,
                    background: i === 0 && routeStep === 3 ? "rgba(59,91,219,0.1)" : "transparent",
                    transition: "all 0.4s",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 && routeStep === 3 ? "#5B7BEB" : "#555", marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{r.desc}</div>
                    <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "#1a1a1a", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${r.score * 100}%`, background: i === 0 ? "#3B5BDB" : "#333", borderRadius: 2, transition: "width 0.8s", opacity: routeStep >= 2 ? 1 : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ padding: "80px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 12 }}>CORE CAPABILITIES</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, letterSpacing: "-0.04em" }}>
              Everything under the hood
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 20 }}>
            {[
              { icon: "⚡", title: "Smart Routing", desc: "AI-powered orchestration evaluates cost, speed, and reliability across all connected payment rails in real time." },
              { icon: "🏦", title: "Bank Transfers", desc: "Full NEFT/RTGS/IMPS transfers with complete beneficiary details — bank-to-bank, crypto-to-bank, and more." },
              { icon: "🔁", title: "Auto Fallback", desc: "If a payment rail fails, TokenOne automatically reroutes through the next best eligible option with your consent." },
              { icon: "🌐", title: "Cross-Border", desc: "Compare FX rates across providers and route international transfers through the most cost-effective channel." },
              { icon: "🔒", title: "Zero-Trust Security", desc: "Device binding, biometric confirmation, encrypted credentials, and transaction signing on every payment." },
              { icon: "📊", title: "Unified History", desc: "One feed for every transaction, regardless of which underlying network processed it." },
            ].map(f => (
              <div key={f.title} style={{
                background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 20, padding: "28px",
                transition: "border-color 0.2s",
              }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>{f.title}</div>
                <div style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" style={{ padding: "80px 0 120px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 12 }}>
              Four taps. That&apos;s it.
            </h2>
            <p style={{ color: "#666", fontSize: 16 }}>The complexity lives in our engine — not your screen.</p>
          </div>

          <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 16 }}>
            {[
              { num: "01", label: "Choose who to pay", desc: "Search by name, TokenOne ID, or scan a QR code." },
              { num: "02", label: "Enter the amount", desc: "The amount dominates the screen. Nothing else competes for attention." },
              { num: "03", label: "TokenOne optimizes", desc: "Our engine silently selects the best route. You see: Instant · ₹0 fee." },
              { num: "04", label: "Hold to confirm", desc: "A deliberate interaction with biometric confirmation. No accidents." },
            ].map((step, i) => (
              <div key={step.num} style={{ flex: "0 0 240px", padding: "0 20px 0 0", position: "relative" }}>
                {i < 3 && (
                  <div style={{ position: "absolute", right: 0, top: 24, width: 20, height: 1, background: "#2a2a2a" }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(59,91,219,0.1)", border: "1px solid rgba(59,91,219,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#5B7BEB" }}>{step.num}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", marginBottom: 8 }}>{step.label}</div>
                <div style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #111", padding: "32px 24px", textAlign: "center", color: "#333", fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontWeight: 700, color: "#444" }}>TokenOne</span>
          <span>© 2026 TokenOne. Intelligent payment orchestration.</span>
          <Link href="/login" style={{ color: "#3B5BDB", textDecoration: "none", fontWeight: 600 }}>Get started →</Link>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
