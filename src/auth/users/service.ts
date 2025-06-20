import { Injectable, Logger } from '@nestjs/common';
import { ROLE, User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { UserSchema } from './schemas/user';
import { ReturnModelType } from '@typegoose/typegoose';
import { DevicesService } from '@/auth/devices/service';
import { v4 as UUIDv4 } from 'uuid';
import { STATUS } from '@/auth/utils/status.enum';
import hashPassword from '@/auth/utils/hashPassword';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(UserSchema)
        private readonly userModel: ReturnModelType<typeof UserSchema>,
        private devicesService: DevicesService,
    ) {}

    async findById(userId: string, { includeHashedPassword = false } = {}): Promise<User | null> {
        const user = await this.userModel.findOne({ id: userId });

        if (!user) return null;

        if (includeHashedPassword) {
            return {
                id: user.id,
                username: user.username,
                password: user.password,
                role: user.role,
                status: user.status,
                statusChangeDate: user.statusChangeDate,
                createDate: user.createDate,
            };
        } else {
            return {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                statusChangeDate: user.statusChangeDate,
                createDate: user.createDate,
            };
        }
    }

    async findByUsername(username: string, { includeHashedPassword = false } = {}): Promise<User | null> {
        const user = await this.userModel.findOne({
            username,
        });

        if (!user) return null;

        if (includeHashedPassword) {
            return {
                id: user.id,
                username: user.username,
                password: user.password,
                role: user.role,
                status: user.status,
                statusChangeDate: user.statusChangeDate,
                createDate: user.createDate,
            };
        } else {
            return {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                statusChangeDate: user.statusChangeDate,
                createDate: user.createDate,
            };
        }
    }

    async deleteById(userId: string): Promise<void> {
        const user = await this.userModel.updateOne(
            { id: userId },
            { $set: { status: STATUS.deleted, statusChangeDate: new Date() } },
        );

        if (!user) return null;

        await this.devicesService.deleteAllByUserId(userId);
    }

    async createVirtual(): Promise<User | null> {
        this.logger.log(`Creating virtual user...`);

        return this.create(UUIDv4(), UUIDv4(), ROLE.virtual_user);
    }

    async updatePassword(username: string, password: string) {
        this.logger.log(`Update password for user '${username}'...`);

        try {
            const hashedPassword = await hashPassword.hash(password);
            await this.userModel.updateOne(
                {
                    username,
                },
                {
                    $set: {
                        password: hashedPassword,
                    },
                },
            );
        } catch (err) {
            throw new Error('UNKNOWN_ERROR');
        }
    }

    async create(username: string, password: string, role: ROLE = ROLE.virtual_user): Promise<User | null> {
        this.logger.log(`Creating user '${username}'...`);

        try {
            const hashedPassword = await hashPassword.hash(password);
            const user = await this.userModel.create({
                username,
                password: hashedPassword,
                role,
            });

            return {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                statusChangeDate: user.statusChangeDate,
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
