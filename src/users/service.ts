import { Injectable } from '@nestjs/common';
import { User } from './entities/user';

@Injectable()
export class UsersService {
    private readonly users = [
        {
            id: 1,
            email: 'admin@rigami.io',
            password: 'pass',
        },
        {
            id: 2,
            email: 'hello@danilkinkin.com',
            password: 'danil',
        },
    ];

    async findOne(email: string): Promise<User | undefined> {
        return this.users.find((user) => user.email === email);
    }
}
