# E-poštna obvestila pošiljamo prek tabele obvestil (outbox)

## Context and Problem Statement

Obvestila (funkcionalnost 19) nastanejo ob vračilu (rezervacija je *Na voljo*) in v dnevnem opravilu (opomnik pred rokom, zamuda). Strežnik SMTP je lahko počasen ali nedosegljiv. Pošiljanje znotraj transakcije vračila bi vračilo upočasnilo ali prekinilo, pošiljanje po transakciji pa bi obvestilo ob napaki izgubilo.

## Considered Options

* Tabela `obvestilo` (vzorec outbox) in opravilo, ki pošilja čakajoča obvestila
* Pošiljanje neposredno med obdelavo zahteve
* Vrsta sporočil z ločeno storitvijo (npr. Redis z BullMQ)

## Decision Outcome

Izbrana možnost: »Tabela `obvestilo` (vzorec outbox) in opravilo, ki pošilja čakajoča obvestila«, ker se obvestilo zapiše v isti transakciji kot vračilo, zato se ne izgubi, pošlje pa ga ločeno opravilo, ki napako SMTP zabeleži in pošiljanje ponovi (skupaj največ 3 poskusi). Unikatna omejitev v tabeli prepreči podvojena sporočila. Neposredno pošiljanje ne izpolni US-19, kriterij 5. Vrsta sporočil bi delovala enako dobro, vendar zahteva dodatno storitev (Redis), ki je za nekaj sto sporočil na dan nepotrebna.

### Consequences

* Dobro, ker napaka pri pošiljanju ne vpliva na izposojo ali vračilo.
* Dobro, ker tabela vsebuje zapis o vseh poslanih in neuspelih obvestilih.
* Slabo, ker obvestilo odide z zamikom, do naslednjega zagona opravila (nekaj minut).
* Slabo, ker tabela raste, zato moramo stare zapise občasno brisati.
