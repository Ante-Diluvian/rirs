# Librarium – backend

REST API Librariuma: NestJS 12 s CommonJS, Jest in ESLint.

- Spremenljivke okolja bere iz `.env` v korenu repozitorija (glej `../.env.example`).
- Swagger je na `/docs`, opis OpenAPI v JSON na `/docs-json`.
- `GET /health` vrne `{ "status": "ok" }`.
- Baza: Prisma 7 z adapterjem `@prisma/adapter-pg`. Shema je v `prisma/schema.prisma`, migracije v `prisma/migrations`. Odjemalec se ustvari v `src/generated/prisma` (ni v gitu) ob `npm install`.
- Vse tabele so v shemi PostgreSQL `librarium` (`@@schema` v Prismi, `search_path` v `PrismaService`). Z `?schema=librarium` v `DATABASE_URL` je tam tudi tabela `_prisma_migrations`.

| Ukaz | Namen |
|---|---|
| `npm run start:dev` | razvojni strežnik na vratih `PORT` (privzeto 3001) |
| `npm run lint` | ESLint (`npm run lint:fix` popravi, kar zna) |
| `npm run build` | gradnja v `dist/` |
| `npm test` | enotni testi (`src/**/*.spec.ts`) |
| `npm run test:e2e` | e2e testi (`test/*.e2e-spec.ts`) na bazi `*_test` iz `.env.test` |
| `npx prisma migrate dev` | uveljavi migracije na razvojni bazi |
| `npx prisma migrate dev --name <ime>` | nova migracija po spremembi sheme |
| `npx prisma generate` | ponovno ustvari odjemalca Prisma |
| `npm run db:seed` | začetni podatki (enako `npx prisma db seed`) |

## Začetni podatki

`npm run db:seed` ustvari administratorja iz `ADMIN_EMAIL` in `ADMIN_PASSWORD`, privzete nastavitve pravil in demo podatke. Brez `ADMIN_EMAIL`, `ADMIN_PASSWORD` ali `DEMO_PASSWORD` konča z napako. Ponoven zagon je varen: nič se ne podvoji, nastavitve, ki jih je spremenil administrator, ostanejo. Datumi demo izposoj in rezervacij so relativni na današnji dan.

Demo uporabniki imajo geslo iz `DEMO_PASSWORD`:

| E-pošta | Vloga | Stanje |
|---|---|---|
| `ana.horvat@example.com` | knjižničarka | evidentirala je demo izposoje |
| `maja.kovac@example.com` | bralka | 3 izposoje (Alamut zamujen 5 dni, Dune z rokom čez 2 dni), 1984 3. v vrsti, Visoška kronika na voljo |
| `janez.novak@example.com` | bralec | Alamut `INV-000412` zamujen 5 dni, 1984 1. v vrsti |
| `luka.zupan@example.com` | bralec | 1. v vrsti za Alamut, 2. za 1984 |
| `nina.golob@example.com` | bralka | 5 izposoj, kar je največ dovoljeno |
| `tomaz.mlakar@example.com` | bralec | 2 izposoji |
| `petra.kralj@example.com` | bralka | neplačana zamudnina 6,20 € (nad mejo 5,00 €) |

Katalog ima 51 knjig s 77 izvodi. ISBN-ji so izmišljeni, z veljavno kontrolno števko.

