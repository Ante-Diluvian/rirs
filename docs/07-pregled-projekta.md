# Pregled prevzetega projekta

Projekt **Librarium** smo v okviru menjave projektov prevzeli od druge skupine in ga forkali v repozitorij `hmerih22/rirs`. Ta dokument povzema stanje projekta ob prevzemu, izkušnjo z zagonom, ugotovljene pomanjkljivosti in načrt nadaljnjega dela.

## 1. Kratek opis projekta

Librarium je spletni sistem za lokalno knjižnico. Bralci iščejo po katalogu, vidijo razpoložljivost izvodov in rezervirajo knjige. Knjižničarji evidentirajo izposoje in vračila, sistem pa preverja pravila izposoje, vodi čakalno vrsto in računa zamudnine.

| Del | Tehnologije |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, Zustand |
| Backend | NestJS 12, Prisma ORM, JWT avtentikacija, Swagger |
| Baza | PostgreSQL (lokalno v Dockerju) |
| Testi | Jest, Supertest |
| Zagon | Docker Compose |

## 2. Zagon projekta

Projekt sem zagnal po navodilih v `LOKALNI-ZAGON.md`:

```bash
cp .env.example .env        # nastavil JWT_SECRET in ADMIN_PASSWORD
docker compose up --build
docker compose run --rm seed
```

- Aplikacija teče na <http://localhost:3000>, API na <http://localhost:3001>, Swagger na <http://localhost:3001/docs>.
- Navodila so jasna in popolna. Projekt se z enim ukazom zažene skupaj z bazo, migracijami in demo podatki.
- Seed ustvari administratorja in demo uporabnike z različnimi vlogami, zato je aplikacijo mogoče hitro preizkusiti.
- Pri prvem zagonu je gradnja backenda odpovedala pri `apk add openssl` (`TLS: unspecified error`). Šlo je za trenutno omrežno težavo pri prenosu paketov Alpine, ne za napako v projektu. Ob ponovnem zagonu je gradnja uspela.
- Aplikacijo sem preizkusil s prijavo kot administrator in kot demo knjižničarka (`ana.horvat@example.com`). Prijava, katalog z razpoložljivostjo izvodov in pregled knjig delujejo.

## 3. Dokumentacija

**Dobro:**

- Dokumentacija je obsežna in urejena: zasnova, funkcionalnosti z jasno označenim MVP, podatkovni model z ER diagramom, arhitektura, uporabniške zgodbe in wireframes.
- 23 arhitekturnih odločitev (ADR) v mapi `docs/adr` utemeljuje izbiro tehnologij in ključne poslovne odločitve.
- `LOKALNI-ZAGON.md` vsebuje predpogoje, naslove storitev in seznam demo uporabnikov.

**Pomanjkljivosti:**

- `README.md` povezuje na `docs/decisions/README.md`, ki ne obstaja. ADR-ji so v `docs/adr`.
- `README.md` povezuje na `docs/05-wireframes.md`, datoteka pa se imenuje `docs/06-wireframes.md`.
- `README.md` in `docs/04-arhitektura-in-tehnoloski-sklad.md` navajata `postgres:18-alpine`, `docker-compose.yml` pa uporablja `postgres:17-alpine`.
- `README.md` in `.nvmrc` navajata Node.js 22, enotni testi backenda pa na Node 22 ne delujejo (glej poglavje 5).

## 4. Koda in arhitektura

- Projekt je razdeljen na ločen frontend (`frontend/`) in backend (`backend/`), ki komunicirata prek REST API.
- Backend je razdeljen v module po domenah (`auth`, `books`, `authors`, `copies`, `loans`, `reservations`, `fines`, `members`, `settings`, `my-library`, `health`). Poslovna pravila (izposoja, zamudnine, čakalna vrsta) so izločena v posebne razrede, npr. `loan-policy.ts`, `fine-calculator.ts` in `reservation-policy.ts`.
- Dostop je urejen z JWT in guardi po vlogah (`roles.guard.ts`).
- Frontend ima strani za katalog, podrobnosti knjige, urejanje kataloga, pult knjižničarja, »moja knjižnica« in prijavo, kar pokriva funkcionalnosti MVP.
- Funkcionalnosti administratorja (statistika knjižnice, nastavljanje pravil izposoje) niso del MVP in na frontendu nimajo svoje strani, čeprav je zanje v `docs/wireframes` pripravljen wireframe `upravljanje.png`.
- Oba dela imata konfiguriran ESLint, backend tudi Prettier.

## 5. Testi

- Backend ima enotne teste (22 datotek `*.spec.ts`) za poslovna pravila, storitve, guarde in pomožne funkcije ter e2e teste (`backend/test`) za avtentikacijo, knjige, avtorje, izvode in katalog.
- E2E testi potrebujejo ločeno testno bazo `librarium_test`, ki jo ob prvem zagonu ustvari `db/init/01-test-db.sql`.
- Enotni testi backenda na Node 22, ki ga navajata `.nvmrc` in `README.md`, ne delujejo: 17 od 22 testnih datotek se ne naloži (`Must use import to load ES Module: @nestjs/common`). NestJS 12 je ES modul, Jest pa ga lahko naloži šele na Node 24.9 ali novejšem. V CI zato testi tečejo na Node 24.
- Frontend ob prevzemu ni imel testov, na voljo sta bila samo `lint` in `build`.

## 6. Povzetek ugotovitev

| Področje | Ocena | Komentar |
|---|---|---|
| Zagon | dobro | en ukaz, jasna navodila, demo podatki |
| Dokumentacija | dobro | obsežna, nekaj zastarelih povezav in neskladij |
| Struktura kode | dobro | jasna delitev na module, poslovna pravila izločena |
| Testi | delno | backend dobro pokrit, a ne deluje na navedeni različici Node; frontend brez testov |
| CI/CD | manjka | v repozitoriju ni mape `.github/workflows` |

## 7. Načrt nadaljnjega dela

1. Popraviti neskladja v dokumentaciji (povezave v `README.md`, različica PostgreSQL).
2. Vzpostaviti CI/CD z GitHub Actions:
   - **lint**: `npm run lint` za backend in frontend,
   - **build**: `npm run build` za backend in frontend,
   - **testi**: `npm test` in `npm run test:e2e` (s storitvijo PostgreSQL v workflowu), dodati teste za frontend,
   - **deploy** ob združitvi v vejo `main`.