# Supabase je primarna baza, lokalna kopija v Dockerju pa rezerva

## Context and Problem Statement

PostgreSQL ([ADR-0006](0006-postgresql-kot-podatkovna-baza.md)) mora teči tam, kjer je dosegljiv razvijalcu in kasneje nameščeni aplikaciji. Lastnega strežnika ne želimo upravljati, hkrati pa moramo razvijati brez povezave in imeti varnostno kopijo podatkov.

## Considered Options

* Supabase kot upravljan PostgreSQL in lokalna kopija v Dockerju
* Samo lokalni PostgreSQL v Dockerju
* Lasten strežnik (VPS) s PostgreSQL
* Supabase s Supabase Auth in dostopom do baze neposredno iz frontenda

## Decision Outcome

Izbrana možnost: »Supabase kot upravljan PostgreSQL in lokalna kopija v Dockerju«, ker oblačna baza ne zahteva lastnega strežnika in je dosegljiva od koderkoli, lokalna kopija pa omogoča razvoj brez povezave in delo, ko oblak ni na voljo. Supabase uporabljamo samo kot PostgreSQL, zato je zamenjava ponudnika sprememba spremenljivke `DATABASE_URL`. Supabase Auth in dostop iz frontenda bi avtentikacijo in pravila razdelila med Supabase in NestJS, kar nasprotuje [ADR-0010](0010-poslovna-pravila-v-backendu.md) in [ADR-0014](0014-jwt-z-vlogo-v-zetonu.md). Sama lokalna baza ne bi bila dosegljiva nameščeni aplikaciji, lasten strežnik pa bi zahteval vzdrževanje, varnostne posodobitve in kopije.

### Consequences

* Dobro, ker za delovanje baze skrbi ponudnik, lokalna kopija pa omogoča delo brez povezave.
* Dobro, ker koda ni vezana na Supabase in deluje s katerimkoli PostgreSQL.
* Slabo, ker moramo kopijo ročno osveževati s `pg_dump` in `psql`, zato je lahko zastarela. Različica `pg_dump` mora biti enaka ali novejša od različice strežnika.
* Slabo, ker ima brezplačni paket Supabase omejitve: 500 MB baze na projekt, po enem tednu neaktivnosti pa se projekt zaustavi (stanje oktober 2026).
* Slabo, ker moramo migracije izvesti na obeh bazah.
