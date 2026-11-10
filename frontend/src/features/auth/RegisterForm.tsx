"use client";

import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { formErrors } from "@/lib/api";
import { useRegister, type RegisterInput } from "./hooks";

const emptyForm: RegisterInput = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

export function RegisterForm() {
  const register = useRegister();
  const [form, setForm] = useState(emptyForm);
  const errors = formErrors(register.error);

  function field(name: keyof RegisterInput) {
    return {
      value: form[name],
      error: errors.fields[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        setForm((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    register.mutate(form);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Ime" autoComplete="given-name" {...field("firstName")} />
        <Input
          label="Priimek"
          autoComplete="family-name"
          {...field("lastName")}
        />
      </div>
      <Input
        label="E-pošta"
        type="email"
        autoComplete="email"
        {...field("email")}
      />
      <Input
        label="Geslo"
        type="password"
        autoComplete="new-password"
        {...field("password")}
      />
      {errors.message && <Alert>{errors.message}</Alert>}
      <Button type="submit" disabled={register.isPending} className="w-full">
        Ustvari račun
      </Button>
    </form>
  );
}
