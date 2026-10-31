import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { authorKeys, bookKeys, genreKeys } from "./keys";
import {
  fetchBook,
  fetchBooks,
  fetchGenres,
  forgetBook,
  rememberBook,
} from "./placeholder";
import type {
  AuthorName,
  Book,
  BookListParams,
  BookPage,
  Copy,
  CreateAuthorInput,
  CreateCopyInput,
  SaveBookInput,
  UpdateCopyInput,
} from "./types";

function send<T>(path: string, method: string, body?: unknown) {
  return api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function useBooks(params: BookListParams) {
  return useQuery<BookPage, ApiError>({
    queryKey: bookKeys.list(params),
    queryFn: () => fetchBooks(params),
    placeholderData: keepPreviousData,
  });
}

export function useBook(id: string) {
  return useQuery<Book, ApiError>({
    queryKey: bookKeys.detail(id),
    queryFn: () => fetchBook(id),
  });
}

export function useGenres() {
  return useQuery<string[], ApiError>({
    queryKey: genreKeys.all,
    queryFn: fetchGenres,
  });
}

export function useAuthorSearch(q: string) {
  return useQuery<AuthorName[], ApiError>({
    queryKey: authorKeys.search(q),
    queryFn: () => api<AuthorName[]>(`/authors?${new URLSearchParams({ q })}`),
    enabled: q !== "",
    placeholderData: keepPreviousData,
  });
}

export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation<AuthorName, ApiError, CreateAuthorInput>({
    mutationFn: (input) => send("/authors", "POST", input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authorKeys.all }),
  });
}

// brez id ustvari novo knjigo
export function useSaveBook(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation<Book, ApiError, SaveBookInput>({
    mutationFn: (input) =>
      id ? send(`/books/${id}`, "PUT", input) : send("/books", "POST", input),
    onSuccess: (book) => {
      rememberBook(book);
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => send(`/books/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      forgetBook(id);
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}

export function useCopies(bookId: string) {
  return useQuery<Copy[], ApiError>({
    queryKey: bookKeys.copies(bookId),
    queryFn: () => api<Copy[]>(`/books/${bookId}/copies`),
  });
}

// vsak izvod spremeni tudi števili izvodov v seznamu knjig
function useRefreshCopies(bookId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: bookKeys.copies(bookId) }),
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() }),
    ]);
}

export function useCreateCopy(bookId: string) {
  const refresh = useRefreshCopies(bookId);
  return useMutation<Copy, ApiError, CreateCopyInput>({
    mutationFn: (input) => send(`/books/${bookId}/copies`, "POST", input),
    onSuccess: refresh,
  });
}

export function useUpdateCopy(bookId: string) {
  const refresh = useRefreshCopies(bookId);
  return useMutation<Copy, ApiError, UpdateCopyInput>({
    mutationFn: ({ id, ...input }) => send(`/copies/${id}`, "PATCH", input),
    onSuccess: refresh,
  });
}

export function useDeleteCopy(bookId: string) {
  const refresh = useRefreshCopies(bookId);
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => send(`/copies/${id}`, "DELETE"),
    onSuccess: refresh,
  });
}
