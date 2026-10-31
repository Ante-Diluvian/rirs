import { useId, type InputHTMLAttributes } from "react";
import { FieldError, fieldClasses } from "./Field";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1 block text-sm text-zinc-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-md border bg-white px-3 py-2 outline-none focus-within:ring-2 ${fieldClasses(error)}`}
        {...props}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
