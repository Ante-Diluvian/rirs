# Gesla zgoščujemo z bcrypt

## Context and Problem Statement

Librarium hrani gesla članov. Ob vdoru v bazo napadalec ne sme dobiti gesel, zato jih hranimo samo zgoščena z algoritmom s soljo. Odločiti moramo, kateri algoritem uporabimo.

## Considered Options

* bcrypt
* Argon2id
* scrypt
* PBKDF2

## Decision Outcome

Izbrana možnost: »bcrypt«, ker je preizkušen algoritem z vgrajeno soljo in nastavljivim stroškovnim faktorjem. Za izračun porabi zelo malo pomnilnika, zato je obremenitev strežnika ob hkratnih prijavah predvidljiva tudi na manjšem gostovanju. Argon2id za vsako zgoščevanje porabi vsaj 19 MiB pomnilnika. Zapis zgoščene vrednosti bcrypt podpira večina jezikov in ogrodij, zato gesel ob morebitni selitvi na drugo platformo ni treba ponastaviti. scrypt je pomnilniško zahteven podobno kot Argon2id, PBKDF2 pa za primerljivo zaščito potrebuje več sto tisoč ponovitev in ne porablja pomnilnika, zato je še manj odporen proti napadom z grafičnimi procesorji kot bcrypt.

### Consequences

* Dobro, ker je uporaba preprosta (`hash` in `compare`) in dobro dokumentirana.
* Dobro, ker je poraba pomnilnika pri prijavi majhna in predvidljiva, kar ustreza manjšim gostovanjem.
* Slabo, ker bcrypt ni prvo priporočilo OWASP za nove sisteme: za razliko od Argon2id ne porablja veliko pomnilnika, zato je manj odporen proti napadom z grafičnimi procesorji.
* Slabo, ker bcrypt upošteva samo prvih 72 bajtov gesla, zato mora registracija omejiti največjo dolžino gesla.
