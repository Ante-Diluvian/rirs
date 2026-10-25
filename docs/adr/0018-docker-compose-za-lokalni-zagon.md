# Lokalno sistem zaženemo z Docker Compose

## Context and Problem Statement

Sistem sestavljajo frontend, backend, lokalna baza in za obvestila še lovilec e-pošte (Mailpit). Vsak razvijalec ali ocenjevalec ga mora zagnati enako, brez ročne namestitve PostgreSQL in usklajevanja različic.

## Considered Options

* Docker Compose za vse storitve
* Ročna namestitev vsake storitve
* Docker samo za bazo, frontend in backend z lokalnim Node.js

## Decision Outcome

Izbrana možnost: »Docker Compose za vse storitve«, ker se celoten sistem zažene z enim ukazom v enakem okolju na vseh računalnikih, baza pa ima trajni volumen. Ročna namestitev je zamudna in vodi v razlike med računalniki. Docker samo za bazo je za vsakodnevni razvoj sprejemljiv in ga Compose ne izključuje, saj lahko zaženemo samo storitev `db`.

### Consequences

* Dobro, ker so različice storitev zapisane v datotekah, ne odvisne od posameznega računalnika.
* Dobro, ker lokalna baza in Mailpit tečeta brez namestitve.
* Slabo, ker mora biti nameščen Docker, ki porabi več pomnilnika.
* Slabo, ker je samodejno ponovno nalaganje kode v vsebnikih na Windows in macOS lahko počasnejše kot brez Dockerja.
