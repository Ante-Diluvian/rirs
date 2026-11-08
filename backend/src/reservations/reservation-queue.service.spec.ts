import { toDbDate } from '../common/dates';
import { Prisma } from '../generated/prisma/client';
import { SettingsService } from '../settings/settings.service';
import { ReservationQueueService } from './reservation-queue.service';

const COPY_ID = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const BOOK_ID = '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

function setup(waiting: { id: string; member_id: string }[]) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(waiting),
    copy: { update: jest.fn() },
    reservation: { update: jest.fn() },
  };
  const settings = {
    get: jest.fn().mockResolvedValue({ pickupDays: 3 }),
  } as unknown as SettingsService;
  const clock = { today: () => '2026-10-12' };
  const service = new ReservationQueueService(settings, clock);
  const assign = () =>
    service.assignNextOrRelease(
      tx as unknown as Prisma.TransactionClient,
      COPY_ID,
      BOOK_ID,
    );
  return { tx, assign };
}

describe('ReservationQueueService', () => {
  it('brez čakajočih rezervacij je izvod prost', async () => {
    const { tx, assign } = setup([]);

    await expect(assign()).resolves.toBeNull();
    expect(tx.copy.update).toHaveBeenCalledWith({
      where: { id: COPY_ID },
      data: { status: 'AVAILABLE' },
    });
    expect(tx.reservation.update).not.toHaveBeenCalled();
  });

  it('najstarejša čakajoča rezervacija dobi izvod in rok prevzema danes + pickup_days', async () => {
    const { tx, assign } = setup([{ id: 'r1', member_id: 'm1' }]);

    await expect(assign()).resolves.toEqual({
      reservationId: 'r1',
      memberId: 'm1',
      readyUntil: '2026-10-15',
    });
    expect(tx.reservation.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        status: 'READY',
        copyId: COPY_ID,
        readyUntil: toDbDate('2026-10-15'),
      },
    });
    expect(tx.copy.update).toHaveBeenCalledWith({
      where: { id: COPY_ID },
      data: { status: 'RESERVED' },
    });
  });

  it('čakajočo rezervacijo izbere z zaklepanjem SKIP LOCKED po vrstnem redu prijave', async () => {
    const { tx, assign } = setup([]);

    await assign();

    const [[strings]] = tx.$queryRaw.mock.calls as [string[]][];
    const sql = strings.join('?');
    expect(sql).toMatch(/ORDER BY created_at, id/);
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/);
  });
});
