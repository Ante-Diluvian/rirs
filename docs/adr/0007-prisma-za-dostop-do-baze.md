# Do baze dostopamo prek Prisme, ker je tipsko varna

## Context and Problem Statement

Backend v TypeScriptu mora brati in pisati v PostgreSQL, vzdrževati shemo z migracijami in izvajati transakcije. Napaka v imenu polja ali tipu se pri ročnem SQL pokaže šele ob izvajanju. Potrebujemo način dostopa, ki take napake odkrije že pri prevajanju.

## Considered Options

* Prisma ORM in Prisma Migrate
* TypeORM
* Drizzle ORM
* `pg` z ročnim SQL

## Decision Outcome

Izbrana možnost: »Prisma ORM in Prisma Migrate«, ker iz ene sheme (`schema.prisma`) ustvari tipsko varnega odjemalca in migracije ter podpira transakcije. Shema je ločen in berljiv opis modela, ki ga lahko neposredno primerjamo s `03-podatkovni-model.md`, tipi rezultatov pa se prilagodijo izbranim poljem in relacijam v poizvedbi. TypeORM tipe rezultatov izpelje iz razreda entitete, zato tip ne pove, ali je relacija v rezultatu res naložena. Drizzle je lažji in bližje SQL, vendar shemo zapišemo v kodi TypeScript, brez ločenega deklarativnega opisa modela. Ročni SQL bi zahteval ročno preslikavo tipov in ročne migracije za celoten model.

### Consequences

* Dobro, ker napačno ime polja ali tip odkrije prevajalnik TypeScript, ne šele baza ob izvajanju.
* Dobro, ker sta shema in zgodovina migracij na enem mestu v repozitoriju.
* Slabo, ker nekaterih zmožnosti PostgreSQL shema Prisma ne izrazi ali jih podpira le delno (delni unikatni indeksi, `NULLS NOT DISTINCT`, zaklepanje vrstic s `SELECT … FOR UPDATE`). Zanje potrebujemo ročne migracije SQL in neposredne poizvedbe.
* Slabo, ker Prisma doda korak generiranja odjemalca in svojo plast med kodo in bazo.
