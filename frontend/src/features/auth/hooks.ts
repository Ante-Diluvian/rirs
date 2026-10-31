import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";
import { homePath } from "./home-path";

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  firstName: string;
  lastName: string;
}

function useSignIn() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  return ({ accessToken, user }: AuthResponse) => {
    login(accessToken, user);
    router.replace(homePath(user.role));
  };
}

// predpomnilnik poizvedb ob odjavi počisti Providers
export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  return () => {
    logout();
    router.replace("/prijava");
  };
}

function post<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function useLogin() {
  const signIn = useSignIn();
  return useMutation<AuthResponse, ApiError, LoginInput>({
    mutationFn: (input) => post("/auth/login", input),
    onSuccess: signIn,
  });
}

// registracija vrne žeton, zato je uporabnik takoj prijavljen
export function useRegister() {
  const signIn = useSignIn();
  return useMutation<AuthResponse, ApiError, RegisterInput>({
    mutationFn: (input) => post("/auth/register", input),
    onSuccess: signIn,
  });
}
