# Backend zgradimo z NestJS zaradi modularne zgradbe

## Context and Problem Statement

Backend vsebuje večino logike Librariuma: pravila izposoje, čakalno vrsto, zamudnine, avtentikacijo z vlogami, planirana opravila in dokumentacijo API. Potrebujemo ogrodje, ki to logiko razdeli v pregledne dele in ponuja rešitve za naloge, ki se ponavljajo v vsaki končni točki.

## Considered Options

* NestJS
* Express
* Fastify
* API routes v Next.js

## Decision Outcome

Izbrana možnost: »NestJS«, ker njegova zgradba iz modulov, servisov in guardov ustreza ločenim področjem rešitve (katalog, izposoje, rezervacije, uporabniki), uradni paketi pa pokrijejo validacijo, JWT, planirana opravila in Swagger. Z Expressom ali Fastifyjem bi morali to zgradbo in povezovanje paketov urediti sami. API routes v Next.js izključuje [ADR-0001](0001-locen-frontend-in-backend.md). NestJS je zgrajen za TypeScript, zato ima backend isti jezik in enako tipsko varnost kot frontend ([ADR-0002](0002-nextjs-za-frontend.md)).

### Consequences

* Dobro, ker so moduli, vstavljanje odvisnosti (dependency injection) in guardi enotni v celotnem backendu, kar olajša testiranje servisov z Jestom.
* Dobro, ker `@nestjs/swagger`, `@nestjs/schedule` in `@nestjs/jwt` zmanjšajo količino lastne kode.
* Slabo, ker ima NestJS več ponavljajoče se kode (moduli, DTO, dekoratorji) kot Express.
* Slabo, ker ima backend več odvisnosti in počasnejši zagon kot minimalen strežnik.
