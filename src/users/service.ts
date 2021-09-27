import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { User as UserScheme } from './schemas/user';
import { ReturnModelType } from '@typegoose/typegoose';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(UserScheme)
        private readonly userModel: ReturnModelType<typeof UserScheme>,
    ) {
        userModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop users! Because set development mode');
        });
    }

    async findOne(username: string): Promise<User | undefined> {
        const user = await this.userModel.findOne({
            username,
        });

        if (!user) return undefined;

        return {
            id: user.id,
            username: user.username,
            password: user.password,
        };
    }

    async createUser(username: string, password: string): Promise<User | undefined> {
        this.logger.log(`Creating user '${username}'...`);

        const user = await this.userModel.create({
            username,
            password,
        });

        return {
            id: user.id,
            username: user.username,
            password: user.password,
        };
    }
}
