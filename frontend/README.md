# Librarium – frontend

Spletni vmesnik Librariuma: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.

- Next.js je samo frontend: brez API routes in strežniških akcij ([ADR-0001](../docs/adr/0001-locen-frontend-in-backend.md)). Podatki prihajajo z backenda na `NEXT_PUBLIC_API_URL`.
- Spremenljivke okolja bere iz `.env` v korenu repozitorija (glej `../.env.example`). Vrednosti `NEXT_PUBLIC_*` se vgradijo ob gradnji.
- Poti strani so slovenske (`/prijava`, `/katalog`, `/pult` …), ker so del vmesnika.

| Ukaz | Namen |
|---|---|
| `npm run dev` | razvojni strežnik na <http://localhost:3000> |
| `npm run lint` | ESLint |
| `npm run build` | produkcijska gradnja |

Celotna navodila za zagon so v [README v korenu](../README.md).
