import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(errors: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class NotFoundException extends HttpException {
  constructor(resource: string, id: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `${resource} with id ${id} not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class AuthenticationException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication failed',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AuthorizationException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Permission denied',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ConflictException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}
