# Dostop po vlogah preverja backend na vsaki končni točki

## Context and Problem Statement

Tri vloge imajo različne pravice (`02`, razdelek 1): bralec vidi samo svoje podatke, izposojo evidentira samo knjižničar, pravila spreminja samo administrator. Skrivanje gumbov v frontendu uporabnika ne ustavi, če pošlje zahtevo neposredno na API.

## Considered Options

* Guardi NestJS (`JwtAuthGuard`, `RolesGuard`) na vsaki končni točki
* Samo skrivanje funkcij v frontendu
* Varnost na ravni vrstic v bazi (Row Level Security)

## Decision Outcome

Izbrana možnost: »Guardi NestJS (`JwtAuthGuard`, `RolesGuard`) na vsaki končni točki«, ker se pravice preverijo na strežniku pri vsaki zahtevi, z oznako vloge neposredno ob končni točki (npr. `@Roles('knjiznicar')`). Skrivanje v frontendu ni zaščita. Row Level Security bi zahtevala, da baza pozna uporabnika vsake zahteve, Prisma pa se z bazo poveže kot en uporabnik, zato bi morali uporabnika nastavljati v vsaki transakciji.

### Consequences

* Dobro, ker so pravice vidne v kodi ob vsaki končni točki in jih lahko testiramo.
* Dobro, ker frontend skriva funkcije samo zaradi preglednosti, ne zaradi varnosti.
* Slabo, ker pozabljena oznaka pomeni varnostno luknjo. Zato naj bo `JwtAuthGuard` globalen, javne poti pa izrecno označene.
* Slabo, ker vloge ne pokrijejo lastništva podatkov: da bralec vidi samo svoje izposoje, mora preveriti servis (US-06, kriterij 5).
