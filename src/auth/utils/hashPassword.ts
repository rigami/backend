import * as bcrypt from 'bcrypt';

const hash = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

const isSame = async (password: string, passwordHash: string): Promise<boolean> => {
    return await bcrypt.compare(password, passwordHash);
};

const hashPassword = { hash, isSame };

export { hash, isSame };
export default hashPassword;
