import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Messages } from './messages';

export type FieldErrors = Record<string, string>;

// prvo sporočilo za vsako polje, gnezdena polja s piko (address.street)
export function toFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldErrors {
  const result: FieldErrors = {};
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length > 0) {
      result[path] = messages[0];
    }
    if (error.children?.length) {
      Object.assign(result, toFieldErrors(error.children, path));
    }
  }
  return result;
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message: Messages.validation.invalidInput,
    errors: toFieldErrors(errors),
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });
}
