# Izposoja, vračilo in prehod rezervacije se izvedejo v eni transakciji

## Context and Problem Statement

Vračilo spremeni več tabel hkrati: zapre izposojo, obračuna zamudnino, poišče najstarejšo čakajočo rezervacijo, jo prestavi v *Na voljo* in spremeni stanje izvoda. Če se izvede samo del operacije ali dve zahtevi tečeta hkrati, lahko nastane dvojna izposoja istega izvoda ali napačen vrstni red v čakalni vrsti.

## Considered Options

* Ena transakcija na operacijo in omejitve v bazi
* Zaporedne poizvedbe brez transakcije
* Optimistično zaklepanje s številko različice na izvodu

## Decision Outcome

Izbrana možnost: »Ena transakcija na operacijo in omejitve v bazi«, ker transakcija zagotovi, da se shrani vse ali nič (US-04). Unikatna omejitev »ena aktivna izposoja na izvod« pa ob sočasnih zahtevah zavrne drugo izposojo, tudi če preverjanje v kodi tega ne zazna. Zaporedne poizvedbe bi ob napaki pustile nekonsistentno stanje. Optimistično zaklepanje bi zahtevalo polje različice in ponavljanje zahtev na več tabelah, kar je za ta obseg prezahtevno.

### Consequences

* Dobro, ker ostane baza konsistentna tudi ob napaki sredi operacije.
* Dobro, ker omejitve v bazi ujamejo tudi sočasne zahteve, ki jih preverjanje v kodi ne vidi.
* Slabo, ker lahko pri hkratnem vračilu dveh izvodov istega naslova obe transakciji izbereta isto čakajočo rezervacijo. To preprečimo z zaklepanjem vrstice (`SELECT … FOR UPDATE`), ki ga Prisma omogoča samo z neposrednim SQL.
* Slabo, ker mora backend napako, s katero baza zavrne sočasno zahtevo, prevesti v razumljivo sporočilo.
