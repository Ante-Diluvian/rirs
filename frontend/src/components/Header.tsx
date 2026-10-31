"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { homePath } from "@/features/auth/home-path";
import { useLogout } from "@/features/auth/hooks";
import { roleLabels } from "@/features/auth/roles";
import { useAuthHydrated, useAuthStore } from "@/stores/auth-store";

interface MenuItem {
  href: string;
  label: string;
  match: string[];
}

const readerMenu: MenuItem[] = [
  { href: "/katalog", label: "Katalog", match: ["/katalog", "/knjige"] },
  {
    href: "/moja-knjiznica",
    label: "Moja knjižnica",
    match: ["/moja-knjiznica"],
  },
];

// Člani in Zamudniki z wireframe-ov nista del MVP
const staffMenu: MenuItem[] = [
  { href: "/pult", label: "Pult", match: ["/pult"] },
  {
    href: "/katalog/urejanje",
    label: "Katalog",
    match: ["/katalog", "/knjige"],
  },
];

function isActive(pathname: string, item: MenuItem) {
  return item.match.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function Header() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const logout = useLogout();
  const menu = !user ? [] : user.role === "READER" ? readerMenu : staffMenu;

  return (
    <header className="border-b border-zinc-300 bg-zinc-100">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link
          href={user ? homePath(user.role) : "/prijava"}
          className="flex items-center gap-2 text-lg font-medium text-zinc-900"
        >
          <span
            aria-hidden="true"
            className="inline-block size-4 rounded-sm border-2 border-zinc-900"
          />
          Librarium
        </Link>

        {menu.length > 0 && (
          <nav aria-label="Glavni meni">
            <ul className="flex gap-1">
              {menu.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-1.5 text-sm ${
                        active
                          ? "bg-zinc-300 text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {hydrated && !user && (
            <span className="text-zinc-500">Nisi prijavljen</span>
          )}
          {user && (
            <>
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-zinc-400 bg-zinc-200 text-xs text-zinc-700"
              >
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <span className="text-zinc-800">
                {user.firstName} {user.lastName}
              </span>
              <span className="rounded border border-zinc-500 px-1.5 py-0.5 text-xs text-zinc-700">
                {roleLabels[user.role]}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-zinc-900 underline hover:text-zinc-600"
              >
                Odjava
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
