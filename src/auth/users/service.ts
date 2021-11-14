import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { UserSchema } from './schemas/user';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { DevicesService } from '@/auth/devices/service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(UserSchema)
        private readonly userModel: ReturnModelType<typeof UserSchema>,
        private devicesService: DevicesService,
    ) {}

    async findOneById(userId: string): Promise<User | null> {
        const user = await this.userModel.findOne({ id: userId });

        if (!user) return null;

        return {
            id: user.id,
            username: user.username,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async findOne(username: string): Promise<User | null> {
        const user = await this.userModel.findOne({
            username,
        });

        if (!user) return null;

        return {
            id: user.id,
            username: user.username,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async findByIdAndDelete(userId: string): Promise<User | null> {
        const user = await this.userModel.findOneAndDelete({ id: userId });

        if (!user) return null;

        await this.devicesService.deleteAllByUserId(userId);

        return {
            id: user.id,
            username: user.username,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async createVirtualUser(): Promise<User | null> {
        this.logger.log(`Creating virtual user...`);

        const user = await this.userModel.create({
            username: UUIDv4(),
            password: '',
            isVirtual: true,
        });

        return {
            id: user.id,
            username: user.username,
            password: user.password,
            isVirtual: true,
            createDate: user.createDate,
        };
    }

    async createUser(username: string, password: string): Promise<User | null> {
        this.logger.log(`Creating user '${username}'...`);

        try {
            const user = await this.userModel.create({
                username,
                password,
                isVirtual: false,
            });

            return {
                id: user.id,
                username: user.username,
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
