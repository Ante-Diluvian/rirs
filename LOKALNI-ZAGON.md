# Lokalni zagon

Celoten sistem (baza, backend in frontend) se zažene z enim ukazom prek Docker Compose.

## Predpogoji

- Docker z Docker Compose v2 (`docker compose version`).
- Za razvoj brez Dockerja še Node.js 22 LTS (različica je v `.nvmrc`).
- Prosta vrata `3000`, `3001` in `5432`.

## 1. Spremenljivke okolja

```bash
cp .env.example .env
```

V `.env` nastavi vsaj `JWT_SECRET` in `ADMIN_PASSWORD`. Druge vrednosti delujejo privzeto. Datoteka `.env` ni v gitu.

## 2. Zagon

```bash
docker compose up --build
```

| Storitev | Kaj naredi |
|---|---|
| `db` | PostgreSQL 17 s podatki v volumnu `db-data`. Ob prvem zagonu ustvari še bazo `librarium_test` za e2e teste. |
| `backend` | počaka na zdravo bazo, izvede `prisma migrate deploy` in zažene API |
| `frontend` | zažene se, ko backend odgovarja na `/health` |

`NEXT_PUBLIC_API_URL` se vgradi v frontend ob gradnji. Po spremembi ga ponovno zgradi z `docker compose up --build frontend`.

## 3. Začetni podatki

Ko teče baza, v drugem terminalu:

```bash
docker compose run --rm seed
```

Seed ustvari administratorja iz `ADMIN_EMAIL` in `ADMIN_PASSWORD`, privzete nastavitve pravil in demo podatke. Ponoven zagon je varen. Podrobnosti so v [backend/README.md](backend/README.md#začetni-podatki).

## Naslovi

| Kaj | Naslov |
|---|---|
| aplikacija | <http://localhost:3000> |
| API | <http://localhost:3001> |
| dokumentacija API (Swagger) | <http://localhost:3001/docs> |
| stanje API | <http://localhost:3001/health> |
| PostgreSQL | `localhost:5432`, baza `librarium` (shema `librarium`), testna baza `librarium_test` |

## Demo uporabniki

| E-pošta | Geslo | Vloga |
|---|---|---|
| `ADMIN_EMAIL` iz `.env` | `ADMIN_PASSWORD` | administrator |
| `ana.horvat@example.com` | `DEMO_PASSWORD` | knjižničarka |
| `maja.kovac@example.com` | `DEMO_PASSWORD` | bralka z zamujeno izposojo in rezervacijama |
| `janez.novak@example.com` | `DEMO_PASSWORD` | bralec z zamujeno izposojo `INV-000412` |
| `luka.zupan@example.com` | `DEMO_PASSWORD` | bralec v čakalni vrsti |
| `nina.golob@example.com` | `DEMO_PASSWORD` | bralka s 5 izposojami |
| `tomaz.mlakar@example.com` | `DEMO_PASSWORD` | bralec |
| `petra.kralj@example.com` | `DEMO_PASSWORD` | bralka z zamudnino nad mejo |

## Ustavitev

```bash
docker compose down
```

`docker compose down -v` izbriše tudi volumen s podatki baze. Ob naslednjem zagonu se baza ustvari na novo, z bazo `librarium_test` vred.

## Razvoj brez Dockerja

V Dockerju teče samo baza, backend in frontend pa lokalno s samodejnim ponovnim nalaganjem:

```bash
docker compose up -d db
```

```bash
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

```bash
cd frontend
npm install
npm run dev
```

Backend in frontend bereta `.env` v korenu repozitorija. `DATABASE_URL` iz `.env.example` kaže na bazo v Dockerju.

Za e2e teste ustvari `.env.test` v korenu z `DATABASE_URL=postgresql://librarium:librarium@localhost:5432/librarium_test?schema=librarium` in v `backend/` zaženi `npm run test:e2e`.
