import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { UserSchema } from './schemas/user';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(UserSchema)
        private readonly userModel: ReturnModelType<typeof UserSchema>,
    ) {
        userModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop users! Because set development mode');
        });
    }

    async findOneById(userId: string): Promise<User | null> {
        const user = await this.userModel.findById(userId);

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async findOne(email: string): Promise<User | null> {
        const user = await this.userModel.findOne({
            email,
        });

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async findByIdAndDelete(userId: string): Promise<User | null> {
        const user = await this.userModel.findByIdAndDelete(userId);

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async createVirtualUser(): Promise<User | null> {
        this.logger.log(`Creating virtual user...`);

        const user = await this.userModel.create({
            email: UUIDv4(),
            password: '',
            isVirtual: true,
        });

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: true,
            createDate: user.createDate,
        };
    }

    async createUser(email: string, password: string): Promise<User | null> {
        this.logger.log(`Creating user '${email}'...`);

        try {
            const user = await this.userModel.create({
                email,
                password,
                isVirtual: false,
            });

            return {
                id: user.id,
                email: user.email,
                password: user.password,
                isVirtual: false,
                createDate: user.createDate,
            };
        } catch (err) {
            if (err.name === 'MongoServerError' && err.code === 11000) {
                throw new Error('USER_ALREADY_EXIST');
            }
        }

        throw new Error('UNKNOWN_ERROR');
    }
}
