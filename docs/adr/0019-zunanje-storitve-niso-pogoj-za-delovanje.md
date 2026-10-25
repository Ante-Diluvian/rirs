# Zunanje storitve so dodatek, jedro deluje tudi brez njih

## Context and Problem Statement

Funkcionalnosti 16–19 uporabljajo zunanje storitve (OpenStreetMap, Open Library, ponudnika e-pošte). Brezplačne storitve nimajo zagotovljene razpoložljivosti in omejujejo število zahtev. Odločiti moramo, kako se sistem obnaša, ko storitev ne deluje.

## Considered Options

* Zunanje storitve kot neobvezen dodatek s časovno omejitvijo in nadomestno potjo
* Zunanje storitve kot obvezen del operacij
* Brez zunanjih storitev

## Decision Outcome

Izbrana možnost: »Zunanje storitve kot neobvezen dodatek s časovno omejitvijo in nadomestno potjo«, ker izposoja, vračilo in rezervacije ne smejo odpovedati zaradi tuje storitve. Vsak klic ima časovno omejitev (5 s) in nadomestno pot: ročni vnos podatkov o knjigi, seznam lokacij namesto zemljevida, ponovni poskus pošiljanja obvestila. Brez zunanjih storitev bi izgubili uporabne funkcionalnosti, ki ne zahtevajo lastne infrastrukture.

### Consequences

* Dobro, ker izpad zunanje storitve vpliva samo na dodatno funkcionalnost.
* Dobro, ker lahko zunanje funkcionalnosti izklopimo, ne da bi to vplivalo na MVP.
* Slabo, ker ima vsaka zunanja funkcionalnost dve poti (običajno in nadomestno), ki ju moramo razviti in testirati.
* Slabo, ker uporabnik ob izpadu dobi okrnjen prikaz.
