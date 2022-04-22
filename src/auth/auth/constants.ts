if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET_KEY) {
    throw new Error('Not set env variable JWT_SECRET_KEY');
}

export const jwtConstants = {
    secret: process.env.JWT_SECRET_KEY || 'secretKey',
};
