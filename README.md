# Librarium

Librarium je spletni sistem za upravljanje izposoje, rezervacij in zamudnin v lokalni knjižnici. Bralci iščejo po katalogu, vidijo, koliko izvodov je prostih, in rezervirajo izposojene knjige. Knjižničarji evidentirajo izposoje in vračila, sistem pa sam preverja pravila izposoje, vodi čakalno vrsto in računa zamudnine. Administrator nastavlja pravila izposoje in spremlja statistiko.

## Tehnologije

| Del sistema | Tehnologije |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Backend | NestJS (TypeScript), `class-validator`, `@nestjs/schedule`, Swagger (OpenAPI) |
| Podatkovna baza | PostgreSQL (Supabase, lokalna kopija `postgres:18-alpine` v Dockerju), Prisma ORM |
| Avtentikacija | JWT z vlogo v žetonu, bcrypt, NestJS guardi |
| Testiranje | Jest, Supertest |
| Lokalni razvoj | Docker Compose, Mailpit, ESLint, Prettier |
| Zunanje storitve (niso del MVP) | OpenStreetMap z Leafletom, Open Library, e-pošta prek SMTP (Nodemailer) |

Zakaj smo izbrali posamezne tehnologije, je opisano v [arhitekturnih odločitvah](docs/decisions/README.md).

## Dokumentacija

| Dokument | Vsebina |
|---|---|
| [Zasnova rešitve](docs/01-zasnova-resitve.md) | namen, problem, ciljni uporabniki in kratek opis delovanja |
| [Funkcionalnost in obseg](docs/02-funkcionalnost-in-obseg.md) | uporabniške vloge, funkcionalnosti, MVP, kasnejše nadgradnje in kaj je izven obsega |
| [Podatkovni model](docs/03-podatkovni-model.md) | entitete, polja, povezave in ER diagram |
| [Arhitektura in tehnološki sklad](docs/04-arhitektura-in-tehnoloski-sklad.md) | deli sistema, komunikacija, avtentikacija, končne točke API in lokalni zagon |
| [Uporabniške zgodbe](docs/05-uporabniske-zgodbe.md) | uporabniške zgodbe s kriteriji sprejemljivosti |
| [Wireframes](docs/05-wireframes.md) | wireframe-i glavnih zaslonov MVP in navodila za urejanje |
| [Arhitekturne odločitve (ADR)](docs/adr) | seznam odločitev v obliki MADR in postopek za nove odločitve |
