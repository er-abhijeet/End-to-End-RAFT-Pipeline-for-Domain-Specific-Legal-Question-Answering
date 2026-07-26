"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/results", label: "Results" },
  { href: "/comparison", label: "Comparison" },
  { href: "/inference", label: "Try It" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-grid)] bg-[var(--color-ink)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl font-medium">
            RAFT<span className="text-[var(--color-redline-bright)]">/</span>CUAD
          </span>
          <span className="hidden font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-[var(--color-text-dim)] sm:inline">
            contract QA distillation
          </span>
        </Link>
        <nav className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-sm px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-[var(--color-redline)] text-[var(--color-paper)]"
                    : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
