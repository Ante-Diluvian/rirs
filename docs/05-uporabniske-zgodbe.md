# 05 – Uporabniške zgodbe

Uporabniške zgodbe pokrivajo vseh 19 funkcionalnosti iz `02-funkcionalnost-in-obseg.md`, za vsako funkcionalnost po eno zgodbo. Zgodbe US-01 do US-07 sodijo v prvo delujočo različico (MVP).

## Pregled

| ID | Zgodba (kratko) | Funkcionalnost | Vloga | MVP | Ocena (SP) | Odvisna od |
|---|---|---|---|---|---|---|
| US-01 | Registracija in prijava | 1 – Prijava, registracija in vloge | bralec | ✓ | 5 | – |
| US-02 | Iskanje po katalogu | 2 – Iskanje po katalogu z razpoložljivostjo | bralec | ✓ | 5 | US-07 |
| US-03 | Izposoja s preverjanjem pravil | 3 – Izposoja z preverjanjem pravil | knjižničar | ✓ | 5 | US-07 |
| US-04 | Vračilo in zamudnina | 4 – Vračilo in samodejni izračun zamudnine | knjižničar | ✓ | 5 | US-03 |
| US-05 | Rezervacija in čakalna vrsta | 5 – Rezervacija in čakalna vrsta | bralec | ✓ | 5 | US-02 |
| US-06 | Moja knjižnica | 6 – Pregled mojih izposoj, rezervacij in zamudnin | bralec | ✓ | 3 | US-03, US-05 |
| US-07 | Upravljanje kataloga | 7 – Upravljanje kataloga | knjižničar | ✓ | 5 | – |
| US-08 | Podaljšanje izposoje | 8 – Podaljšanje izposoje | bralec | | 2 | US-06 |
| US-09 | Potek neprevzete rezervacije | 9 – Samodejni potek neprevzete rezervacije | bralec | | 3 | US-04, US-05 |
| US-10 | Zamudniki in odpust zamudnine | 10 – Seznam zamudnikov in odpust zamudnine | knjižničar | | 3 | US-04 |
| US-11 | Blokada člana | 11 – Blokada člana | knjižničar | | 2 | US-01 |
| US-12 | Ocene in komentarji | 12 – Ocene in komentarji bralcev | bralec | | 3 | US-04 |
| US-13 | Seznam želja | 13 – Seznam želja | bralec | | 2 | US-02 |
| US-14 | Statistika knjižnice | 14 – Statistika knjižnice | administrator | | 5 | US-03 |
| US-15 | Nastavljanje pravil | 15 – Nastavljanje pravil izposoje | administrator | | 3 | – |
| US-16 | Zemljevid knjižnice | 16 – Zemljevid knjižnice | obiskovalec | | 3 | – |
| US-17 | Povezava na Goodreads | 17 – Povezava na Goodreads | bralec | | 1 | US-02 |
| US-18 | Uvoz podatkov po ISBN | 18 – Uvoz podatkov in naslovnic po ISBN | knjižničar | | 3 | US-07 |
| US-19 | Obvestila po e-pošti | 19 – Obvestila po e-pošti | bralec | | 5 | US-03, US-05 |

**Ocena** je v točkah zgodbe (story points) na lestvici 1, 2, 3, 5, 8. Nobena zgodba ni ocenjena z več kot 5, zato je vsaka dovolj majhna za en sprint.

**Odvisna od** pomeni, da zgodba za smiselno preverjanje potrebuje podatke, ki jih ustvari druga zgodba (npr. izposoja potrebuje izvode iz kataloga). Pri razvoju jih lahko zamenjajo testni podatki, zato je vsako zgodbo mogoče razviti in preveriti samostojno.

## Skladnost z INVEST

| Načelo | Kako ga zgodbe upoštevajo |
|---|---|
| **I**ndependent | Vsaka zgodba prinese zaključeno vrednost za eno vlogo. Odvisnosti od podatkov so navedene v pregledu in jih pri razvoju nadomestijo testni podatki. |
| **N**egotiable | Zgodbe opisujejo, kaj uporabnik potrebuje, ne kako bo to narejeno (npr. ne predpisujejo izgleda zaslona ali tehnologije). |
| **V**aluable | Del »da …« pri vsaki zgodbi pove konkretno korist za uporabnika ali knjižnico. |
| **E**stimable | Pravila in meje so znani (`02`, poslovna pravila), zato je obseg vsake zgodbe mogoče oceniti. Ocene so v pregledu. |
| **S**mall | Vsaka zgodba je ocenjena s 5 točkami ali manj in pokriva eno funkcionalnost. |
| **T**estable | Vsak kriterij ima preverljiv izid: konkretno število, stanje, sporočilo ali HTTP status. |

---

## US-01 – Registracija in prijava

| | |
|---|---|
| **Funkcionalnost** | 1 – Prijava, registracija in vloge (MVP) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim ustvariti račun in se prijaviti z e-pošto in geslom, da lahko rezerviram knjige in spremljam svoje izposoje od doma.

**Kriteriji sprejemljivosti:**
1. Registracija zahteva ime, priimek, e-pošto in geslo z vsaj 8 znaki. Če polje manjka ali je geslo krajše, obrazec ob polju izpiše napako in računa ne ustvari.
2. Če račun z vpisano e-pošto že obstaja, sistem izpiše »Račun s to e-pošto že obstaja« in ne ustvari novega računa.
3. Nov račun ima vedno vlogo *bralec*. Vlogi *knjižničar* in *administrator* lahko dodeli samo administrator.
4. Ob napačni e-pošti ali geslu sistem izpiše »Napačna e-pošta ali geslo« in ne razkrije, kateri od podatkov je napačen.
5. Prijavljen bralec v meniju vidi samo *Katalog* in *Moja knjižnica*. Če odpre stran za knjižničarje (npr. *Pult*), vidi sporočilo »Ta stran ne obstaja«, backend pa vrne `404`.

## US-02 – Iskanje po katalogu z razpoložljivostjo

| | |
|---|---|
| **Funkcionalnost** | 2 – Iskanje po katalogu z razpoložljivostjo (MVP) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim poiskati knjigo po naslovu, avtorju, žanru ali ISBN in takoj videti, ali je prosta, da vem, ali jo lahko prevzamem ali jo moram rezervirati.

**Kriteriji sprejemljivosti:**
1. Iskalni niz z vsaj 3 znaki vrne vse knjige, pri katerih naslov ali ime avtorja vsebuje niz, ne glede na velike in male črke. ISBN se ujema samo v celoti, z vezaji ali brez njih.
2. Filtra *žanr* in *samo s prostim izvodom* lahko kombiniram z iskalnim nizom. Ob spremembi filtra se rezultati osvežijo brez ponovnega vnosa niza.
3. Vsak zadetek prikaže naslov, avtorje, leto izida, število prostih izvodov od vseh (npr. »1 od 3 prostih«) in dolžino čakalne vrste (npr. »2 v vrsti«).
4. Rezultati so razdeljeni na strani po 20 zadetkov. Nad seznamom je izpisano skupno število zadetkov.
5. Če ni zadetkov, se izpiše »Nobena knjiga ne ustreza iskanju« z gumbom *Počisti filtre*.

## US-03 – Izposoja s preverjanjem pravil

| | |
|---|---|
| **Funkcionalnost** | 3 – Izposoja z preverjanjem pravil (MVP, domensko) |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim evidentirati izposojo izvoda, pri čemer sistem sam preveri pravila izposoje, da mi jih ni treba preverjati ročno in da so vse izposoje v skladu s pravilnikom.

**Kriteriji sprejemljivosti:**
1. Izposojo evidentiram tako, da izberem člana (iskanje po imenu ali e-pošti) in vnesem inventarno številko izvoda. Rok vrnitve se samodejno nastavi na datum izposoje + 21 dni in se izpiše v potrditvi.
2. Če je član blokiran, ima že 5 aktivnih izposoj ali ima neplačane zamudnine nad 5,00 €, sistem izposojo zavrne in izpiše razlog, npr. »Član ima 5 aktivnih izposoj, kar je največ dovoljeno«.
3. Izvod v stanju *Rezerviran* lahko izposodim samo članu, za katerega je rezerviran. Drugim članom ga sistem ne izposodi.
4. Če ima član že aktivno izposojo istega naslova, sistem izposojo zavrne.
5. Po uspešni izposoji ima izvod stanje *Izposojen*. Če je imel član za ta naslov rezervacijo *Na voljo*, dobi ta stanje *Izposojena*.

## US-04 – Vračilo in samodejni izračun zamudnine

| | |
|---|---|
| **Funkcionalnost** | 4 – Vračilo in samodejni izračun zamudnine (MVP, domensko) |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim ob vračilu vnesti inventarno številko in takoj videti zamudnino ter kam gre izvod, da članu povem pravi znesek in knjigo odložim na pravo mesto.

**Kriteriji sprejemljivosti:**
1. Po vnosu inventarne številke izposojenega izvoda se izpišejo član, naslov, rok vrnitve in število dni zamude.
2. Zamudnina je število dni zamude × 0,10 €. Pri vračilu v roku je 0,00 €, pri vračilu 3 dni po roku 0,30 €.
3. Če ima naslov čakajoče rezervacije, sistem izvod dodeli najstarejši (stanje *Na voljo*, rok prevzema 3 dni) in izpiše »Odloži na polico rezervacij za: [ime člana]«. Sicer dobi izvod stanje *Prost*.
4. Za izvod, ki ni izposojen, sistem izpiše »Izvod [inventarna številka] ni izposojen« in ničesar ne spremeni.
5. Vračilo in morebitna dodelitev rezervaciji se izvedeta skupaj: če ena operacija spodleti, se ne shrani nobena.

## US-05 – Rezervacija in čakalna vrsta

| | |
|---|---|
| **Funkcionalnost** | 5 – Rezervacija in čakalna vrsta (MVP, domensko) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim rezervirati naslov, ki nima prostega izvoda, da pridem na vrsto, ko ga nekdo vrne, in mi kataloga ni treba preverjati vsak dan.

**Kriteriji sprejemljivosti:**
1. Gumb *Rezerviraj* je prikazan samo pri naslovih brez prostega izvoda. Pri naslovih s prostim izvodom piše »Na voljo na polici«.
2. Po rezervaciji vidim svoj položaj v vrsti, npr. »2. v vrsti«. Položaj je določen po času rezervacije.
3. Imam lahko največ 3 aktivne rezervacije. Pri četrti sistem izpiše »Imaš že 3 aktivne rezervacije« in je ne ustvari.
4. Istega naslova ne morem rezervirati dvakrat, prav tako ne naslova, ki ga imam izposojenega.
5. Rezervacijo v stanju *Čakajoča* ali *Na voljo* lahko prekličem. Bralcem za mano se položaj zmanjša za 1.

## US-06 – Moja knjižnica

| | |
|---|---|
| **Funkcionalnost** | 6 – Pregled mojih izposoj, rezervacij in zamudnin (MVP) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim na enem mestu videti svoje izposoje, rezervacije in zamudnine, da vem, kdaj moram kaj vrniti in koliko dolgujem.

**Kriteriji sprejemljivosti:**
1. Stran *Moja knjižnica* prikaže aktivne izposoje z naslovom, datumom izposoje, rokom vrnitve in številom preostalih dni. Zamujene izposoje so označene in imajo prikazano trenutno zamudnino.
2. Izposoje z rokom v naslednjih 3 dneh so označene z »Rok kmalu poteče«.
3. Rezervacije so prikazane s stanjem: pri *Čakajoča* s položajem v vrsti, pri *Na voljo* z datumom, do katerega jo moram prevzeti.
4. Na vrhu strani je skupna neplačana zamudnina. Če je nad 5,00 €, je ob njej opozorilo, da izposoja ni mogoča, dokler zamudnine ne poravnam.
5. Vidim samo svoje podatke. Zahteva za podatke drugega člana vrne `403`.

## US-07 – Upravljanje kataloga

| | |
|---|---|
| **Funkcionalnost** | 7 – Upravljanje kataloga (MVP) |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim dodajati, urejati in brisati knjige, avtorje in izvode, da katalog vedno ustreza knjigam na policah.

**Kriteriji sprejemljivosti:**
1. Knjiga zahteva naslov, vsaj enega avtorja, žanr in ISBN s 13 števkami. Če ISBN že obstaja, sistem izpiše »Knjiga s tem ISBN že obstaja« in je ne shrani.
2. Nov izvod potrebuje unikatno inventarno številko in dobi stanje *Prost*. Število vseh in prostih izvodov pri knjigi se takoj poveča za 1.
3. Knjige ali izvoda z zgodovino izposoj ni mogoče izbrisati. Sistem izpiše razlog, pri izvodu pa predlaga, naj ga označim kot *Izgubljen*.
4. Avtorja, ki je naveden pri vsaj eni knjigi, ni mogoče izbrisati.
5. Spremembe so takoj vidne v iskanju po katalogu (US-02).

## US-08 – Podaljšanje izposoje

| | |
|---|---|
| **Funkcionalnost** | 8 – Podaljšanje izposoje (domensko) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim sam podaljšati izposojo, da lahko knjigo dokončam brez obiska knjižnice.

**Kriteriji sprejemljivosti:**
1. Pri vsaki aktivni izposoji v *Moja knjižnica* je gumb *Podaljšaj*. Podaljšanje premakne rok za 7 dni od trenutnega roka.
2. Pri izposoji je izpisano število opravljenih podaljšanj, npr. »Podaljšano 1 od 2«.
3. Izposojo lahko podaljšam največ 2-krat. Po drugem podaljšanju gumb ni več aktiven in prikaže »Največ podaljšanj«.
4. Podaljšanje ni mogoče, če ima naslov čakajoče rezervacije ali če je izposoja zamujena. Sistem izpiše razlog in rok ostane nespremenjen.

## US-09 – Samodejni potek neprevzete rezervacije

| | |
|---|---|
| **Funkcionalnost** | 9 – Samodejni potek neprevzete rezervacije (domensko) |
| **Vloga** | bralec (naslednji v čakalni vrsti) |

**Zgodba:** Kot bralec v čakalni vrsti želim priti na vrsto takoj, ko bralec pred mano rezervirane knjige ne prevzame v roku, da mi ni treba čakati na nekoga, ki knjige ne pride iskat.

**Kriteriji sprejemljivosti:**
1. Planirano opravilo se izvede enkrat dnevno ob 01:00.
2. Vsaka rezervacija v stanju *Na voljo*, ki ji je rok prevzema potekel, dobi stanje *Potekla*.
3. Izvod se dodeli naslednji čakajoči rezervaciji za isti naslov (stanje *Na voljo*, nov rok prevzema 3 dni). Če čakajočih ni, dobi izvod stanje *Prost*.
4. Bralec vidi potečeno rezervacijo v *Moja knjižnica* s stanjem *Potekla*. Če knjigo še želi, se mora ponovno uvrstiti na konec vrste.
5. Ponoven zagon opravila istega dne ničesar ne spremeni.

## US-10 – Seznam zamudnikov in odpust zamudnine

| | |
|---|---|
| **Funkcionalnost** | 10 – Seznam zamudnikov in odpust zamudnine |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim videti seznam zamudnikov ter evidentirati plačilo ali odpust zamudnine, da lahko člane opomnim in vodim točno evidenco dolgov.

**Kriteriji sprejemljivosti:**
1. Seznam prikaže člane z vsaj eno zamujeno izposojo ali neplačano zamudnino: ime, e-pošto, število zamujenih izposoj in skupno neplačano zamudnino. Razvrščen je po zamudnini, od najvišje.
2. Ko zamudnino označim kot plačano, se skupni dolg člana takoj zmanjša za ta znesek.
3. Odpust zamudnine zahteva obrazložitev z vsaj 10 znaki. Brez nje gumb *Odpusti* ni aktiven.
4. Odpuščena zamudnina ostane v zgodovini izposoje z oznako *Odpuščena* in se ne šteje več v dolg.
5. Bralec do seznama nima dostopa (`404`).

## US-11 – Blokada člana

| | |
|---|---|
| **Funkcionalnost** | 11 – Blokada člana |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim blokirati in odblokirati člana, da član, ki krši pravila, ne more izposojati ali rezervirati knjig.

**Kriteriji sprejemljivosti:**
1. Na strani člana je gumb *Blokiraj* oziroma *Odblokiraj*. Sprememba velja takoj.
2. Blokiran član ne more rezervirati (sporočilo »Tvoj račun je blokiran. Obrni se na knjižnico.«), knjižničar pa mu ne more izposoditi knjige (US-03).
3. Blokada ne vpliva na že izposojene knjige: vračilo je še vedno mogoče.
4. Blokiran član na vrhu strani *Moja knjižnica* vidi obvestilo o blokadi.
5. Seznam članov ima filter *Blokirani*, ki prikaže samo blokirane člane.

## US-12 – Ocene in komentarji bralcev

| | |
|---|---|
| **Funkcionalnost** | 12 – Ocene in komentarji bralcev |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim oceniti prebrano knjigo in napisati kratek komentar, da drugim bralcem pomagam izbrati knjigo.

**Kriteriji sprejemljivosti:**
1. Oceno (1–5) lahko oddam samo za naslov, ki sem ga vsaj enkrat izposodil in vrnil. Pri drugih naslovih obrazec za oceno ni prikazan.
2. Komentar je neobvezen in ima največ 500 znakov.
3. Za isti naslov imam lahko eno oceno. Ponovna oddaja obstoječo oceno posodobi.
4. Pri knjigi sta prikazana povprečna ocena na eno decimalko in število ocen. Komentarji so razvrščeni od najnovejšega.
5. Svoj komentar lahko izbrišem. Knjižničar lahko izbriše katerikoli komentar.

## US-13 – Seznam želja

| | |
|---|---|
| **Funkcionalnost** | 13 – Seznam želja |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim shraniti knjige, ki jih želim prebrati kasneje, da jih ne pozabim in jih lahko hitro rezerviram.

**Kriteriji sprejemljivosti:**
1. Pri vsaki knjigi v katalogu je gumb *Na seznam želja*. Pri knjigi, ki je že na seznamu, piše *Odstrani s seznama želja*.
2. Seznam želja prikaže naslove s trenutno razpoložljivostjo (prosti izvodi, dolžina vrste).
3. Pri naslovu brez prostega izvoda lahko s seznama ustvarim rezervacijo z enim klikom. Veljajo pravila iz US-05.
4. Seznam ima lahko največ 100 naslovov. Pri 101. sistem izpiše, da je seznam poln.

## US-14 – Statistika knjižnice

| | |
|---|---|
| **Funkcionalnost** | 14 – Statistika knjižnice |
| **Vloga** | administrator |

**Zgodba:** Kot administrator želim videti statistiko izposoj, da lahko načrtujem nakup novih izvodov in ugotovim, kje nastajajo zamude.

**Kriteriji sprejemljivosti:**
1. Statistika prikaže 10 najbolj izposojenih naslovov v izbranem obdobju (privzeto zadnjih 12 mesecev) s številom izposoj.
2. Prikaže število zamujenih vračil po mesecih za zadnjih 12 mesecev.
3. Prikaže 10 najaktivnejših članov po številu izposoj v izbranem obdobju.
4. Prikaže naslove, ki imajo v čakalni vrsti več kot 3 bralce, kot kandidate za nakup dodatnega izvoda.
5. Do statistike ima dostop samo administrator. Drugim vlogam backend vrne `404`.

## US-15 – Nastavljanje pravil izposoje

| | |
|---|---|
| **Funkcionalnost** | 15 – Nastavljanje pravil izposoje |
| **Vloga** | administrator |

**Zgodba:** Kot administrator želim spreminjati pravila izposoje brez posega v kodo, da lahko knjižnica hitro prilagodi pravilnik, npr. daljši rok izposoje med poletjem.

**Kriteriji sprejemljivosti:**
1. Na strani *Pravila* lahko spremenim: rok izposoje, zamudnino na dan, največ aktivnih izposoj, mejo zamudnine za zavrnitev izposoje, največ podaljšanj, dni podaljšanja, rok prevzema rezervacije in največ aktivnih rezervacij.
2. Vse vrednosti morajo biti pozitivna cela števila, zamudnina in meja zamudnine pa število ≥ 0. Neveljavna vrednost se ne shrani, polje izpiše napako.
3. Nova pravila veljajo za nove izposoje in rezervacije. Rok obstoječih izposoj se ne spremeni.
4. Po shranjevanju se izpiše potrditev s prejšnjo in novo vrednostjo vsakega spremenjenega pravila.
5. Knjižničar in bralec do strani nimata dostopa (`404`).

## US-16 – Zemljevid knjižnice

| | |
|---|---|
| **Funkcionalnost** | 16 – Zemljevid knjižnice (zunanje) |
| **Vloga** | obiskovalec (tudi neprijavljen) |

**Zgodba:** Kot obiskovalec spletne strani želim na zemljevidu videti, kje je knjižnica in kdaj je odprta, da lahko pridem po rezervirano knjigo, ne da bi naslov iskal drugje.

**Kriteriji sprejemljivosti:**
1. Stran *O knjižnici* je dostopna brez prijave in prikaže zemljevid OpenStreetMap z oznako za vsako lokacijo. Zemljevid je ob odprtju povečan tako, da so vidne vse lokacije.
2. Klik na oznako prikaže naziv, naslov, odpiralni čas in povezavo *Odpri na OpenStreetMap*, ki odpre to lokacijo na openstreetmap.org.
3. Na zemljevidu je ves čas vidna navedba »© OpenStreetMap contributors«.
4. Če se zemljevid ne naloži, so naziv, naslov in odpiralni čas vseh lokacij prikazani kot seznam.
5. Administrator lahko lokacijo doda, uredi ali izbriše. Koordinate izven veljavnega obsega (širina −90 do 90, dolžina −180 do 180) se ne shranijo, sprememba pa je takoj vidna na zemljevidu.

## US-17 – Povezava na Goodreads

| | |
|---|---|
| **Funkcionalnost** | 17 – Povezava na Goodreads (zunanje) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim s strani knjige odpreti isto knjigo na Goodreads, da preberem mnenja drugih bralcev, preden se odločim za rezervacijo.

**Kriteriji sprejemljivosti:**
1. Na strani knjige je povezava *Poglej na Goodreads*, ki odpre iskanje po ISBN te knjige (`https://www.goodreads.com/search?q=<ISBN>`). ISBN v povezavi je brez vezajev.
2. Povezava se odpre v novem zavihku in ima atribut `rel="noopener noreferrer"`, zato Goodreads ne izve, s katere strani Librariuma je bralec prišel.
3. Ocene z Goodreads se v Librariumu ne prikazujejo. Ocene bralcev Librariuma (US-12) so prikazane ločeno in se z Goodreads ne mešajo.

## US-18 – Uvoz podatkov in naslovnic po ISBN

| | |
|---|---|
| **Funkcionalnost** | 18 – Uvoz podatkov in naslovnic po ISBN (zunanje) |
| **Vloga** | knjižničar |

**Zgodba:** Kot knjižničar želim, da sistem po vnosu ISBN sam izpolni podatke o knjigi in doda naslovnico, da novo knjigo vnesem hitreje in brez tipkarskih napak.

**Kriteriji sprejemljivosti:**
1. V obrazcu *Dodaj knjigo* je ob polju ISBN gumb *Izpolni iz Open Library*. Po kliku se izpolnijo naslov, avtorji, leto izida, število strani in naslovnica, če jih Open Library pozna.
2. Predizpolnjene podatke lahko pred shranjevanjem spremenim. Knjiga se shrani šele s klikom na *Shrani*, veljajo pa enaka pravila kot v US-07 (npr. žanr je obvezen).
3. Avtor, ki v katalogu že obstaja z enakim imenom in priimkom, se poveže z obstoječim zapisom in se ne podvoji.
4. Če Open Library knjige ne najde ali ne odgovori v 5 sekundah, se izpiše »Podatkov za ta ISBN ni bilo mogoče pridobiti«, obrazec pa ostane na voljo za ročni vnos.
5. Naslovnica je prikazana v katalogu in na strani knjige. Knjiga brez naslovnice ima nadomestno sliko.

## US-19 – Obvestila po e-pošti

| | |
|---|---|
| **Funkcionalnost** | 19 – Obvestila po e-pošti (zunanje) |
| **Vloga** | bralec |

**Zgodba:** Kot bralec želim po e-pošti prejeti opomnik pred rokom vrnitve in obvestilo, ko je moja rezervirana knjiga na voljo, da ne zamudim roka in ne izgubim rezervacije.

**Kriteriji sprejemljivosti:**
1. 3 dni pred rokom vrnitve prejmem opomnik z naslovom knjige in rokom. Za isti rok prejmem opomnik samo enkrat, po podaljšanju pa nov opomnik za nov rok.
2. Ko moja rezervacija preide v stanje *Na voljo*, prejmem obvestilo z naslovom knjige in datumom, do katerega jo moram prevzeti.
3. Dan po roku vrnitve prejmem obvestilo o zamudi s trenutno zamudnino.
4. V profilu lahko obvestila izklopim. Ko so izklopljena, ne prejmem nobenega od zgornjih sporočil.
5. Če pošiljanje spodleti, se vračilo ali izposoja vseeno shrani, sistem pa obvestilo poskusi poslati še največ 2-krat.