"use client";

import { useId, useState, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { formErrors } from "@/lib/api";
import {
  copyStatusLabels,
  isManualStatus,
  MANUAL_COPY_STATUSES,
} from "./copy-status";
import {
  useCopies,
  useCreateCopy,
  useDeleteCopy,
  useUpdateCopy,
} from "./hooks";
import type { Copy, CopyStatus } from "./types";

const badgeStyles: Record<CopyStatus, string> = {
  AVAILABLE: "border-zinc-700 bg-white text-zinc-900",
  ON_LOAN: "border-zinc-800 bg-zinc-800 text-white",
  RESERVED: "border-dashed border-zinc-600 bg-zinc-100 text-zinc-800",
  LOST: "border-zinc-500 bg-zinc-200 text-zinc-700",
};

function CopyStatusBadge({ status }: { status: CopyStatus }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${badgeStyles[status]}`}
    >
      {copyStatusLabels[status]}
    </span>
  );
}

export function CopyList({ bookId }: { bookId: string }) {
  const headingId = useId();
  const copies = useCopies(bookId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm text-zinc-700">
          Izvodi
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Dodaj izvod
        </Button>
      </div>

      {adding && (
        <NewCopyForm bookId={bookId} onClose={() => setAdding(false)} />
      )}

      {copies.isPending ? (
        <p className="text-sm text-zinc-600">Nalaganje …</p>
      ) : copies.isError ? (
        <Alert>{copies.error.message}</Alert>
      ) : copies.data.length === 0 ? (
        <p className="text-sm text-zinc-600">Knjiga še nima izvodov.</p>
      ) : (
        <ul className="divide-y divide-zinc-300 border-b border-zinc-300">
          {copies.data.map((copy) => (
            <li key={copy.id}>
              {editingId === copy.id ? (
                <CopyEditor
                  bookId={bookId}
                  copy={copy}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-1.5 py-2 text-sm">
                  <span className="tabular-nums">{copy.inventoryNumber}</span>
                  <span>
                    <CopyStatusBadge status={copy.status} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingId(copy.id)}
                    className="underline hover:text-zinc-600"
                  >
                    Uredi
                    <span className="sr-only">
                      {" "}
                      izvod {copy.inventoryNumber}
                    </span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewCopyForm({
  bookId,
  onClose,
}: {
  bookId: string;
  onClose: () => void;
}) {
  const create = useCreateCopy(bookId);
  const [form, setForm] = useState({ inventoryNumber: "", shelf: "" });
  const errors = formErrors(create.error);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(form, { onSuccess: onClose });
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Nov izvod"
      className="space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Inventarna številka"
          value={form.inventoryNumber}
          error={errors.fields.inventoryNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              inventoryNumber: event.target.value,
            }))
          }
        />
        <Input
          label="Polica"
          value={form.shelf}
          error={errors.fields.shelf}
          onChange={(event) =>
            setForm((current) => ({ ...current, shelf: event.target.value }))
          }
        />
      </div>
      {errors.message && <Alert>{errors.message}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Prekliči
        </Button>
        <Button type="submit" size="sm" disabled={create.isPending}>
          Dodaj
        </Button>
      </div>
    </form>
  );
}

interface CopyEditorProps {
  bookId: string;
  copy: Copy;
  onClose: () => void;
}

function CopyEditor({ bookId, copy, onClose }: CopyEditorProps) {
  const update = useUpdateCopy(bookId);
  const remove = useDeleteCopy(bookId);
  const [shelf, setShelf] = useState(copy.shelf ?? "");
  const [status, setStatus] = useState<CopyStatus>(copy.status);
  const manual = isManualStatus(copy.status);
  const errors = formErrors(update.error);
  // US-07 AC3: razlog in predlog, naj se izvod označi kot izgubljen
  const message = errors.message ?? remove.error?.message;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    remove.reset();
    update.mutate(
      { id: copy.id, shelf, ...(isManualStatus(status) ? { status } : {}) },
      { onSuccess: onClose },
    );
  }

  function onDelete() {
    if (!window.confirm(`Izbrišem izvod ${copy.inventoryNumber}?`)) return;
    update.reset();
    remove.mutate(copy.id, { onSuccess: onClose });
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label={`Izvod ${copy.inventoryNumber}`}
      className="space-y-3 bg-zinc-50 p-3"
    >
      <p className="text-sm font-medium tabular-nums">{copy.inventoryNumber}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Polica"
          value={shelf}
          error={errors.fields.shelf}
          onChange={(event) => setShelf(event.target.value)}
        />
        <Select
          label="Stanje"
          value={status}
          disabled={!manual}
          error={errors.fields.status}
          onChange={(event) => setStatus(event.target.value as CopyStatus)}
        >
          {(manual ? MANUAL_COPY_STATUSES : [copy.status]).map((option) => (
            <option key={option} value={option}>
              {copyStatusLabels[option]}
            </option>
          ))}
        </Select>
      </div>
      {message && <Alert>{message}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onDelete}
          disabled={remove.isPending}
        >
          Izbriši izvod
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Prekliči
          </Button>
          <Button type="submit" size="sm" disabled={update.isPending}>
            Shrani
          </Button>
        </div>
      </div>
    </form>
  );
}
