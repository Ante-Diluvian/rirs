import { useId, type SelectHTMLAttributes } from "react";
import { FieldError, fieldClasses } from "./Field";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({
  label,
  error,
  id,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1 block text-sm text-zinc-700">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-md border bg-white px-3 py-2 outline-none focus-within:ring-2 disabled:bg-zinc-100 disabled:text-zinc-500 ${fieldClasses(error)}`}
        {...props}
      >
        {children}
      </select>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
