# Uporabnik se predstavi z JWT, ki vsebuje njegovo vlogo

## Context and Problem Statement

Backend mora pri vsaki zahtevi vedeti, kdo je uporabnik in katero vlogo ima (bralec, knjižničar, administrator). Odločiti moramo, kako se uporabnik po prijavi predstavi pri naslednjih zahtevah.

## Considered Options

* JWT z identifikatorjem uporabnika in vlogo, s kratko veljavnostjo
* JWT samo z identifikatorjem, vloga se prebere iz baze
* Strežniške seje s piškotkom in shrambo sej

## Decision Outcome

Izbrana možnost: »JWT z identifikatorjem uporabnika in vlogo, s kratko veljavnostjo«, ker backend iz podpisanega žetona pri vsaki zahtevi ve, kdo je uporabnik in katero vlogo ima, brez poizvedbe v bazo in brez shranjevanja sej. To ustreza ločenemu frontendu in drugim odjemalcem ([ADR-0001](0001-locen-frontend-in-backend.md)). Seje bi zahtevale shrambo sej in nastavitev piškotkov med različnima izvoroma frontenda in backenda. Branje vloge iz baze bi odpravilo zamik ob spremembi vloge, vendar z dodatno poizvedbo pri vsaki zahtevi.

### Consequences

* Dobro, ker strežnik ne hrani stanja prijave, zato lahko teče v več primerkih.
* Dobro, ker `RolesGuard` vlogo dobi neposredno iz žetona.
* Slabo, ker sprememba vloge začne veljati šele z novim žetonom. Zato ima žeton kratko veljavnost (1 ura), blokado člana (`je_blokiran`) pa izposoja vedno prebere iz baze.
* Slabo, ker žetona pred iztekom ni mogoče preklicati, odjava pa velja samo na odjemalcu. Brez osvežilnih žetonov se mora uporabnik po eni uri znova prijaviti.
