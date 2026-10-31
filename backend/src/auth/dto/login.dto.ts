import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { Messages } from '../../common/messages';
import { normalizeEmail } from '../../common/transforms';

export class LoginDto {
  @ApiProperty({ example: 'maja.kovac@example.com' })
  @Transform(normalizeEmail)
  @IsString({ message: Messages.auth.emailInvalid })
  @IsNotEmpty({ message: Messages.auth.emailInvalid })
  email: string;

  @ApiProperty({ example: 'geslo1234' })
  @IsString({ message: Messages.auth.passwordRequired })
  @IsNotEmpty({ message: Messages.auth.passwordRequired })
  password: string;
}
