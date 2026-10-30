// Besedila iz kriterijev sprejemljivosti so dobesedna.
export const Messages = {
  validation: {
    invalidInput: 'Neveljavni podatki',
  },
  database: {
    duplicate: 'Zapis s temi podatki že obstaja.',
    relationConflict: 'Zapis je povezan z drugimi podatki.',
    notFound: 'Zapis ne obstaja.',
    unexpected: 'Prišlo je do napake na strežniku.',
  },
} as const;
