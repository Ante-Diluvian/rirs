"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { FieldError, fieldClasses } from "@/components/Field";
import { Input } from "@/components/Input";
import { formErrors } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { authorName } from "./format";
import { useAuthorSearch, useCreateAuthor } from "./hooks";
import type { AuthorName, CreateAuthorInput } from "./types";

interface AuthorPickerProps {
  value: AuthorName[];
  onChange: (authors: AuthorName[]) => void;
  error?: string;
}

// zadnja beseda je priimek, npr. »Fran Saleški Finžgar«
function splitName(text: string): CreateAuthorInput {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lastName = words.pop() ?? "";
  return { firstName: words.join(" "), lastName };
}

export function AuthorPicker({ value, onChange, error }: AuthorPickerProps) {
  const inputId = useId();
  const listId = useId();
  const errorId = `${inputId}-error`;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState<CreateAuthorInput | null>(null);
  const query = useDebouncedValue(text.trim(), 250);
  const search = useAuthorSearch(query);

  const selectedIds = new Set(value.map((author) => author.id));
  const options = (search.data ?? []).filter(
    (author) => !selectedIds.has(author.id),
  );
  const showList = open && text.trim() !== "";
  // zadnja možnost je nov avtor
  const optionCount = options.length + 1;
  const activeIndex = Math.min(active, optionCount - 1);

  function add(author: AuthorName) {
    onChange([...value, author]);
    setText("");
    setActive(0);
  }

  function remove(id: string) {
    onChange(value.filter((author) => author.id !== id));
  }

  function startDraft() {
    setDraft(splitName(text));
    setOpen(false);
  }

  function choose(index: number) {
    if (index < options.length) add(options[index]);
    else startDraft();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && text === "" && value.length > 0) {
      remove(value[value.length - 1].id);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (text.trim() === "") {
      return;
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setOpen(true);
      setActive((current) => (current + step + optionCount) % optionCount);
    } else if (event.key === "Enter") {
      // Enter izbere avtorja, ne shrani knjige
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm text-zinc-700">
        Avtorji
      </label>
      <div className="relative">
        <div
          className={`flex flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 focus-within:ring-2 ${fieldClasses(error)}`}
        >
          {value.map((author) => (
            <span
              key={author.id}
              className="inline-flex items-center gap-1 rounded border border-zinc-500 px-2 py-0.5 text-sm"
            >
              {authorName(author)}
              <button
                type="button"
                onClick={() => remove(author.id)}
                aria-label={`Odstrani avtorja ${authorName(author)}`}
                className="text-zinc-600 hover:text-zinc-900"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={inputId}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList ? `${listId}-${activeIndex}` : undefined
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="dodaj avtorja …"
            className="min-w-32 flex-1 bg-transparent px-1 py-0.5 outline-none"
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Avtorji"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-400 bg-white py-1 text-sm shadow-md"
          >
            {[...options, null].map((author, index) => (
              <li
                key={author?.id ?? "new"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // klik ne sme vzeti fokusa vnosu, sicer se seznam zapre
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`cursor-pointer px-3 py-1.5 ${
                  index === activeIndex ? "bg-zinc-100" : ""
                }`}
              >
                {author ? authorName(author) : `+ Nov avtor: ${text.trim()}`}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}

      {draft && (
        <NewAuthorForm
          initial={draft}
          onCreated={(author) => {
            add(author);
            setDraft(null);
          }}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  );
}

interface NewAuthorFormProps {
  initial: CreateAuthorInput;
  onCreated: (author: AuthorName) => void;
  onCancel: () => void;
}

// brez elementa form, ker je znotraj obrazca knjige
function NewAuthorForm({ initial, onCreated, onCancel }: NewAuthorFormProps) {
  const create = useCreateAuthor();
  const [form, setForm] = useState(initial);
  const errors = formErrors(create.error);

  function submit() {
    create.mutate(form, { onSuccess: onCreated });
  }

  return (
    <div
      role="group"
      aria-label="Nov avtor"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          submit();
        }
      }}
      className="mt-2 space-y-3 rounded-md border border-zinc-300 bg-zinc-50 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Ime"
          value={form.firstName}
          error={errors.fields.firstName}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              firstName: event.target.value,
            }))
          }
        />
        <Input
          label="Priimek"
          value={form.lastName}
          error={errors.fields.lastName}
          onChange={(event) =>
            setForm((current) => ({ ...current, lastName: event.target.value }))
          }
        />
      </div>
      {errors.message && <Alert>{errors.message}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Prekliči
        </Button>
        <Button size="sm" onClick={submit} disabled={create.isPending}>
          Dodaj avtorja
        </Button>
      </div>
    </div>
  );
}
