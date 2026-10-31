import { useId, type InputHTMLAttributes } from "react";

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
        className={`block w-full rounded-md border bg-white px-3 py-2 outline-none focus:ring-2 ${
          error
            ? "border-2 border-red-700 focus:ring-red-200"
            : "border-zinc-400 focus:border-zinc-700 focus:ring-zinc-200"
        }`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
