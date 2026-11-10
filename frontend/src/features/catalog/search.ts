// US-02 AC1: iskanje šele od 3 znakov naprej
export const MIN_QUERY_LENGTH = 3;

// krajši niz v URL se ne pošlje, ker bi ga backend zavrnil
export function searchQuery(q: string) {
  return q.length >= MIN_QUERY_LENGTH ? q : "";
}
