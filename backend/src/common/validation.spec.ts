import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { createValidationPipe } from './validation';

class AddressDto {
  @IsString({ message: 'Ulica je obvezna' })
  street: string;
}

class SampleDto {
  @IsEmail({}, { message: 'Vnesi veljaven e-poštni naslov' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Geslo mora imeti vsaj 8 znakov' })
  password: string;

  @IsInt()
  age: number;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

async function validate(value: unknown): Promise<unknown> {
  return createValidationPipe().transform(value, {
    type: 'body',
    metatype: SampleDto,
  });
}

async function responseOf(value: unknown): Promise<unknown> {
  try {
    await validate(value);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse();
  }
  throw new Error('Pričakovana napaka validacije');
}

describe('createValidationPipe', () => {
  const valid = {
    email: 'maja@example.com',
    password: 'geslo1234',
    age: 30,
    address: { street: 'Glavni trg 1' },
  };

  it('vrne napake po poljih s slovenskimi sporočili', async () => {
    const response = await responseOf({
      ...valid,
      email: 'ni-email',
      password: 'kratko',
    });

    expect(response).toEqual({
      statusCode: 400,
      message: 'Neveljavni podatki',
      errors: {
        email: 'Vnesi veljaven e-poštni naslov',
        password: 'Geslo mora imeti vsaj 8 znakov',
      },
    });
  });

  it('gnezdena polja poimenuje s piko', async () => {
    const response = await responseOf({ ...valid, address: {} });

    expect(response).toMatchObject({
      errors: { 'address.street': 'Ulica je obvezna' },
    });
  });

  it('zavrne polja, ki jih DTO ne pozna', async () => {
    const response = await responseOf({ ...valid, role: 'ADMIN' });

    expect(response).toMatchObject({
      errors: { role: expect.any(String) as string },
    });
  });

  it('veljavne podatke pretvori v razred DTO', async () => {
    const result = await validate(valid);

    expect(result).toBeInstanceOf(SampleDto);
    expect((result as SampleDto).address).toBeInstanceOf(AddressDto);
  });
});
