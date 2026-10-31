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
  database: {
    duplicate: 'Zapis s temi podatki že obstaja.',
    relationConflict: 'Zapis je povezan z drugimi podatki.',
    notFound: 'Zapis ne obstaja.',
    unexpected: 'Prišlo je do napake na strežniku.',
  },
} as const;
