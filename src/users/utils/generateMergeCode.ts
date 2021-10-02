import { sample } from 'lodash';

const alphabet = '1234567890QWERTYUIOPASDFGHJKLZXCVBNM';

function generateMergeCode(length = 4): string {
    return Array.from({ length })
        .map(() => sample(alphabet))
        .join('');
}

export default generateMergeCode;
