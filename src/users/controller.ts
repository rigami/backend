import { Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './service';
import { JwtAuthGuard } from '@/auth/strategies/jwt/auth.guard';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Post('bind')
    async login() {
        this.logger.log('Bind users...');
    }
}
