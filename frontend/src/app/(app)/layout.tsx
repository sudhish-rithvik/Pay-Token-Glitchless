"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

const TABS = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeWidth={active ? "2.5" : "2"} />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "You",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Mobile shell */}
      <div className="app-shell" style={{ paddingBottom: "var(--nav-h)" }}>
        {children}
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav" style={{ maxWidth: 430 }}>
        {TABS.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-tab${active ? " active" : ""}`}
              aria-label={tab.label}
            >
              {tab.icon(active)}
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
