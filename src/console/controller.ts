import { Body, Controller, Logger, Post } from '@nestjs/common';
import { UsersService } from '@/auth/users/service';
import { ROLE } from '@/auth/users/entities/user';

@Controller('v1/console')
export class ConsoleController {
    private readonly logger = new Logger(ConsoleController.name);

    constructor(private usersService: UsersService) {}

    @Post('login')
    async search(@Body() credentials) {
        console.log('credentials:', credentials);

        const user = await this.usersService.findByUsername(credentials.username);

        /* if (user && user.password === credentials.password && user.role === ROLE.moderator) {
        } else {
        } */
    }
}
