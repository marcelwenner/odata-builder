export const toTopQuery = (top: number): string => {
    if (!Number.isFinite(top) || !Number.isInteger(top) || top < 0) {
        throw new Error('Invalid top count');
    }
    return `$top=${top}`;
};
