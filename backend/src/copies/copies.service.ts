import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import { CopyStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CopyDto } from './dto/copy.dto';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';

const LOCKED_STATUSES: CopyStatus[] = [CopyStatus.ON_LOAN, CopyStatus.RESERVED];

// izposoja in vračilo zaklepata isto vrstico, zato se ne prekrivata
async function lockCopy(tx: Prisma.TransactionClient, id: string) {
  const [copy] = await tx.$queryRaw<{ status: CopyStatus }[]>`
    SELECT status FROM copy WHERE id = ${id}::uuid FOR UPDATE`;
  if (!copy) throw new NotFoundException(Messages.copies.notFound);
  return copy;
}

@Injectable()
export class CopiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBook(bookId: string): Promise<CopyDto[]> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { copies: { orderBy: { inventoryNumber: 'asc' } } },
    });
    if (!book) throw new NotFoundException(Messages.books.notFound);
    return book.copies.map((copy) => CopyDto.from(copy));
  }

  // US-07 AC2: nov izvod je vedno prost
  async create(bookId: string, dto: CreateCopyDto): Promise<CopyDto> {
    try {
      const copy = await this.prisma.copy.create({
        data: {
          bookId,
          inventoryNumber: dto.inventoryNumber,
          shelf: dto.shelf ?? null,
          status: CopyStatus.AVAILABLE,
        },
      });
      return CopyDto.from(copy);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(Messages.copies.inventoryTaken);
      }
      if (isPrismaError(error, 'P2003')) {
        throw new NotFoundException(Messages.books.notFound);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCopyDto): Promise<CopyDto> {
    return this.prisma.$transaction(async (tx) => {
      const copy = await lockCopy(tx, id);
      const changesStatus = dto.status && dto.status !== copy.status;
      if (changesStatus && LOCKED_STATUSES.includes(copy.status)) {
        throw new ConflictException(Messages.copies.statusLocked);
      }

      const updated = await tx.copy.update({
        where: { id },
        data: { shelf: dto.shelf, status: dto.status },
      });
      return CopyDto.from(updated);
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const copy = await lockCopy(tx, id);
      // US-07 AC3: tudi vrnjena izposoja je zgodovina
      if (await tx.loan.count({ where: { copyId: id } })) {
        throw new ConflictException(Messages.copies.hasLoans);
      }
      // rezervacija READY bi ostala brez izvoda
      if (copy.status === CopyStatus.RESERVED) {
        throw new ConflictException(Messages.copies.reserved);
      }
      await tx.copy.delete({ where: { id } });
    });
  }
}
