"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { BookList } from "./BookList";
import { BookPanel } from "./BookPanel";

export function CatalogManagement() {
  // null: plošča je zaprta, bookId null: nova knjiga
  const [panel, setPanel] = useState<{ bookId: string | null } | null>(null);

  return (
    <div
      className={`grid items-start gap-6 ${
        panel ? "lg:grid-cols-[minmax(0,1fr)_26rem]" : ""
      }`}
    >
      <div>
        <PageHeader
          title="Katalog"
          actions={
            <Button onClick={() => setPanel({ bookId: null })}>
              Dodaj knjigo
            </Button>
          }
        />
        <BookList
          selectedId={panel?.bookId ?? null}
          onEdit={(id) => setPanel({ bookId: id })}
        />
      </div>
      {panel && (
        <BookPanel
          key={panel.bookId ?? "new"}
          bookId={panel.bookId}
          onSaved={(id) => setPanel({ bookId: id })}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
