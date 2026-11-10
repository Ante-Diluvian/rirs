import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Librarium", template: "%s – Librarium" },
  description:
    "Spletni sistem za izposojo, rezervacije in zamudnine v lokalni knjižnici",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sl" className="h-full">
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
