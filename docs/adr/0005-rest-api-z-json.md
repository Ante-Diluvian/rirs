# Frontend in backend komunicirata prek REST API z JSON

## Context and Problem Statement

Frontend in backend sta ločena ([ADR-0001](0001-locen-frontend-in-backend.md)), zato potrebujeta dogovorjen način komunikacije. Kriteriji uporabniških zgodb se sklicujejo na statuse HTTP (npr. `403`, `404`), API pa naj bi kasneje uporabljali tudi drugi odjemalci, na primer koledarske aplikacije ([ADR-0025](0025-koledar-prek-povezave-z-zetonom.md)) ali mobilna aplikacija.

## Considered Options

* REST z JSON in opisom OpenAPI
* GraphQL
* tRPC

## Decision Outcome

Izbrana možnost: »REST z JSON in opisom OpenAPI«, ker je preprost, splošno razširjen in ga podpira vsak odjemalec. Dostop po vlogah se naravno preslika na metode in poti, rezultati pa na statuse HTTP, ki jih zahtevajo kriteriji zgodb. GraphQL prinaša prilagodljive poizvedbe, ki jih ta aplikacija ne potrebuje, in zahtevnejši nadzor dostopa po posameznih poljih. tRPC deluje samo z odjemalci v TypeScriptu in bi frontend tesno povezal z backendom.

### Consequences

* Dobro, ker `@nestjs/swagger` iz kode ustvari opis OpenAPI, po katerem je API mogoče preizkusiti v Swagger UI.
* Dobro, ker je vsak klic mogoče preizkusiti s splošnimi orodji, kot sta curl in Postman.
* Slabo, ker nekateri zasloni (npr. *Moja knjižnica*) potrebujejo več klicev ali posebne končne točke.
* Slabo, ker tipi med frontendom in backendom niso samodejno usklajeni, razen če jih ustvarimo iz opisa OpenAPI.
