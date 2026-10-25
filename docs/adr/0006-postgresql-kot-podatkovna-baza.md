# Podatke hranimo v relacijski bazi PostgreSQL

## Context and Problem Statement

Podatki Librariuma so močno povezani (člani, knjige, izvodi, izposoje, rezervacije). Pravila zahtevajo tuje ključe, unikatne in delne unikatne omejitve (npr. ena aktivna izposoja na izvod) ter transakcije čez več tabel. Prototip Librariuma iz prve naloge je tekel na CockroachDB, zato je bila to tudi ena od možnosti.

## Considered Options

* PostgreSQL
* CockroachDB
* MongoDB
* MySQL

## Decision Outcome

Izbrana možnost: »PostgreSQL«, ker neposredno podpira vse potrebne omejitve, delne indekse in transakcije, je prosto dostopen, preprost za lokalni zagon v Dockerju in na voljo pri več upravljanih ponudnikih ([ADR-0008](0008-supabase-in-lokalna-kopija-v-dockerju.md)). CockroachDB je združljiv s PostgreSQL in porazdeljen, vendar porazdeljenost za eno knjižnico ni potrebna.Omejena brezplačna oblačna ponudba je bila dodaten razlog za preklop. MongoDB nima tujih ključev, zato bi pravila povezav prenesli v kodo. MySQL bi bil izvedljiv, vendar nima delnih indeksov (`WHERE` v indeksu), ki jih model uporablja.

### Consequences

* Dobro, ker pravila, kot je ena aktivna izposoja na izvod, varuje že baza, ne samo koda.
* Dobro, ker je enaka baza na voljo lokalno (`postgres:18-alpine`) in v oblaku.
* Slabo, ker moramo shemo in migracije iz prototipa na CockroachDB prenesti in ponovno preizkusiti.
* Slabo, ker relacijska shema zahteva migracijo ob vsaki spremembi modela.
