import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const UNEXPECTED_ERROR = "Prišlo je do napake. Poskusi znova.";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ErrorBody {
  message?: string | string[];
  errors?: Record<string, string>;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // strežnik ni dosegljiv
    throw new ApiError(0, UNEXPECTED_ERROR);
  }

  if (!res.ok) {
    const body: ErrorBody = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new ApiError(res.status, message ?? UNEXPECTED_ERROR, body.errors);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// ob napakah po poljih obrazec ne prikaže splošnega sporočila
export function formErrors(error: ApiError | null) {
  const fields = error?.fieldErrors ?? {};
  const message =
    error && Object.keys(fields).length === 0 ? error.message : null;
  return { fields, message };
}
