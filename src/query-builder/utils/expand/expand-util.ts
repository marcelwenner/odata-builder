import { ExpandFields } from 'src/query-builder/types/expand/expand-fields.type';

export const toExpandQuery = <T>(expandProps: ExpandFields<T>[]): string => {
    if (expandProps.length === 0) return '';

    return `$expand=${expandProps.join(', ')}`;
};
