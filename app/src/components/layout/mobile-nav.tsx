"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import type { SidebarItem } from "@/components/layout/sidebar";
import { BRAND } from "@/lib/brand";

export function MobileNav({
  items,
  orgName,
  userName,
  signOutSlot,
}: {
  items: SidebarItem[];
  orgName: string;
  userName?: string;
  signOutSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-sidebar px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <Image src={BRAND.logo.src} alt={BRAND.logo.alt} width={BRAND.logo.width} height={BRAND.logo.height} priority className="h-11 w-11" />
        <span className="text-sm font-semibold text-foreground">{BRAND.appName}</span>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2.5 text-foreground hover:bg-surface-2"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80vw] bg-sidebar px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <Image src={BRAND.logo.src} alt={BRAND.logo.alt} width={BRAND.logo.width} height={BRAND.logo.height} className="h-20 w-20" />
              <span className="sr-only">{orgName}</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-2" aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-2 hover:text-foreground"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>

            {(userName || signOutSlot) && (
              <div className="mt-6 border-t border-[color:var(--color-border)] pt-4">
                {userName && (
                  <>
                    <p className="truncate px-3 text-sm font-medium text-foreground">{userName}</p>
                    <p className="truncate px-3 text-xs text-text-secondary">{orgName}</p>
                  </>
                )}
                {signOutSlot}
              </div>
            )}
          </div>
          <button
            className="flex-1 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
        </div>
      )}
    </div>
  );
}
