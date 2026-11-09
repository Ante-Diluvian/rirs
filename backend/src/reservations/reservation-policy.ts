import { Injectable } from '@nestjs/common';
import { Messages } from '../common/messages';
import { ReservationStatus } from '../generated/prisma/client';
import { Settings } from '../settings/settings.service';

export const ACTIVE_RESERVATION = [
  ReservationStatus.WAITING,
  ReservationStatus.READY,
];

export interface ReservationContext {
  isBlocked: boolean;
  availableCopies: number;
  activeReservations: number;
  hasSameTitleReservation: boolean;
  hasSameTitleLoan: boolean;
}

// pravila rezervacije brez HTTP in baze; vrne razlog prvega neizpolnjenega
@Injectable()
export class ReservationPolicy {
  violation(
    context: ReservationContext,
    { maxActiveReservations }: Pick<Settings, 'maxActiveReservations'>,
  ): string | null {
    if (context.isBlocked) return Messages.members.blocked;
    if (context.availableCopies > 0) {
      return Messages.reservations.copyAvailable;
    }
    if (context.activeReservations >= maxActiveReservations) {
      return Messages.reservations.maxReservations(maxActiveReservations);
    }
    if (context.hasSameTitleReservation) return Messages.reservations.duplicate;
    if (context.hasSameTitleLoan) return Messages.reservations.alreadyLoaned;
    return null;
  }
}
