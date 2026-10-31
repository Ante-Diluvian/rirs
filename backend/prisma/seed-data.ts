export const DEFAULT_SETTINGS: Record<string, string> = {
  loan_period_days: '21',
  fine_per_day: '0.10',
  max_active_loans: '5',
  fine_limit: '5.00',
  max_active_reservations: '3',
  pickup_days: '3',
  max_extensions: '2',
  extension_days: '7',
};

export interface SeedPerson {
  firstName: string;
  lastName: string;
  email: string;
}

export const LIBRARIAN: SeedPerson = {
  firstName: 'Ana',
  lastName: 'Horvat',
  email: 'ana.horvat@example.com',
};

export const READERS = {
  maja: {
    firstName: 'Maja',
    lastName: 'Kovač',
    email: 'maja.kovac@example.com',
  },
  janez: {
    firstName: 'Janez',
    lastName: 'Novak',
    email: 'janez.novak@example.com',
  },
  luka: {
    firstName: 'Luka',
    lastName: 'Zupan',
    email: 'luka.zupan@example.com',
  },
  nina: {
    firstName: 'Nina',
    lastName: 'Golob',
    email: 'nina.golob@example.com',
  },
  tomaz: {
    firstName: 'Tomaž',
    lastName: 'Mlakar',
    email: 'tomaz.mlakar@example.com',
  },
  petra: {
    firstName: 'Petra',
    lastName: 'Kralj',
    email: 'petra.kralj@example.com',
  },
} satisfies Record<string, SeedPerson>;

export type ReaderKey = keyof typeof READERS;

export interface SeedBook {
  title: string;
  authors: [firstName: string, lastName: string][];
  year: number;
  genre: string;
  language: string;
  copies: number;
  description?: string;
  inventoryNumbers?: string[];
}

const SL = 'slovenščina';
const EN = 'angleščina';

export const BOOKS: SeedBook[] = [
  {
    title: 'Alamut',
    authors: [['Vladimir', 'Bartol']],
    year: 1938,
    genre: 'zgodovinski roman',
    language: SL,
    copies: 2,
    inventoryNumbers: ['INV-000412', 'INV-000413'],
    description:
      'Hasan ibn Sabah v trdnjavi Alamut s prevaro vzgoji vojsko privržencev, ki so zanj pripravljeni umreti.',
  },
  {
    title: 'Na klancu',
    authors: [['Ivan', 'Cankar']],
    year: 1902,
    genre: 'roman',
    language: SL,
    copies: 2,
    description:
      'Francka in njeni otroci se kljub trudu ne morejo izviti iz revščine.',
  },
  {
    title: 'Visoška kronika',
    authors: [['Ivan', 'Tavčar']],
    year: 1919,
    genre: 'zgodovinski roman',
    language: SL,
    copies: 1,
    description:
      'Kronika rodbine Khallan s Visokega iz časa po tridesetletni vojni.',
  },
  {
    title: 'Martin Krpan z Vrha',
    authors: [['Fran', 'Levstik']],
    year: 1858,
    genre: 'kratka proza',
    language: SL,
    copies: 2,
  },
  {
    title: 'Deseti brat',
    authors: [['Josip', 'Jurčič']],
    year: 1866,
    genre: 'roman',
    language: SL,
    copies: 2,
  },
  {
    title: 'Hlapec Jernej in njegova pravica',
    authors: [['Ivan', 'Cankar']],
    year: 1907,
    genre: 'kratka proza',
    language: SL,
    copies: 1,
  },
  {
    title: 'Pod svobodnim soncem',
    authors: [['Fran Saleški', 'Finžgar']],
    year: 1907,
    genre: 'zgodovinski roman',
    language: SL,
    copies: 2,
  },
  {
    title: 'Cvetje v jeseni',
    authors: [['Ivan', 'Tavčar']],
    year: 1917,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Poezije',
    authors: [['France', 'Prešeren']],
    year: 1847,
    genre: 'poezija',
    language: SL,
    copies: 2,
  },
  {
    title: 'Krst pri Savici',
    authors: [['France', 'Prešeren']],
    year: 1836,
    genre: 'poezija',
    language: SL,
    copies: 1,
  },
  {
    title: 'Bratovščina Sinjega galeba',
    authors: [['Tone', 'Seliškar']],
    year: 1936,
    genre: 'mladinska',
    language: SL,
    copies: 2,
  },
  {
    title: 'Čefurji raus!',
    authors: [['Goran', 'Vojnović']],
    year: 2008,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Petelinji zajtrk',
    authors: [['Feri', 'Lainšček']],
    year: 1999,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Kaplan Martin Čedermac',
    authors: [['France', 'Bevk']],
    year: 1938,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Butalci',
    authors: [['Fran', 'Milčinski']],
    year: 1949,
    genre: 'kratka proza',
    language: SL,
    copies: 2,
  },
  {
    title: 'Jara gospoda',
    authors: [['Janko', 'Kersnik']],
    year: 1893,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Pohujšanje v dolini šentflorjanski',
    authors: [['Ivan', 'Cankar']],
    year: 1908,
    genre: 'drama',
    language: SL,
    copies: 1,
  },
  {
    title: 'Kralj na Betajnovi',
    authors: [['Ivan', 'Cankar']],
    year: 1902,
    genre: 'drama',
    language: SL,
    copies: 1,
  },
  {
    title: 'Muca Copatarica',
    authors: [['Ela', 'Peroci']],
    year: 1957,
    genre: 'mladinska',
    language: SL,
    copies: 2,
  },
  {
    title: 'Jurij Kozjak, slovenski janičar',
    authors: [['Josip', 'Jurčič']],
    year: 1864,
    genre: 'zgodovinski roman',
    language: SL,
    copies: 1,
  },
  {
    title: '1984',
    authors: [['George', 'Orwell']],
    year: 1949,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 2,
    description:
      'Totalitarna država nadzoruje vsak korak in vsako misel svojih državljanov.',
  },
  {
    title: 'Animal Farm',
    authors: [['George', 'Orwell']],
    year: 1945,
    genre: 'roman',
    language: EN,
    copies: 3,
  },
  {
    title: 'Homage to Catalonia',
    authors: [['George', 'Orwell']],
    year: 1938,
    genre: 'biografija',
    language: EN,
    copies: 2,
  },
  {
    title: 'Down and Out in Paris and London',
    authors: [['George', 'Orwell']],
    year: 1933,
    genre: 'biografija',
    language: EN,
    copies: 1,
  },
  {
    title: 'Dune',
    authors: [['Frank', 'Herbert']],
    year: 1965,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 2,
    description:
      'Boj za puščavski planet Arrakis, edini vir najdragocenejše snovi v vesolju.',
  },
  {
    title: 'The Hobbit',
    authors: [['J. R. R.', 'Tolkien']],
    year: 1937,
    genre: 'fantastika',
    language: EN,
    copies: 2,
  },
  {
    title: 'The Lord of the Rings',
    authors: [['J. R. R.', 'Tolkien']],
    year: 1954,
    genre: 'fantastika',
    language: EN,
    copies: 2,
  },
  {
    title: 'Mali princ',
    authors: [['Antoine', 'de Saint-Exupéry']],
    year: 1943,
    genre: 'mladinska',
    language: SL,
    copies: 3,
  },
  {
    title: 'Brave New World',
    authors: [['Aldous', 'Huxley']],
    year: 1932,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 1,
  },
  {
    title: 'Fahrenheit 451',
    authors: [['Ray', 'Bradbury']],
    year: 1953,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 2,
  },
  {
    title: 'To Kill a Mockingbird',
    authors: [['Harper', 'Lee']],
    year: 1960,
    genre: 'roman',
    language: EN,
    copies: 2,
  },
  {
    title: 'Pride and Prejudice',
    authors: [['Jane', 'Austen']],
    year: 1813,
    genre: 'roman',
    language: EN,
    copies: 2,
  },
  {
    title: 'Zločin in kazen',
    authors: [['Fjodor Mihajlovič', 'Dostojevski']],
    year: 1866,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'The Great Gatsby',
    authors: [['F. Scott', 'Fitzgerald']],
    year: 1925,
    genre: 'roman',
    language: EN,
    copies: 1,
  },
  {
    title: 'Sto let samote',
    authors: [['Gabriel', 'García Márquez']],
    year: 1967,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Ime rože',
    authors: [['Umberto', 'Eco']],
    year: 1980,
    genre: 'zgodovinski roman',
    language: SL,
    copies: 1,
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    authors: [['J. K.', 'Rowling']],
    year: 1997,
    genre: 'fantastika',
    language: EN,
    copies: 3,
  },
  {
    title: 'The Catcher in the Rye',
    authors: [['J. D.', 'Salinger']],
    year: 1951,
    genre: 'roman',
    language: EN,
    copies: 1,
  },
  {
    title: 'Murder on the Orient Express',
    authors: [['Agatha', 'Christie']],
    year: 1934,
    genre: 'kriminalka',
    language: EN,
    copies: 2,
  },
  {
    title: 'The Hound of the Baskervilles',
    authors: [['Arthur Conan', 'Doyle']],
    year: 1902,
    genre: 'kriminalka',
    language: EN,
    copies: 1,
  },
  {
    title: 'Foundation',
    authors: [['Isaac', 'Asimov']],
    year: 1951,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 1,
  },
  {
    title: 'Neuromancer',
    authors: [['William', 'Gibson']],
    year: 1984,
    genre: 'znanstvena fantastika',
    language: EN,
    copies: 1,
  },
  {
    title: 'A Brief History of Time',
    authors: [['Stephen', 'Hawking']],
    year: 1988,
    genre: 'poljudna znanost',
    language: EN,
    copies: 1,
  },
  {
    title: 'Sapiens',
    authors: [['Yuval Noah', 'Harari']],
    year: 2011,
    genre: 'poljudna znanost',
    language: EN,
    copies: 2,
  },
  {
    title: 'Dnevnik Ane Frank',
    authors: [['Anne', 'Frank']],
    year: 1947,
    genre: 'biografija',
    language: SL,
    copies: 1,
  },
  {
    title: 'Good Omens',
    authors: [
      ['Terry', 'Pratchett'],
      ['Neil', 'Gaiman'],
    ],
    year: 1990,
    genre: 'fantastika',
    language: EN,
    copies: 1,
  },
  {
    title: 'The Talisman',
    authors: [
      ['Stephen', 'King'],
      ['Peter', 'Straub'],
    ],
    year: 1984,
    genre: 'fantastika',
    language: EN,
    copies: 1,
  },
  {
    title: 'Steve Jobs',
    authors: [['Walter', 'Isaacson']],
    year: 2011,
    genre: 'biografija',
    language: EN,
    copies: 1,
  },
  {
    title: 'The Old Man and the Sea',
    authors: [['Ernest', 'Hemingway']],
    year: 1952,
    genre: 'roman',
    language: EN,
    copies: 2,
  },
  {
    title: 'Proces',
    authors: [['Franz', 'Kafka']],
    year: 1925,
    genre: 'roman',
    language: SL,
    copies: 1,
  },
  {
    title: 'Moby-Dick',
    authors: [['Herman', 'Melville']],
    year: 1851,
    genre: 'roman',
    language: EN,
    copies: 1,
  },
];

export interface SeedLoan {
  reader: ReaderKey;
  title: string;
  copy: number;
  loanedDaysAgo: number;
  returnedDaysAgo?: number;
}

// rok je izposoja + loan_period_days (21): Alamut je zamujen 5 dni, Dune ima rok čez 2 dni
export const LOANS: SeedLoan[] = [
  { reader: 'janez', title: 'Alamut', copy: 0, loanedDaysAgo: 26 },
  { reader: 'maja', title: 'Alamut', copy: 1, loanedDaysAgo: 26 },
  { reader: 'maja', title: 'Dune', copy: 0, loanedDaysAgo: 19 },
  { reader: 'maja', title: 'Na klancu', copy: 0, loanedDaysAgo: 7 },
  { reader: 'nina', title: '1984', copy: 0, loanedDaysAgo: 12 },
  { reader: 'nina', title: 'Animal Farm', copy: 0, loanedDaysAgo: 12 },
  {
    reader: 'nina',
    title: 'Down and Out in Paris and London',
    copy: 0,
    loanedDaysAgo: 12,
  },
  { reader: 'nina', title: 'Mali princ', copy: 0, loanedDaysAgo: 4 },
  { reader: 'nina', title: 'The Hobbit', copy: 0, loanedDaysAgo: 4 },
  { reader: 'tomaz', title: '1984', copy: 1, loanedDaysAgo: 9 },
  { reader: 'tomaz', title: 'Animal Farm', copy: 1, loanedDaysAgo: 9 },
  {
    reader: 'petra',
    title: 'Pride and Prejudice',
    copy: 0,
    loanedDaysAgo: 110,
    returnedDaysAgo: 27,
  },
];

export interface SeedReservation {
  reader: ReaderKey;
  title: string;
  createdDaysAgo: number;
  readyDaysAgo?: number;
}

export const RESERVATIONS: SeedReservation[] = [
  { reader: 'luka', title: 'Alamut', createdDaysAgo: 10 },
  { reader: 'janez', title: '1984', createdDaysAgo: 20 },
  { reader: 'luka', title: '1984', createdDaysAgo: 15 },
  { reader: 'maja', title: '1984', createdDaysAgo: 0 },
  {
    reader: 'maja',
    title: 'Visoška kronika',
    createdDaysAgo: 14,
    readyDaysAgo: 1,
  },
];
