# Parametri pravil izposoje so nastavitve v bazi

## Context and Problem Statement

Rok izposoje, zamudnina, največje število izposoj, meja zamudnine in drugi parametri se lahko spremenijo, na primer poleti daljši rok. Funkcionalnost 15 zahteva, da jih administrator spremeni brez posega v kodo.

## Considered Options

* Tabela `nastavitev` (ključ in vrednost) v bazi
* Konstante v kodi
* Spremenljivke okolja

## Decision Outcome

Izbrana možnost: »Tabela `nastavitev` (ključ in vrednost) v bazi«, ker jo lahko administrator ureja prek aplikacije, sprememba pa velja takoj, brez nove gradnje in namestitve. Konstante in spremenljivke okolja bi za vsako spremembo zahtevale razvijalca in ponovni zagon. Rok vrnitve se shrani v vsako izposojo, zato sprememba pravil ne vpliva na obstoječe izposoje (US-15, kriterij 3).

### Consequences

* Dobro, ker knjižnica sama prilagaja pravilnik.
* Dobro, ker so privzete vrednosti na enem mestu.
* Slabo, ker so vrednosti shranjene kot besedilo, zato jih mora backend pretvoriti in preveriti, napačen ključ pa se pokaže šele ob izvajanju.
* Slabo, ker mora backend nastavitve brati iz baze ali jih predpomniti in predpomnilnik osvežiti ob spremembi.
