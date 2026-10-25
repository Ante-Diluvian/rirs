# Podatke s strežnika vodi TanStack Query, stanje odjemalca pa Zustand

## Context and Problem Statement

Frontend ima dve vrsti stanja. Podatki z backenda (knjige, izposoje, rezervacije) se spreminjajo na strežniku in jih je treba osveževati. Stanje odjemalca (prijavljeni uporabnik z vlogo in žetonom, stanje vmesnika) obstaja samo v brskalniku. Če obe vrsti hranimo na istem mestu, moramo sami skrbeti za predpomnjenje, osveževanje in usklajevanje s strežnikom.

## Considered Options

* TanStack Query za podatke s strežnika in Zustand za stanje odjemalca
* Redux Toolkit z RTK Query za vse stanje
* React Context in `useState` brez dodatnih paketov
* Samo TanStack Query

## Decision Outcome

Izbrana možnost: »TanStack Query za podatke s strežnika in Zustand za stanje odjemalca«, ker vsak paket rešuje svojo vrsto stanja. TanStack Query predpomni podatke, jih ponovno naloži in po spremembi razveljavi (npr. po rezervaciji osveži katalog in *Mojo knjižnico*). Zustand hrani majhno globalno stanje odjemalca z zelo malo kode. Redux Toolkit bi pokril oboje, vendar z več nastavitve in kode, kot jo ta aplikacija potrebuje. React Context ob vsaki spremembi ponovno izriše vse komponente, ki ga uporabljajo, in ne predpomni podatkov s strežnika. Samo TanStack Query ne pokrije stanja, ki ne prihaja s strežnika.

### Consequences

* Dobro, ker se podatki s strežnika ne podvajajo v globalnem stanju in zato ne zastarajo.
* Dobro, ker oba paketa zahtevata malo kode in nista vezana na druge dele sistema.
* Slabo, ker sta v projektu dva paketa za stanje, zato potrebujemo jasno pravilo, kaj sodi kam: vse, kar pride z API, gre v TanStack Query.
* Slabo, ker Zustand ne predpisuje strukture, zato moramo ob rasti aplikacije sami skrbeti za urejenost shramb (stores).
