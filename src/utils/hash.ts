import crypto from 'crypto';

function hash(value): string {
    return crypto.createHash('md5').update(value).digest('hex');
}

export default hash;
