import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Messages } from '../../common/messages';
import { normalizeEmail, trim } from '../../common/transforms';

export class RegisterDto {
  @ApiProperty({ example: 'Maja' })
  @Transform(trim)
  @IsString({ message: Messages.auth.firstNameRequired })
  @IsNotEmpty({ message: Messages.auth.firstNameRequired })
  @MaxLength(100, { message: Messages.auth.nameTooLong })
  firstName: string;

  @ApiProperty({ example: 'Kovač' })
  @Transform(trim)
  @IsString({ message: Messages.auth.lastNameRequired })
  @IsNotEmpty({ message: Messages.auth.lastNameRequired })
  @MaxLength(100, { message: Messages.auth.nameTooLong })
  lastName: string;

  @ApiProperty({ example: 'maja.kovac@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: Messages.auth.emailInvalid })
  @MaxLength(255, { message: Messages.auth.emailInvalid })
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'geslo1234' })
  @IsString({ message: Messages.auth.passwordTooShort })
  @MinLength(8, { message: Messages.auth.passwordTooShort })
  // bcrypt upošteva samo prvih 72 bajtov (ADR-0015)
  @IsByteLength(0, 72, { message: Messages.auth.passwordTooLong })
  password: string;
}
