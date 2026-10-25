# Goodreads povežemo samo s povezavo za iskanje po ISBN

## Context and Problem Statement

Bralci želijo pred rezervacijo prebrati mnenja drugih (funkcionalnost 17). Največ ocen ima Goodreads, ki pa od 8. 12. 2020 ne izdaja novih ključev za svoj javni API.

## Considered Options

* Povezava na iskanje po ISBN na Goodreads
* Prenos ocen prek API Goodreads
* Strganje (scraping) strani Goodreads
* Brez povezave na Goodreads

## Decision Outcome

Izbrana možnost: »Povezava na iskanje po ISBN na Goodreads«, ker je to edina izvedljiva in zanesljiva možnost. API za nove aplikacije ni na voljo, strganje strani pa je v nasprotju s pogoji uporabe in se zlomi ob vsaki spremembi strani. Povezava ne potrebuje ključa in bralcu vseeno omogoči ogled mnenj.

### Consequences

* Dobro, ker ni ključev, odvisnosti ali vzdrževanja.
* Dobro, ker povezava z atributom `rel="noopener noreferrer"` Goodreadsu ne pošlje podatkov o bralcu.
* Slabo, ker ocen z Goodreads ne moremo prikazati v Librariumu.
* Slabo, ker iskanje po ISBN včasih vrne seznam zadetkov ali drugo izdajo namesto točno te knjige.
