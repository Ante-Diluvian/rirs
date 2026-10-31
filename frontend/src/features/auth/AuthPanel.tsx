"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const tabs = [
  { id: "login", label: "Prijava" },
  { id: "register", label: "Registracija" },
] as const;

type Tab = (typeof tabs)[number]["id"];

export function AuthPanel() {
  const [active, setActive] = useState<Tab>("login");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  function select(tab: Tab, focus = false) {
    setActive(tab);
    if (focus) tabRefs.current[tab]?.focus();
  }

  // puščici premikata med zavihki, kot pri vzorcu WAI-ARIA Tabs
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(active === "login" ? "register" : "login", true);
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-md border border-zinc-300 bg-white p-6">
      <h1 className="sr-only">Prijava in registracija</h1>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="mb-6 flex gap-1 border-b-2 border-zinc-700"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={selected ? `panel-${tab.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              className={`-mb-0.5 rounded-t-md px-4 py-2 text-sm ${
                selected
                  ? "border-2 border-b-white border-zinc-700 bg-white font-medium text-zinc-900"
                  : "border-2 border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === "login" ? (
          <LoginForm onRegister={() => select("register", true)} />
        ) : (
          <RegisterForm />
        )}
      </div>
    </section>
  );
}
