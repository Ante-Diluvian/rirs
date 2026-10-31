// Besedila iz kriterijev sprejemljivosti so dobesedna.
export const Messages = {
  validation: {
    invalidInput: 'Neveljavni podatki',
  },
  auth: {
    emailTaken: 'Račun s to e-pošto že obstaja',
    invalidCredentials: 'Napačna e-pošta ali geslo',
    passwordTooShort: 'Geslo mora imeti vsaj 8 znakov',
    passwordTooLong: 'Geslo je predolgo, največ 72 znakov',
    passwordRequired: 'Vnesi geslo',
    firstNameRequired: 'Vnesi ime',
    lastNameRequired: 'Vnesi priimek',
    nameTooLong: 'Vnos je predolg, največ 100 znakov',
    emailInvalid: 'Vnesi veljaven e-poštni naslov',
    unauthorized: 'Za dostop se prijavi.',
  },
  access: {
    notFound: 'Ta stran ne obstaja',
  },
  members: {
    notFound: 'Član ne obstaja.',
    roleInvalid: 'Vloga mora biti READER, LIBRARIAN ali ADMIN.',
    ownRole: 'Svoje vloge ne moreš spremeniti.',
  },
  authors: {
    notFound: 'Avtor ne obstaja.',
    hasBooks:
      'Avtorja, ki je naveden pri vsaj eni knjigi, ni mogoče izbrisati.',
    firstNameRequired: 'Vnesi ime',
    lastNameRequired: 'Vnesi priimek',
    textTooLong: 'Vnos je predolg, največ 100 znakov',
    biographyTooLong: 'Življenjepis je predolg, največ 2000 znakov',
    birthDateInvalid: 'Vnesi veljaven datum v obliki LLLL-MM-DD',
    queryInvalid: 'Iskalni niz je lahko dolg največ 100 znakov',
  },
  books: {
    notFound: 'Knjiga ne obstaja.',
    isbnTaken: 'Knjiga s tem ISBN že obstaja',
    hasLoans: 'Knjige z zgodovino izposoj ni mogoče izbrisati.',
    hasActiveReservations:
      'Knjige z aktivnimi rezervacijami ni mogoče izbrisati.',
    titleRequired: 'Vnesi naslov',
    titleTooLong: 'Naslov je predolg, največ 255 znakov',
    authorsRequired: 'Izberi vsaj enega avtorja',
    authorNotFound: 'Izbrani avtor ne obstaja.',
    genreRequired: 'Vnesi žanr',
    genreTooLong: 'Žanr je predolg, največ 100 znakov',
    isbnRequired: 'Vnesi ISBN',
    isbnInvalid: 'ISBN mora imeti 13 števk',
    yearInvalid: 'Leto izida mora biti celo število med 1000 in 2100',
    languageTooLong: 'Jezik je predolg, največ 50 znakov',
    descriptionTooLong: 'Opis je predolg, največ 5000 znakov',
  },
  copies: {
    notFound: 'Izvod ne obstaja.',
    inventoryTaken: 'Izvod s to inventarno številko že obstaja.',
    hasLoans:
      'Izvoda z zgodovino izposoj ni mogoče izbrisati. Označi ga kot izgubljenega.',
    reserved: 'Rezerviranega izvoda ni mogoče izbrisati.',
    statusLocked:
      'Izposojenemu ali rezerviranemu izvodu ni mogoče ročno spremeniti stanja.',
    inventoryRequired: 'Vnesi inventarno številko',
    inventoryTooLong: 'Inventarna številka je predolga, največ 20 znakov',
    shelfTooLong: 'Oznaka police je predolga, največ 50 znakov',
    statusInvalid: 'Stanje je lahko samo AVAILABLE ali LOST.',
  },
  database: {
    duplicate: 'Zapis s temi podatki že obstaja.',
    relationConflict: 'Zapis je povezan z drugimi podatki.',
    notFound: 'Zapis ne obstaja.',
    unexpected: 'Prišlo je do napake na strežniku.',
  },
} as const;
