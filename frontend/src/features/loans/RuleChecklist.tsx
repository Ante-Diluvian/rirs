import type { LoanRuleCheck } from "./types";

// izpolnjeno pravilo s kljukico, neizpolnjeno z razlogom
export function RuleChecklist({ checks }: { checks: LoanRuleCheck[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {checks.map((check) => (
        <li
          key={check.rule}
          className={`flex items-start gap-2 ${check.passed ? "" : "text-red-800"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[0.65rem] leading-none ${
              check.passed
                ? "border-zinc-700 text-zinc-900"
                : "border-red-700 bg-red-700 text-white"
            }`}
          >
            {check.passed ? "✓" : "✕"}
          </span>
          <span>
            <span className="sr-only">
              {check.passed ? "Izpolnjeno: " : "Ni izpolnjeno: "}
            </span>
            {check.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
