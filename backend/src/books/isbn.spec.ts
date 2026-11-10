import { toIsbn13 } from './isbn';

describe('US-02 AC1: ISBN iz iskalnega niza', () => {
  it('sprejme 13 števk z vezaji ali presledki', () => {
    expect(toIsbn13('978-0-306-40615-7')).toBe('9780306406157');
    expect(toIsbn13(' 978 0306 406157 ')).toBe('9780306406157');
  });

  it('veljaven ISBN-10 pretvori v ISBN-13', () => {
    expect(toIsbn13('0-306-40615-2')).toBe('9780306406157');
    expect(toIsbn13('0-8044-2957-x')).toBe('9780804429573');
  });

  it('ISBN-10 z napačno kontrolno števko ni ISBN', () => {
    expect(toIsbn13('0-306-40615-3')).toBeNull();
  });

  it('del ISBN ali besedilo ni ISBN', () => {
    expect(toIsbn13('978-0-306')).toBeNull();
    expect(toIsbn13('97803064061571')).toBeNull();
    expect(toIsbn13('X306406152')).toBeNull();
    expect(toIsbn13('orwell')).toBeNull();
  });
});
