"use client";

import { useId, useRef, useState, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { MemberPicker } from "@/features/members/MemberPicker";
import { MemberSummaryCard } from "@/features/members/MemberSummaryCard";
import type { Member } from "@/features/members/types";
import { formErrors } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCreateLoan, useLoanCheck } from "./hooks";
import { RuleChecklist } from "./RuleChecklist";

// plošča Izposoja na pultu (W-05)
export function LoanPanel() {
  const headingId = useId();
  const rulesId = useId();
  const inventoryRef = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [inventoryNumber, setInventoryNumber] = useState("");
  const typed = inventoryNumber.trim();
  const inventory = useDebouncedValue(typed, 300);
  const request =
    member && inventory
      ? { memberId: member.id, inventoryNumber: inventory }
      : null;
  const check = useLoanCheck(request);
  const create = useCreateLoan();
  const checkErrors = formErrors(check.error);
  const createErrors = formErrors(create.error);

  // preverjanje mora veljati za trenutni vnos
  const result = check.data && inventory === typed ? check.data : null;
  const allowed =
    result !== null &&
    !check.isFetching &&
    result.checks.every((rule) => rule.passed);

  function changeMember(next: Member | null) {
    setMember(next);
    create.reset();
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || !request) return;
    create.mutate(request, {
      onSuccess: () => {
        setInventoryNumber("");
        inventoryRef.current?.focus();
      },
    });
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-md border border-zinc-400 bg-white p-4"
    >
      <h2 id={headingId} className="text-lg">
        Izposoja
      </h2>

      <div className="space-y-2">
        <MemberPicker value={member} onChange={changeMember} />
        {member && <MemberSummaryCard memberId={member.id} />}
      </div>

      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Input
          ref={inventoryRef}
          label="Inventarna številka izvoda"
          value={inventoryNumber}
          autoComplete="off"
          placeholder="npr. INV-002301"
          error={
            checkErrors.fields.inventoryNumber ??
            createErrors.fields.inventoryNumber
          }
          onChange={(event) => {
            setInventoryNumber(event.target.value);
            create.reset();
          }}
        />

        <div aria-labelledby={rulesId} aria-live="polite" role="group">
          <h3 id={rulesId} className="mb-1.5 text-sm text-zinc-700">
            Preverjanje pravil
          </h3>
          {!member || typed === "" ? (
            <p className="text-sm text-zinc-600">
              {member
                ? "Vnesi inventarno številko izvoda."
                : "Izberi člana in vnesi inventarno številko izvoda."}
            </p>
          ) : checkErrors.message && inventory === typed ? (
            <Alert>{checkErrors.message}</Alert>
          ) : result ? (
            <RuleChecklist checks={result.checks} />
          ) : (
            !check.isError && (
              <p className="text-sm text-zinc-600">Preverjanje …</p>
            )
          )}
        </div>

        {createErrors.message && <Alert>{createErrors.message}</Alert>}
        {create.isSuccess && (
          <Alert tone="success">
            Izposoja je evidentirana: {create.data.title} (
            {create.data.inventoryNumber}). Rok vrnitve:{" "}
            <strong>{formatDate(create.data.dueDate)}</strong>.
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {result &&
              `Rok vrnitve: ${formatDate(result.dueDate)} (${result.loanPeriodDays} ${plural(
                result.loanPeriodDays,
                ["dan", "dneva", "dnevi", "dni"],
              )})`}
          </p>
          <Button
            type="submit"
            disabled={!allowed || create.isPending}
            className="ml-auto"
          >
            Evidentiraj izposojo
          </Button>
        </div>
      </form>
    </section>
  );
}
