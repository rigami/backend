import { Res as ResDefault } from '@nestjs/common';

export const Response = () => ResDefault({ passthrough: true });

export const Res = Response;
