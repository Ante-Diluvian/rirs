import { plural } from './plural';

describe('plural', () => {
  const loans = (n: number) =>
    `${n} ${plural(n, ['izposoja', 'izposoji', 'izposoje', 'izposoj'])}`;

  it('izbere slovensko obliko za ednino, dvojino in množino', () => {
    expect(loans(1)).toBe('1 izposoja');
    expect(loans(2)).toBe('2 izposoji');
    expect(loans(3)).toBe('3 izposoje');
    expect(loans(4)).toBe('4 izposoje');
    expect(loans(5)).toBe('5 izposoj');
    expect(loans(0)).toBe('0 izposoj');
    expect(loans(11)).toBe('11 izposoj');
    expect(loans(101)).toBe('101 izposoja');
    expect(loans(102)).toBe('102 izposoji');
    expect(loans(104)).toBe('104 izposoje');
  });
});
