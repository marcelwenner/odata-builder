export const toSkipQuery = (skip: number): string => {
    if (!Number.isFinite(skip) || !Number.isInteger(skip) || skip < 0) {
        throw new Error('Invalid skip count');
    }
    return `$skip=${skip}`;
};
