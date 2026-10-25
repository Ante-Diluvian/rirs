# Poslovna pravila izvaja samo backend

## Context and Problem Statement

Pravila izposoje (največ 5 izposoj, meja zamudnine, rezerviran izvod samo za tega člana), čakalne vrste in zamudnin so jedro Librariuma. Če bi bila pravila na več mestih, bi se lahko razšla, uporabnik pa bi jih lahko zaobšel z neposrednim klicem API.

## Considered Options

* Pravila v servisih backenda
* Pravila v frontendu
* Pravila v bazi (sprožilci in shranjene procedure)

## Decision Outcome

Izbrana možnost: »Pravila v servisih backenda«, ker se pravila izvajajo na enem mestu, ne glede na odjemalca, in jih iz brskalnika ni mogoče zaobiti. V servisih jih testiramo z Jestom in vračamo razumljiva sporočila, ki jih zahtevajo kriteriji zgodb (npr. »Član ima 5 aktivnih izposoj, kar je največ dovoljeno«). Pravila v frontendu niso zaščita. Sprožilci v bazi bi bili varni, vendar težje berljivi, testirani in verzionirani, Prisma pa jih ne upravlja. Osnovna pravila baza vseeno varuje z omejitvami ([ADR-0011](0011-transakcije-pri-izposoji-in-vracilu.md)).

### Consequences

* Dobro, ker je frontend samo prikaz in ga lahko zamenjamo, ne da bi ponovno izvedli pravila.
* Dobro, ker so pravila pokrita s testi na enem mestu.
* Slabo, ker mora frontend za takojšnjo povratno informacijo ponoviti del preverjanj (npr. dolžino gesla), ki morajo ostati usklajena z backendom.
* Slabo, ker vsako preverjanje pravila zahteva klic na strežnik.
