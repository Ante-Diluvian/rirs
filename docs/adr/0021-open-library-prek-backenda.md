# Podatke iz Open Library pridobi backend in jih shrani v bazo

## Context and Problem Statement

Ob dodajanju knjige želimo podatke in naslovnico predizpolniti po ISBN (funkcionalnost 18). Open Library ne zahteva ključa, prosi pa za glavo `User-Agent` z imenom aplikacije in kontaktom. Dostop do naslovnic po ISBN je omejen na 100 zahtev na 5 minut na naslov IP.

## Considered Options

* Backend pokliče Open Library ob dodajanju knjige in podatke shrani
* Frontend kliče Open Library neposredno ob vsakem prikazu
* Brez uvoza, samo ročni vnos

## Decision Outcome

Izbrana možnost: »Backend pokliče Open Library ob dodajanju knjige in podatke shrani«, ker backend lahko pošlje zahtevano glavo `User-Agent`, podatke pa shrani v bazo, zato Open Library ne kličemo ob vsakem ogledu kataloga. Shranimo naslov naslovnice po njenem ID (`covers.openlibrary.org/b/id/…`), ker omejitev 100 zahtev velja za naslovnice, iskane po ISBN. Neposredni klici iz brskalnika bi pri katalogu z 20 naslovnicami na stran omejitev hitro dosegli. Samo ročni vnos je počasnejši in povzroča tipkarske napake.

### Consequences

* Dobro, ker Open Library potrebujemo samo enkrat za vsako knjigo.
* Dobro, ker knjižničar podatke pred shranjevanjem preveri in popravi.
* Slabo, ker podatki v Librariumu ne sledijo kasnejšim popravkom v Open Library.
* Slabo, ker Open Library ne pozna vseh izdaj (npr. manjših slovenskih založb), zato ostaja ročni vnos pogost.
