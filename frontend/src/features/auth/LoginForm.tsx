"use client";

import { useState, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { formErrors } from "@/lib/api";
import { useLogin } from "./hooks";

export function LoginForm({ onRegister }: { onRegister: () => void }) {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errors = formErrors(login.error);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {errors.message && <Alert>{errors.message}</Alert>}
      <Input
        label="E-pošta"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.fields.email}
      />
      <Input
        label="Geslo"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.fields.password}
      />
      <Button type="submit" disabled={login.isPending} className="w-full">
        Prijava
      </Button>
      <p className="text-center text-sm text-zinc-600">
        Nimaš računa?{" "}
        <button
          type="button"
          onClick={onRegister}
          className="text-zinc-900 underline hover:text-zinc-600"
        >
          Registriraj se
        </button>
      </p>
    </form>
  );
}
