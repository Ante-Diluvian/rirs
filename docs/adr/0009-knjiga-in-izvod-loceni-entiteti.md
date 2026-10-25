# Naslov knjige in fizični izvod sta ločeni entiteti

## Context and Problem Statement

Knjižnica ima od istega naslova pogosto več fizičnih izvodov. Izposoja se nanaša na konkreten izvod z inventarno številko, rezervacija pa na naslov, dokler ji ob vračilu ne dodelimo konkretnega izvoda. Izvodi se lahko izgubijo, zgodovina izposoj pa mora ostati. Odločitev določa entiteti `knjiga` in `izvod` v `03-podatkovni-model.md`.

## Considered Options

* Ločeni entiteti `knjiga` (naslov) in `izvod` (fizični predmet)
* Ena entiteta `knjiga` s poljem za število izvodov
* Vsak izvod kot svoja vrstica v `knjiga` z vsemi bibliografskimi podatki

## Decision Outcome

Izbrana možnost: »Ločeni entiteti `knjiga` (naslov) in `izvod` (fizični predmet)«, ker je to edina možnost, ki omogoča dodelitev konkretnega izvoda rezervaciji, stanje vsakega izvoda (prost, izposojen, rezerviran, izgubljen) in zgodovino izposoj posameznega izvoda. Število izvodov v knjigi ne pove, kateri izvod je pri katerem članu. Podvajanje bibliografskih podatkov v vsaki vrstici bi ob popravku naslova ali avtorja zahtevalo spremembo več vrstic in povzročilo nedoslednosti.

### Consequences

* Dobro, ker lahko izvod označimo kot izgubljen, ne da bi izbrisali knjigo ali zgodovino izposoj.
* Dobro, ker se razpoložljivost izračuna iz stanj izvodov in ne more odstopati od dejanskega stanja.
* Slabo, ker iskanje po katalogu z razpoložljivostjo zahteva združevanje in štetje izvodov za vsak naslov.
* Slabo, ker mora knjižničar poleg knjige vnašati tudi izvode.
