import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    modulePaths: ['src'],
    roots: ['<rootDir>/src/'],
    moduleDirectories: ['node_modules'],
    modulePathIgnorePatterns: ['dist'],
    moduleNameMapper: {
        '^@/(.*)': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(ts)$': 'ts-jest',
    },
};
export default config;
