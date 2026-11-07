"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { fieldClasses } from "@/components/Field";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { memberLabel } from "./format";
import { useMemberSearch } from "./hooks";
import type { Member } from "./types";

interface MemberPickerProps {
  value: Member | null;
  onChange: (member: Member | null) => void;
}

// iskanje člana po imenu, priimku ali e-pošti s predlogi
export function MemberPicker({ value, onChange }: MemberPickerProps) {
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState(value ? memberLabel(value) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebouncedValue(value ? "" : text.trim(), 250);
  const search = useMemberSearch(query);

  const options = search.data ?? [];
  const showList = open && !value && text.trim() !== "" && query !== "";
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  function choose(member: Member) {
    onChange(member);
    setText(memberLabel(member));
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (!showList || options.length === 0) {
      return;
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm text-zinc-700">
        Član
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && options.length > 0
              ? `${listId}-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(0);
            // sprememba besedila prekliče izbiro
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="ime, priimek ali e-pošta"
          className={`block w-full rounded-md border bg-white px-3 py-2 outline-none focus-within:ring-2 ${fieldClasses()}`}
        />

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Člani"
            className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-400 bg-white py-1 text-sm shadow-md"
          >
            {search.isError ? (
              <li className="px-3 py-1.5 text-red-700">
                {search.error.message}
              </li>
            ) : search.isPending ? (
              <li className="px-3 py-1.5 text-zinc-600">Iskanje …</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-1.5 text-zinc-600">
                Noben član ne ustreza iskanju
              </li>
            ) : (
              options.map((member, index) => (
                <li
                  key={member.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // klik ne sme vzeti fokusa vnosu, sicer se seznam zapre
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(member)}
                  className={`cursor-pointer px-3 py-1.5 ${
                    index === activeIndex ? "bg-zinc-100" : ""
                  }`}
                >
                  {member.firstName} {member.lastName}{" "}
                  <span className="text-zinc-600">{member.email}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
