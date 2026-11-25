# Librarium – frontend
[![CI/CD](https://github.com/hmerih22/rirs/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/hmerih22/rirs/actions/workflows/ci-cd.yml)

- **Nameščena aplikacija:** <https://librarium-4yie.onrender.com>
- **API (Swagger):** <https://librarium-api.onrender.com/docs>

> Aplikacija teče na brezplačnem paketu Render, kjer servis po 15 minutah nedejavnosti zaspi. Prvo nalaganje lahko zato traja do ene minute.

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


## CI/CD

Cevovod je opisan v [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml). Sproži se ob vsakem pull requestu v vejo `main` in ob vsakem pushu na `main`.

Spremembe razvijamo v ločenih vejah in jih v `main` združujemo prek pull requestov. Veja `main` je zaščitena: pull requesta ni mogoče združiti, dokler ne uspejo jobi `lint`, `build` in `test`.

```
pull request / push na main
        │
        ├── lint ──┐
        ├── build ─┼──► deploy (samo ob pushu na main)
        └── test ──┘
```

| Faza | Kaj naredi |
|---|---|
| `lint` | ESLint preveri kodo backenda in frontenda. Če najde napako, job pade. |
| `build` | Zgradi backend (`nest build`) in frontend (`next build`, način standalone). Odvisnosti npm se predpomnijo z `actions/setup-node`, gradnja Next.js pa z `actions/cache`. Rezultata gradnje se shranita kot artefakta `backend-build` in `frontend-build`. |
| `test` | Zažene enotne teste backenda s pokritostjo (Jest), e2e teste backenda na bazi PostgreSQL v servisnem vsebniku in teste frontenda s pokritostjo (`node:test`). Poročilo o pokritosti se shrani kot artefakt `coverage-report`. Če pade kateri koli test, pade cevovod. Job teče na Node 24, ker Jest pakete ESM (NestJS 12) naloži šele na Node 24.9 ali novejšem. |
| `deploy` | Teče samo ob pushu na `main` in samo, če so uspeli `lint`, `build` in `test`. Prenese artefakta iz joba `build` in ju brez ponovne gradnje zapakira v sliki Docker (`Dockerfile.deploy`). Sliki objavi v GitHub Container Registry, nato prek deploy hookov sproži namestitev na Render. Job uporablja okolje `production`, deploy hooka sta shranjena kot secrets tega okolja. |

### Namestitev

| Del | Storitev |
|---|---|
| frontend | Render (web service iz slike `ghcr.io/hmerih22/rirs-frontend`) |
| backend | Render (web service iz slike `ghcr.io/hmerih22/rirs-backend`), ob zagonu izvede `prisma migrate deploy` |
| baza | Neon (PostgreSQL 17, Frankfurt) |

Naslov backenda se v frontend vgradi ob gradnji iz spremenljivke repozitorija `NEXT_PUBLIC_API_URL`. Backend dovoli zahteve s frontenda prek spremenljivke `FRONTEND_ORIGIN` na Renderju.

