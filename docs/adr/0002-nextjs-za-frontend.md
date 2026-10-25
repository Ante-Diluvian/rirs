# Frontend zgradimo z Next.js zaradi vgrajenega usmerjanja in ekosistema React

## Context and Problem Statement

Frontend mora podpirati tri vloge z različnimi meniji in zasloni (katalog, moja knjižnica, pult, upravljanje kataloga) ter obrazce s sprotnimi napakami. Potrebujemo ogrodje, ki ima usmerjanje med zasloni in skupne postavitve že vgrajene, ter dovolj pripravljenih paketov (zemljevid, klici API, stanje), da teh delov ne pišemo sami. Odločitev velja za del *Frontend* v `04`.

## Considered Options

* Next.js (App Router)
* React z Vite (enostranska aplikacija)
* Angular
* Vue z Nuxt

## Decision Outcome

Izbrana možnost: »Next.js (App Router)«, ker ima usmerjanje po mapah, skupne postavitve (layouts) in delitev kode po straneh že vgrajene, zato vsak del aplikacije za posamezno vlogo dobi svojo postavitev brez dodatne nastavitve. React ima največji ekosistem paketov (npr. `react-leaflet`, TanStack Query), kar zmanjša količino lastne kode, TypeScript pa je isti jezik kot v backendu ([ADR-0004](0004-nestjs-za-backend.md)). React z Vite bi zahteval ročno izbiro in nastavitev usmerjevalnika ter strukture projekta. Angular je celovito ogrodje, vendar z več ponavljajoče se kode in strožjo strukturo, kot jo potrebujejo naši zasloni. Vue z Nuxt je primerljiva izbira, vendar ima manjši ekosistem in skupnost, zato je za posamezne potrebe na voljo manj pripravljenih paketov.

### Consequences

* Dobro, ker so usmerjanje, postavitve in optimizacija gradnje že vgrajeni.
* Dobro, ker je ekosistem React velik, zato za zemljevid (`react-leaflet`) in klice API (TanStack Query) obstajajo preizkušeni paketi.
* Slabo, ker Next.js uporabljamo samo kot frontend, zato strežniški deli ogrodja (API routes, strežniške akcije) ostanejo neuporabljeni. Paziti moramo, da se poslovna logika ne preseli vanje ([ADR-0001](0001-locen-frontend-in-backend.md)).
* Slabo, ker morajo paketi, ki potrebujejo brskalnik (npr. Leaflet), teči samo na odjemalcu, kar pri App Routerju zahteva dodatno pozornost.
