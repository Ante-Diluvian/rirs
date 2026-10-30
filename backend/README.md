# Librarium – backend

REST API Librariuma: NestJS 12 s CommonJS, Jest in ESLint.

- Spremenljivke okolja bere iz `.env` v korenu repozitorija (glej `../.env.example`).
- Swagger je na `/docs`, opis OpenAPI v JSON na `/docs-json`.
- `GET /health` vrne `{ "status": "ok" }`.

| Ukaz | Namen |
|---|---|
| `npm run start:dev` | razvojni strežnik na vratih `PORT` (privzeto 3001) |
| `npm run lint` | ESLint (`npm run lint:fix` popravi, kar zna) |
| `npm run build` | gradnja v `dist/` |
| `npm test` | enotni testi (`src/**/*.spec.ts`) |
| `npm run test:e2e` | e2e testi (`test/*.e2e-spec.ts`) |

Paketi NestJS 12 so moduli ESM. Backend jih kot CommonJS naloži z `require()`, ki ga Node.js podpira od različice 22.12, Jest pa zato teče z zastavico `--experimental-vm-modules`.

Celotna navodila za zagon so v [README v korenu](../README.md).
