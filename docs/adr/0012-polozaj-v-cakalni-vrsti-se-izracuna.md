# Položaj v čakalni vrsti se izračuna iz časa rezervacije

## Context and Problem Statement

Bralec vidi svoj položaj v vrsti (npr. »2. v vrsti«). Položaj se spremeni ob vsakem preklicu, poteku ali dodelitvi rezervacije pred njim. Odločiti moramo, ali položaj shranimo ali ga izračunamo.

## Considered Options

* Izračun iz vrstnega reda polja `ustvarjena` med čakajočimi rezervacijami naslova
* Shranjena številka položaja v rezervaciji

## Decision Outcome

Izbrana možnost: »Izračun iz vrstnega reda polja `ustvarjena` med čakajočimi rezervacijami naslova«, ker je položaj vedno pravilen brez dodatnih posodobitev. Shranjena številka bi ob vsakem preklicu zahtevala ponovno oštevilčenje vseh rezervacij za njim v isti transakciji, napaka pri tem pa bi povzročila podvojene ali manjkajoče položaje.

### Consequences

* Dobro, ker preklic ali potek rezervacije spremeni samo eno vrstico.
* Dobro, ker dve rezervaciji ne moreta imeti istega položaja.
* Slabo, ker izračun položaja zahteva štetje rezervacij ob vsakem prikazu. Pomaga indeks na (`knjiga_id`, `status`, `ustvarjena`).
* Slabo, ker potrebujemo pravilo za rezervacije z enakim časom, npr. dodatno razvrščanje po `id`.
