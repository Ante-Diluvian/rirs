# Poteke rezervacij in zamude obdela planirano opravilo v backendu

## Context and Problem Statement

Nekatere spremembe stanja niso posledica dejanja uporabnika. Rezervacija *Na voljo* po 3 dneh poteče in izvod pripade naslednjemu v vrsti, izposoja po roku postane zamujena. Če jih sistem ne izvede sam, naslednji bralec v vrsti čaka v nedogled.

## Considered Options

* Planirano opravilo v procesu backenda (`@nestjs/schedule`)
* Zunanji razporejevalnik (sistemski cron ali `pg_cron` v bazi)
* Izračun stanja ob branju, brez opravila

## Decision Outcome

Izbrana možnost: »Planirano opravilo v procesu backenda (`@nestjs/schedule`)«, ker opravilo teče v isti kodi in z istimi servisi kot ostala pravila, zato se prehod rezervacije izvede enako kot ob vračilu ([ADR-0010](0010-poslovna-pravila-v-backendu.md), [ADR-0011](0011-transakcije-pri-izposoji-in-vracilu.md)). Zunanji razporejevalnik bi pravila razdelil na več mest. Izračun ob branju bi zamudo lahko prikazal, izvoda pa ne bi dodelil naslednjemu v vrsti.

### Consequences

* Dobro, ker poteki ne potrebujejo dejanja uporabnika ali knjižničarja.
* Dobro, ker je opravilo idempotentno: ponoven zagon istega dne ne spremeni ničesar (US-09, kriterij 5).
* Slabo, ker se opravilo ne izvede, če backend ob načrtovanem času ne teče. Zato naj ob zagonu backenda obdela zamujene poteke.
* Slabo, ker bi se pri več primerkih backenda opravilo izvedlo v vsakem, kar bi zahtevalo zaklep.
