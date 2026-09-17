"use client";

import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-warm-50/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="relative inline-block text-lg font-extrabold leading-none tracking-[0.04em] text-neutral-500"
          >
            SCOPE
            <span className="absolute -bottom-1 right-0 h-[3px] w-6 rounded-sm bg-red-500" />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
            >
              Dashboard
            </Link>
            <Link
              href="/billing"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
            >
              Billing
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}