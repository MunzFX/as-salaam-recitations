import {expect,test} from 'bun:test';
import {matches, type Surah} from '../src/lib/archive';
import seed from '../src/lib/surah-seed.json';

test('Surah library includes every chapter once and accurate total ayahs',()=>{
  expect(seed.length).toBe(114);
  expect(new Set(seed.map(s=>s.id)).size).toBe(114);
  expect(seed.reduce((n,s)=>n+s.ayah_count,0)).toBe(6236);
  expect(seed[0].number).toBe(1);
  expect(seed[113].number).toBe(114);
});
test('Search accepts Arabic, spelling variations and padded chapter numbers',()=>{
  const opening=seed[0] as Surah;
  expect(matches(opening,'001')).toBe(true);
  expect(matches(opening,'الفاتحة')).toBe(true);
  expect(matches(opening,'al-fatihah')).toBe(true);
  expect(matches(seed[17] as Surah,'الكهف')).toBe(true);
  expect(matches(seed[113] as Surah,'114')).toBe(true);
  expect(matches(opening,'nothing matches')).toBe(false);
});
