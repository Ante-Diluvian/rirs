import { TransformFnParams } from 'class-transformer';

export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

// prazno neobvezno polje se shrani kot null
export function trimToNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// ISBN se shrani brez vezajev in presledkov
export function normalizeIsbn({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : value;
}

// parametri v URL so nizi, neveljavno vrednost zavrne validacija
export function toBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export function toNumber({ value }: TransformFnParams): unknown {
  return typeof value === 'string' && value.trim() !== ''
    ? Number(value)
    : value;
}
