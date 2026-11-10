"use client";

import {
  useId,
  useRef,
  useState,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { formErrors } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useReturnCopy, useReturnPreview } from "./hooks";
import { ReturnSummary } from "./ReturnSummary";
import type { ReturnResult } from "./types";

// US-04 AC3: kam z vrnjenim izvodom
function ShelfInstruction({ result }: { result: ReturnResult }) {
  const { reservedFor } = result;
  return (
    <Alert tone="info">
      <p className="text-xs text-zinc-600">
        Vračilo izvoda {result.inventoryNumber} je evidentirano.
      </p>
      {reservedFor ? (
        <>
          <p className="font-medium">
            Odloži na polico rezervacij za: {reservedFor.firstName}{" "}
            {reservedFor.lastName}
          </p>
          <p className="text-xs">
            Rezervacija je na voljo do {formatDate(reservedFor.readyUntil)}.
          </p>
        </>
      ) : (
        <p className="font-medium">Izvod vrni na polico</p>
      )}
    </Alert>
  );
}

// plošča Vračilo na pultu (W-05)
export function ReturnPanel() {
  const headingId = useId();
  const inventoryRef = useRef<HTMLInputElement>(null);
  const [inventoryNumber, setInventoryNumber] = useState("");
  const typed = inventoryNumber.trim();
  const inventory = useDebouncedValue(typed, 300);
  const preview = useReturnPreview(inventory || null);
  const returnCopy = useReturnCopy();
  const previewErrors = formErrors(preview.error);
  const returnErrors = formErrors(returnCopy.error);

  // predogled mora veljati za trenutni vnos
  const current = typed !== "" && inventory === typed;
  const loan = current && !preview.isError ? preview.data : undefined;
  const canReturn = loan !== undefined && !preview.isFetching;
  const returned = returnCopy.data;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReturn) return;
    returnCopy.mutate(loan.inventoryNumber, {
      onSuccess: () => {
        setInventoryNumber("");
        inventoryRef.current?.focus();
      },
    });
  }

  let content: ReactNode = null;
  if (returned) {
    content = (
      <>
        <ReturnSummary loan={returned} />
        <ShelfInstruction result={returned} />
      </>
    );
  } else if (typed === "") {
    content = (
      <p className="text-sm text-zinc-600">Vnesi inventarno številko izvoda.</p>
    );
  } else if (current && previewErrors.message) {
    content = <Alert>{previewErrors.message}</Alert>;
  } else if (loan) {
    content = <ReturnSummary loan={loan} />;
  } else if (!(current && preview.isError)) {
    content = <p className="text-sm text-zinc-600">Iskanje izposoje …</p>;
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-md border border-zinc-400 bg-white p-4"
    >
      <h2 id={headingId} className="text-lg">
        Vračilo
      </h2>

      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Input
          ref={inventoryRef}
          label="Inventarna številka izvoda"
          value={inventoryNumber}
          autoComplete="off"
          placeholder="npr. INV-000412"
          error={
            previewErrors.fields.inventoryNumber ??
            returnErrors.fields.inventoryNumber
          }
          onChange={(event) => {
            setInventoryNumber(event.target.value);
            returnCopy.reset();
          }}
        />

        <div aria-live="polite" className="space-y-3">
          {content}
        </div>

        {/* po zavrnitvi se predogled osveži in pokaže isti razlog */}
        {returnErrors.message &&
          returnErrors.message !== previewErrors.message && (
            <Alert>{returnErrors.message}</Alert>
          )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canReturn || returnCopy.isPending}>
            Potrdi vračilo
          </Button>
        </div>
      </form>
    </section>
  );
}
