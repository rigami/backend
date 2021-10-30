import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AppHeaders } from '@/auth/auth/entities/headers';

export interface IError {
    statusCode: number;
    messages: string[];
    error: string;
}

export const ValidationRequestHeaders = async (value: any, ctx: ExecutionContext) => {
    // extract headers
    const headers = ctx.switchToHttp().getRequest().headers;

    // Convert headers to DTO object
    const dto = plainToClass(value || AppHeaders, headers);

    // Validate
    const errors: ValidationError[] = await validate(dto);

    if (errors.length > 0) {
        const ErrorInfo: IError = {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            messages: new Array<string>(),
        };

        errors.map((obj) => {
            const AllErrors = Object.values(obj.constraints);
            AllErrors.forEach((OneError) => {
                ErrorInfo.messages.push(OneError);
            });

            // Your example, but wanted to return closer to how the body looks, for common error parsing
            // Get the errors and push to custom array
            // let validationErrors = errors.map(obj => Object.values(obj.constraints));
            throw new HttpException(ErrorInfo, HttpStatus.BAD_REQUEST);
        });
    }

    return dto;
};

export const RequestHeaders = createParamDecorator(ValidationRequestHeaders);
