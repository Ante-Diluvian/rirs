2. Zagon projekta

Projekt sem zagnal po navodilih v LOKALNI-ZAGON.md:

bash
cp .env.example .env        # nastavil JWT_SECRET in ADMIN_PASSWORD
docker compose up --build
docker compose run --rm seed
Aplikacija teče na http://localhost:3000, API na http://localhost:3001, Swagger na http://localhost:3001/docs.
Navodila so jasna in popolna. Projekt se z enim ukazom zažene skupaj z bazo, migracijami in demo podatki.
Seed ustvari administratorja in demo uporabnike z različnimi vlogami, zato je aplikacijo mogoče hitro preizkusiti.
Pri prvem zagonu je gradnja backenda odpovedala pri apk add openssl (TLS: unspecified error). Šlo je za trenutno omrežno težavo pri prenosu paketov Alpine, ne za napako v projektu. Ob ponovnem zagonu je gradnja uspela.
<!-- TODO: dopiši svoje vtise ob uporabi aplikacije (npr. prijava kot knjižničarka, izposoja, vračilo). -->
3. Dokumentacija

Dobro:

Dokumentacija je obsežna in urejena: zasnova, funkcionalnosti z jasno označenim MVP, podatkovni model z ER diagramom, arhitektura, uporabniške zgodbe in wireframes.
23 arhitekturnih odločitev (ADR) v mapi docs/adr utemeljuje izbiro tehnologij in ključne poslovne odločitve.
LOKALNI-ZAGON.md vsebuje predpogoje, naslove storitev in seznam demo uporabnikov.

Pomanjkljivosti:

README.md povezuje na docs/decisions/README.md, ki ne obstaja. ADR-ji so v docs/adr.
README.md povezuje na docs/05-wireframes.md, datoteka pa se imenuje docs/06-wireframes.md.
README.md in docs/04-arhitektura-in-tehnoloski-sklad.md navajata postgres:18-alpine, docker-compose.yml pa uporablja postgres:17-alpine.
4. Koda in arhitektura
Projekt je razdeljen na ločen frontend (frontend/) in backend (backend/), ki komunicirata prek REST API.
Backend je razdeljen v module po domenah (auth, books, authors, copies, loans, reservations, fines, members, settings, my-library, health). Poslovna pravila (izposoja, zamudnine, čakalna vrsta) so izločena v posebne razrede, npr. loan-policy.ts, fine-calculator.ts in reservation-policy.ts.
Dostop je urejen z JWT in guardi po vlogah (roles.guard.ts).
Frontend ima strani za katalog, podrobnosti knjige, urejanje kataloga, pult knjižničarja, »moja knjižnica« in prijavo, kar pokriva funkcionalnosti MVP.
Oba dela imata konfiguriran ESLint, backend tudi Prettier.
<!-- TODO: preveri in dopiši, ali v aplikaciji kaj ne deluje ali manjka (npr. admin funkcionalnosti — statistika, pravila izposoje — niso del MVP in na frontendu nimajo svoje strani). -->
5. Testi
Backend ima enotne teste (22 datotek *.spec.ts) za poslovna pravila, storitve, guarde in pomožne funkcije ter e2e teste (backend/test) za avtentikacijo, knjige, avtorje, izvode in katalog.
E2E testi potrebujejo ločeno testno bazo librarium_test, ki jo ob prvem zagonu ustvari db/init/01-test-db.sql.
Frontend nima testov, na voljo sta samo lint in build.
6. Povzetek ugotovitev
Področje	Ocena	Komentar
Zagon	dobro	en ukaz, jasna navodila, demo podatki
Dokumentacija	dobro	obsežna, nekaj zastarelih povezav in neskladij
Struktura kode	dobro	jasna delitev na module, poslovna pravila izločena
Testi	delno	backend dobro pokrit, frontend brez testov
CI/CD	manjka	v repozitoriju ni mape .github/workflows
7. Načrt nadaljnjega dela
Popraviti neskladja v dokumentaciji (povezave v README.md, različica PostgreSQL).
Vzpostaviti CI/CD z GitHub Actions:
lint: npm run lint za backend in frontend,
build: npm run build za backend in frontend,
testi: npm test in npm run test:e2e (s storitvijo PostgreSQL v workflowu),
deploy ob združitvi v vejo main.