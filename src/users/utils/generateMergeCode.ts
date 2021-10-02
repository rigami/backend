import { sample } from 'lodash';

const alphabet = 'QWERTYUPASDFGHJKLZXCVBNM23456789';

function generateMergeCode(length = 4): string {
    return Array.from({ length })
        .map(() => sample(alphabet))
        .join('');
}

export default generateMergeCode;
