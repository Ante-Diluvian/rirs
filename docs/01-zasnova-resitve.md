# 01 – Zasnova rešitve

## Ime rešitve

**Librarium** – spletni sistem za upravljanje izposoje, rezervacij in zamudnin v lokalni knjižnici.

## Namen rešitve

Librarium knjižnici omogoča, da celoten krog izposoje knjige (iskanje, rezervacija, izposoja, vračilo, zamudnina) poteka na enem mestu in po jasnih, samodejno preverjanih pravilih. Bralcem ni treba klicati ali hoditi v knjižnico, da bi izvedeli, ali je knjiga prosta. Knjižničarjem ni treba ročno računati zamud in voditi čakalnih seznamov.

## Problem, ki ga rešitev naslavlja

Manjše in srednje velike knjižnice (mestne, šolske, društvene) pogosto vodijo evidenco v preglednicah ali zastarelih lokalnih programih. To povzroča naslednje težave:

- **Nepregledna razpoložljivost.** Bralec ne ve, ali je knjiga prosta, dokler ne pride v knjižnico ali ne pokliče.
- **Neurejena čakalna vrsta.** Za priljubljene naslove ni pravičnega vrstnega reda. Rezervacije se vodijo ročno, na listkih ali v e-pošti, prosti izvodi pa se včasih izposodijo mimo vrste.
- **Ročno računanje zamudnin.** Knjižničar mora sam preverjati roke vrnitve in računati zamudnino, zato je veliko napak in sporov.
- **Ni nadzora nad pravili.** Omejitve (največ število izposoj, blokada ob neplačani zamudnini, podaljšanje samo brez čakalne vrste) se izvajajo po občutku.
- **Ni pregleda nad delovanjem.** Vodstvo ne ve, katere knjige so najbolj iskane ali koliko je zamud.

## Ciljni uporabniki

Rešitev je namenjena eni lokalni knjižnici z nekaj tisoč naslovi, nekaj sto do nekaj tisoč člani in majhno ekipo zaposlenih. Uporabniki so:

| Uporabnik | Situacija | Kaj želi doseči |
|---|---|---|
| **Bralec (član)** | doma ali na poti išče knjigo | najti knjigo, videti razpoložljivost, rezervirati izposojeno knjigo, spremljati svoje roke in zamudnine |
| **Knjižničar** | za pultom ob izposoji in vračilu | hitro evidentirati izposojo in vračilo, upravljati katalog in člane, imeti pregled nad zamudniki |
| **Administrator** | vodja knjižnice ali tehnični skrbnik | dodeljevati vloge, nastavljati pravila izposoje, spremljati statistiko |

## Kratek opis delovanja

1. **Bralec** se prijavi in išče po katalogu (naslov, avtor, žanr). Za vsak naslov vidi, koliko izvodov je prostih.
2. Če je prost izvod, ga bralec prevzame v knjižnici. **Knjižničar** v sistemu evidentira izposojo. Sistem preveri pravila: največ 5 izposojenih knjig hkrati, brez neplačane zamudnine nad mejo, 21-dnevni rok.
3. Če so vsi izvodi izposojeni, bralec **rezervira naslov** in se uvrsti v čakalno vrsto.
4. Ko nekdo knjigo **vrne**, sistem izračuna morebitno zamudnino. Če za naslov obstaja čakalna vrsta, izvod samodejno rezervira za prvega v vrsti. Ta ima 3 dni za prevzem, nato rezervacija poteče in na vrsto pride naslednji.
5. **Administrator** nastavlja pravila (rok izposoje, višina zamudnine, največje število izposoj) in pregleduje statistiko.

## Primer uporabe

David v katalogu najde roman, ki ga išče. Vsi trije izvodi so izposojeni, zato ga rezervira in je v vrsti drug. Čez teden dni Janez vrne en izvod, dva dni po roku. Knjižničar v sistemu označi vračilo in sistem Janezu obračuna zamudnino 0,20 €. Ker za naslov obstaja čakalna vrsta, izvod ostane rezerviran za prvega v vrsti. Ta prevzame knjigo v dveh dneh, zato ostane David drug in na vrsto pride ob naslednjem vračilu. Ko je njegova rezervacija na voljo, jo vidi v pregledu svojih rezervacij z rokom prevzema.