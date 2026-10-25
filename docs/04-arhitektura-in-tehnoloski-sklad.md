# 04 – Arhitektura in tehnološki sklad

## 1. Arhitektura

### Glavni deli sistema

| Del | Naloga |
|---|---|
| **Frontend** | spletni vmesnik za bralce, knjižničarje in administratorje, prikazuje podatke in pošilja zahteve backendu |
| **Backend (REST API)** | poslovna logika (pravila izposoje, čakalna vrsta, zamudnine), avtentikacija, avtorizacija po vlogah in dostop do baze, vključuje planirana opravila |
| **Podatkovna baza** | trajna hramba vseh podatkov (člani, katalog, izposoje, rezervacije, nastavitve) |

Frontend in backend sta ločena

### Komunikacija med deli

- **Frontend → Backend:** REST klici v formatu JSON prek HTTP(S). Ob vsakem klicu frontend pošlje žeton uporabnika v glavi `Authorization: Bearer`. Backend dovoli zahteve (CORS) samo z izvora frontenda.
- **Backend → Baza:** SQL poizvedbe prek odjemalca Prisma. Operacije, ki spreminjajo več tabel hkrati (izposoja, vračilo, prehod rezervacije), se izvedejo v eni transakciji (`prisma.$transaction`).
- **Planirana opravila:** tečejo znotraj backend procesa (`@nestjs/schedule`) in enkrat dnevno posodobijo stanja rezervacij in izposoj.


### Podatkovna baza

- Relacijska baza **PostgreSQL** z modelom iz `03-podatkovni-model.md`.
- Shema je opisana v datoteki `schema.prisma`, spremembe sheme se izvajajo z orodjem Prisma Migrate (`prisma migrate`).
- Primarna baza je **PostgreSQL v oblaku (Supabase)**. Supabase se uporablja samo kot upravljan PostgreSQL, avtentikacija ostane v NestJS (Supabase Auth se ne uporablja).
- Lokalna baza je **PostgreSQL v docker-ju**. Lokalna baza se uporablja za razvoj ali po želji, če se želi lokalna baza.
- Aplikacija se z bazo poveže samo prek spremenljivke `DATABASE_URL`. Prisma Migrate uporablja neposredno povezavo, aplikacija pa lahko uporablja pooler.

### Avtentikacija in upravljanje uporabnikov

- Prijava z **e-pošto in geslom**. Gesla se shranijo samo zgoščena z algoritmom **bcrypt**.
- Po uspešni prijavi backend izda **JWT**, ki vsebuje identifikator uporabnika in vlogo. Žeton ima kratko veljavnost (1 ura). Osvežilni žetoni niso del prve različice.
- Backend na vsaki končni točki preveri žeton in vlogo (**nadzor dostopa po vlogah**) z NestJS guardi (`JwtAuthGuard`, `RolesGuard`). Bralec lahko dostopa samo do svojih podatkov, knjižničar do operativnih funkcij, administrator do nastavitev in statistike.
- Registracija ustvari račun z vlogo *bralec*. Vloge *knjižničar* in *administrator* dodeli samo administrator.

### Končne točke API

| Metoda in pot | Namen | Vloga |
|---|---|---|
| `POST /auth/login` | prijava, vrne žeton | vsi |
| `POST /auth/register` | registracija bralca | javno |
| `GET /knjige?q=&zanr=` | iskanje po katalogu | prijavljeni |
| `POST /knjige`, `PATCH /knjige/{id}`, `DELETE /knjige/{id}` | upravljanje kataloga | knjižničar |
| `POST /izposoje` | evidentiranje izposoje | knjižničar |
| `POST /izposoje/{id}/vrnitev` | vračilo z obračunom zamudnine | knjižničar |
| `POST /izposoje/{id}/podaljsanje` | podaljšanje izposoje | bralec |
| `POST /rezervacije`, `DELETE /rezervacije/{id}` | rezervacija in preklic | bralec |
| `GET /me/izposoje`, `GET /me/rezervacije` | pregled mojih podatkov | bralec |
| `GET /zamudniki` | seznam zamudnikov | knjižničar |
| `GET /statistika` | statistika knjižnice | administrator |
| `PATCH /nastavitve`, `PATCH /clani/{id}/vloga` | pravila in vloge | administrator |

### Lokalni zagon

Celoten sistem se zažene z enim ukazom prek **Docker Compose**:

| Storitev | Opis | Vrata |
|---|---|---|
| `frontend` | Next.js aplikacija | `3000` |
| `backend` | NestJS REST API (Swagger dokumentacija na `/docs`) | `3001` |
| `db` | lokalni PostgreSQL (`postgres:18-alpine`) s trajnim volumnom, za razvoj in kot kopija Supabase | `5432` |

Koraki:
1. Kopiraj `.env.example` v `.env` in nastavi `DATABASE_URL` (Supabase ali lokalna baza `db`), `JWT_SECRET`, `JWT_EXPIRES_IN`, `NEXT_PUBLIC_API_URL` in `PORT`.
2. `docker compose up --build` zažene bazo, backend in frontend. Migracije se izvedejo z `prisma migrate deploy` (ob zagonu backend dela ali ročno).
3. Aplikacija je dostopna na naslovu `http://localhost:<PORT>`.

Okvirna struktura repozitorija:

```
librarium/
├── frontend/          # Next.js
├── backend/           # NestJS
│   └── prisma/        # schema.prisma, migrations/
├── docs/              # 01–04 md datoteke
├── docker-compose.yml
└── .env.example
```

## 2. Tehnološki sklad

| Področje | Izbira |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query za klice API |
| Backend | Node.js, NestJS (TypeScript), `class-validator` in `class-transformer` za validacijo vhodnih podatkov, zod |
| Podatkovna baza | PostgreSQL: Supabase (oblak, primarna baza) in `postgres:18-alpine` v Dockerju (lokalni razvoj) |
| Dostop do baze | Prisma ORM, Prisma Migrate |
| Avtentikacija | JWT (`@nestjs/jwt`, `passport-jwt`), gesla z bcrypt, nadzor dostopa z NestJS guardi |
| Upravljanje stanja | Zustand
| Planirana opravila | `@nestjs/schedule` |
| Dokumentacija API | `@nestjs/swagger` (OpenAPI) |
| Testiranje | Jest |
| Lokalni razvoj | Docker in Docker Compose, Node.js in npm, ESLint in Prettier |

## 3. Arhitekturne odločitve

| Odločitev | Utemeljitev |
|---|---|
| **Ločen frontend in backend** | Jasna ločitev odgovornosti. Backend lahko kasneje uporablja tudi drugi deli aplikacije npr. mobilna aplikacija, frontend pa je mogoče zamenjati neodvisno. |
| **Next.js (React)** | Dobro poznana knjižnica za React. Usmerjanje po straneh in komponentni model zadoščata za več vlog z različnimi pogledi. |
| **NestJS** | Modularna zgradba (moduli, servisi, guardi) ustreza ločenim področjem rešitve (katalog, izposoje, rezervacije, uporabniki). Vgrajeni mehanizmi za validacijo, JWT, planirana opravila in Swagger zmanjšajo količino lastne kode. |
| **REST API z JSON** | Preprost, splošno razširjen in dobro podprt v orodjih. Za zahteve te rešitve zadostuje. |
| **PostgreSQL** | Podatki so močno povezani (člani, izvodi, izposoje, rezervacije). Pravila izposoje zahtevajo tuje ključe, omejitve in transakcije, ki jih relacijska baza podpira neposredno. Prosto dostopen, preprost za lokalni zagon v Dockerju in na voljo pri več upravljanih ponudnikih. |
| **Prisma** | Tipsko varen dostop do baze v TypeScriptu, shema in migracije so na enem mestu, podpora transakcijam. |
| **Supabase + lokalna baza v Dockerju** | Oblačna baza ne zahteva lastnega strežnika in je dosegljiva od koderkoli. Ker se uporablja samo kot PostgreSQL, je preklop na drugega ponudnika sprememba `DATABASE_URL`. Lokalna kopija omogoča razvoj brez povezave in zagon, če oblačna baza ni na voljo. |
| **Ločena entiteta Izvod** | Knjiga je naslov, izvod pa fizični objekt. Brez ločitve ni mogoče pravilno upravljati več kopij, izgubljenih izvodov in dodeljevanja rezervacij. |
| **Poslovna pravila v backendu** | Pravila izposoje, zamudnine in čakalne vrste se izvajajo na enem mestu, ne glede na odjemalca. Frontend je samo prikaz. |
| **Transakcije pri izposoji in vračilu** | Preprečijo dvojno izposojo istega izvoda in nekonsistenten položaj v čakalni vrsti ob sočasnih zahtevah. |
| **Položaj v čakalni vrsti se izračuna** | Izračun iz časa rezervacije je enostavnejši in robustnejši kot ročno vzdrževanje številk ob preklicih. |
| **Parametri pravil v bazi (`nastavitev`)** | Administrator lahko spreminja rok, zamudnino in omejitve brez spreminjanja kode in ponovnega nameščanja. |
| **JWT z vlogo v žetonu** | Backend ne potrebuje strežniškega shranjevanja sej, vloga je na voljo pri vsaki zahtevi. Vloga se vseeno preveri na vsaki končni točki. |
| **bcrypt za gesla** | Preizkušen algoritem z vgrajeno soljo, široko podprt v ekosistemu Node.js. |
| **Nadzor dostopa po vlogah na backendu** | Skrivanje gumbov v frontendu ni zaščita. Pravice se preverjajo na vsaki končni točki. |
| **Planirano opravilo za poteke in zamude** | Poteki rezervacij in zamude niso odvisni od uporabniške akcije, zato jih mora izvajati sistem sam. |
| **Docker Compose za lokalni zagon** | Enako okolje na vseh računalnikih, zagon z enim ukazom, baza s trajnim volumnom. |
