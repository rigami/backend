import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtUserAuthGuard extends AuthGuard('jwt-user') {}

@Injectable()
export class JwtApiAuthGuard extends AuthGuard('jwt-api') {}

@Injectable()
export class JwtDeviceAuthGuard extends AuthGuard('jwt-device') {}
