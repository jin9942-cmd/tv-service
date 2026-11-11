// The Poker Hall of Fame, as WSOP.com lists it (https://www.wsop.com/hall-of-fame/, read 2026-11-10): inductees by
// year, newest first, with the country the page labels them with. v8 is set in 2026, so it lists the classes up to
// 2025 (the 2026 class's announcement date isn't confirmed).
// Photos: each inductee's WSOP.com profile photo (cleared for this demo 2026-11-10), public/hof/<slug>.jpg.
import { LEGENDS } from './archive';
import { photoOf } from './photos';

export interface Inductee {
  name: string;
  year: number;
  country: string;
  cc: string;
  /** Their page in Browse > Players, when they have one (a bracelet legend). */
  to?: string;
  /** Their WSOP.com profile photo. */
  photo: string;
}

const US = ['United States', 'US'] as const;
const I = (year: number, name: string, [country, cc]: readonly [string, string] = US): Inductee => ({
  year,
  name,
  country,
  cc,
  photo: photoOf(name) ?? '',
});

const LIST: Inductee[] = [
  I(2025, 'Michael Mizrachi'),
  I(2025, 'Nicholas Schulman'),
  I(2024, 'Patrik Antonius', ['Finland', 'FI']),
  I(2023, 'Brian Rast'),
  I(2022, 'Layne Flack'),
  I(2021, 'Eli Elezra'),
  I(2020, 'Huck Seed'),
  I(2019, 'Chris Moneymaker'),
  I(2019, 'David Oppenheim'),
  I(2018, 'John Hennigan'),
  I(2018, 'Mori Eskandani'),
  I(2017, 'David Ulliott', ['United Kingdom', 'GB']),
  I(2017, 'Phil Ivey'),
  I(2016, 'Carlos Mortensen', ['Spain', 'ES']),
  I(2016, 'Todd Brunson'),
  I(2015, 'Jen Harman'),
  I(2015, 'John Juanda'),
  I(2014, 'Daniel Negreanu', ['Canada', 'CA']),
  I(2014, 'Jack McClelland'),
  I(2013, 'Scotty Nguyen'),
  I(2013, 'Tom McEvoy'),
  I(2012, 'Brian “Sailor” Roberts'),
  I(2012, 'Eric Drache'),
  I(2011, 'Barry Greenstein'),
  I(2011, 'Linda Johnson'),
  I(2010, 'Dan Harrington'),
  I(2010, 'Erik Seidel'),
  I(2009, 'Mike Sexton'),
  I(2008, 'Duane “Dewey” Tomko'),
  I(2008, 'Henry Orenstein', ['Poland', 'PL']),
  I(2007, 'Barbara Enright'),
  I(2007, 'Phil Hellmuth'),
  I(2006, 'Billy Baxter'),
  I(2006, 'TJ Cloutier'),
  I(2005, 'Crandall Addington'),
  I(2005, 'Jack Binion'),
  I(2004, 'Berry Johnston'),
  I(2003, 'Bobby Baldwin'),
  I(2002, 'Johnny Chan'),
  I(2002, 'Lyle Berman'),
  I(2001, 'Stu “The Kid” Ungar'),
  I(1997, 'Roger Moore'),
  I(1996, 'Julius Oral “Little Man” Popwell'),
  I(1993, 'Jack Keller'),
  I(1992, 'Thomas Austin “Amarillo Slim” Preston'),
  I(1991, 'David “Chip” Reese'),
  I(1990, 'Benny Binion'),
  I(1989, 'Fred “Sarge” Ferris'),
  I(1988, 'Doyle Brunson'),
  I(1988, 'Jack “Treetop” Straus'),
  I(1987, 'Walter Clyde “Puggy” Pearson'),
  I(1986, 'Henry Green'),
  I(1985, 'Red Hodges'),
  I(1984, 'Murph Harrold'),
  I(1983, 'Joe Bernstein'),
  I(1982, 'Tom Abdo'),
  I(1981, 'Bill Boyd'),
  I(1980, 'T “Blondie” Forbes'),
  I(1979, 'Johnny Moss'),
  I(1979, 'Nick “The Greek” Dandolos'),
  I(1979, 'James Butler “Wild Bill” Hickok'),
  I(1979, 'Edmond Hoyle'),
  I(1979, 'Felton “Corky” McCorquodale'),
  I(1979, 'Red Winn'),
  I(1979, 'Sid Wyman'),
];

/** A Hall of Famer's WSOP.com photo by name (with or without the nickname), for the legends' cards and pages. */
export const hofPhoto = (name: string) => LIST.find((x) => x.name === name || x.name.replace(/ “[^”]+”/, '') === name)?.photo;

/** Every inductee, newest class first; a bracelet legend links to their page in Browse. */
export const HALL_OF_FAME: Inductee[] = LIST.map((x) => {
  const plain = x.name.replace(/ “[^”]+”/, '');
  const l = LEGENDS.find((y) => y.name === plain || y.name === x.name);
  return l ? { ...x, to: `/videos/players/${l.playerId ?? l.id}` } : x;
});
