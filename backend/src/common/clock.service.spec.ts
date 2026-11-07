import { ClockService } from './clock.service';

describe('ClockService', () => {
  afterEach(() => jest.useRealTimers());

  it('today vrne koledarski datum v Ljubljani, ne v UTC', () => {
    jest.useFakeTimers({ now: new Date('2026-10-12T22:30:00Z') });
    expect(new ClockService().today()).toBe('2026-10-13');
  });

  it('today ob polnoči po prehodu na zimski čas', () => {
    // 25. 10. 2026 ob 23.30 UTC je v Ljubljani (UTC+1) 0.30 naslednjega dne
    jest.useFakeTimers({ now: new Date('2026-10-25T23:30:00Z') });
    expect(new ClockService().today()).toBe('2026-10-26');
  });
});
