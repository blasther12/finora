import { BadRequestException, Catch } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { DomainError } from "../../domain/errors/domain.error";

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const error = new BadRequestException(exception.message).getResponse();
    response.status(400).json(error);
  }
}
