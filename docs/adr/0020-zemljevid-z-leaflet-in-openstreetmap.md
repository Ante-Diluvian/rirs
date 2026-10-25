# Zemljevid prikažemo s paketom Leaflet in ploščicami OpenStreetMap

## Context and Problem Statement

Stran *O knjižnici* naj prikaže lokacije knjižnice na zemljevidu (funkcionalnost 16). Gre za nekaj oznak na eni strani, brez iskanja poti ali naslovov.

## Considered Options

* Leaflet s ploščicami OpenStreetMap
* Google Maps JavaScript API
* Mapbox GL JS
* Statična slika zemljevida

## Decision Outcome

Izbrana možnost: »Leaflet s ploščicami OpenStreetMap«, ker ne potrebuje ključa za API ali računa pri ponudniku, je majhen in zadošča za nekaj oznak. Google Maps in Mapbox zahtevata račun in ključ oziroma žeton za API, kar je za nekaj oznak nepotrebna odvisnost. Statična slika bi bila najpreprostejša, vendar ne omogoča povečave in klika na oznako (US-16). Koordinate so shranjene v bazi, zato iskanje koordinat po naslovu (geokodiranje) ni potrebno.

### Consequences

* Dobro, ker ni stroškov, ključev ali registracije.
* Dobro, ker lahko ponudnika ploščic zamenjamo s spremembo naslova URL ploščic.
* Slabo, ker javni strežniki ploščic OpenStreetMap nimajo zagotovljene razpoložljivosti ter prepovedujejo intenzivno rabo in prenašanje ploščic vnaprej. Pri večjem prometu potrebujemo drugega ponudnika.
* Slabo, ker Leaflet potrebuje objekt `window`, zato se komponenta zemljevida v Next.js naloži samo v brskalniku (`dynamic` z `ssr: false`).
