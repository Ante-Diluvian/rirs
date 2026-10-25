# Frontend in backend sta ločeni aplikaciji, povezani prek API

## Context and Problem Statement

Librarium uporabljajo tri vloge prek spletnega vmesnika, jedro sistema pa so poslovna pravila izposoje, rezervacij in zamudnin. Odločiti se moramo, ali sta uporabniški vmesnik in strežniška logika ena aplikacija ali dve, ki komunicirata prek API. Odločitev določa glavne dele sistema v `04-arhitektura-in-tehnoloski-sklad.md` (frontend, backend, baza) in povezave med njimi.

## Considered Options

* Ločen frontend (Next.js) in backend (NestJS), ki komunicirata prek REST API
* Ena aplikacija Next.js s stranmi in API routes
* Strani, ki jih upodablja backend (npr. NestJS s predlogami)

## Decision Outcome

Izbrana možnost: »Ločen frontend (Next.js) in backend (NestJS), ki komunicirata prek REST API«, ker poslovna pravila potrebujejo samostojen strežnik z moduli, planiranimi opravili in transakcijami, ki ga lahko kasneje uporablja tudi mobilna aplikacija ali PWA. API routes v Next.js bi pravila pomešali s kodo vmesnika in jih vezali na en odjemalec. Strani, ki jih upodablja backend, bi otežile interaktivne zaslone, kot je pult knjižničarja, kjer se preverjanje pravil prikazuje sproti.

### Consequences

* Dobro, ker je backend edino mesto za pravila in ga lahko uporablja katerikoli odjemalec.
* Dobro, ker se frontend in backend razvijata, testirata in nameščata neodvisno.
* Slabo, ker potrebujemo dve aplikaciji, dve okolji in nastavitev CORS med njima.
* Slabo, ker morata frontend in backend ostati usklajena glede oblike podatkov, ker se tipi med njima ne delijo samodejno.
