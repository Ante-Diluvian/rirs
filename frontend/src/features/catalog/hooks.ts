import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { authorKeys, bookKeys, genreKeys } from "./keys";
import type {
  AuthorName,
  Book,
  BookDetail,
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

export function useBooks({ q, page, genre, available }: BookListParams) {
  const params = new URLSearchParams({ q, page: String(page) });
  if (genre) params.set("genre", genre);
  if (available) params.set("available", "true");
  return useQuery<BookPage, ApiError>({
    queryKey: bookKeys.list({ q, page, genre, available }),
    queryFn: () => api<BookPage>(`/books?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useBook(id: string) {
  return useQuery<BookDetail, ApiError>({
    queryKey: bookKeys.detail(id),
    queryFn: () => api<BookDetail>(`/books/${id}`),
  });
}

export function useGenres() {
  return useQuery<string[], ApiError>({
    queryKey: genreKeys.all,
    queryFn: () => api<string[]>("/genres"),
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
    onSuccess: async (book) => {
      if (id) {
        // urejanje ne spremeni razpoložljivosti in rezervacij
        queryClient.setQueryData<BookDetail>(
          bookKeys.detail(book.id),
          (old) => old && { ...old, ...book },
        );
      } else {
        // novo knjigo naložimo, preden jo obrazec prikaže za urejanje
        await queryClient.prefetchQuery({
          queryKey: bookKeys.detail(book.id),
          queryFn: () => api<BookDetail>(`/books/${book.id}`),
        });
      }
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => send(`/books/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
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

// vsak izvod spremeni tudi razpoložljivost knjige in števili v seznamu,
// ključ podrobnosti vključuje tudi seznam izvodov
function useRefreshCopies(bookId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
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
