"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useId, useRef, type ReactNode, type Ref } from "react";
import { Alert } from "@/components/Alert";
import { PageHeader } from "@/components/PageHeader";
import type { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useMyLoans, useMyReservations, useMySummary } from "./hooks";
import { LoanTable } from "./LoanTable";
import { ReservationTable } from "./ReservationTable";
import { SummaryCards } from "./SummaryCards";

function Section<T>({
  title,
  query,
  empty,
  headingRef,
  children,
}: {
  title: string;
  query: UseQueryResult<T[], ApiError>;
  empty: string;
  headingRef?: Ref<HTMLHeadingElement>;
  children: (items: T[]) => ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-lg focus:outline-none"
      >
        {title}
      </h2>
      {query.isPending ? (
        <p className="text-sm text-zinc-600">Nalaganje …</p>
      ) : query.isError ? (
        <Alert>{query.error.message}</Alert>
      ) : query.data.length === 0 ? (
        <p className="text-sm text-zinc-600">{empty}</p>
      ) : (
        children(query.data)
      )}
    </section>
  );
}

// stran bralca po W-04: povzetek, izposoje in rezervacije
export function MyLibrary() {
  const summary = useMySummary();
  const loans = useMyLoans();
  const reservations = useMyReservations();
  const reservationsHeading = useRef<HTMLHeadingElement>(null);

  return (
    <>
      <PageHeader
        title="Moja knjižnica"
        description={
          summary.data
            ? `Danes je ${formatDate(summary.data.today)}.`
            : undefined
        }
      />
      <div className="space-y-8">
        {summary.isError ? (
          <Alert>{summary.error.message}</Alert>
        ) : (
          <SummaryCards summary={summary.data} />
        )}
        <Section
          title="Izposoje"
          query={loans}
          empty="Nimaš izposojenih knjig."
        >
          {(items) => <LoanTable loans={items} />}
        </Section>
        <Section
          title="Rezervacije"
          query={reservations}
          empty="Nimaš aktivnih rezervacij."
          headingRef={reservationsHeading}
        >
          {(items) => (
            <ReservationTable
              reservations={items}
              // preklicana vrstica izgine, zato fokus ne sme ostati na njej
              onCancelled={() => reservationsHeading.current?.focus()}
            />
          )}
        </Section>
      </div>
    </>
  );
}
