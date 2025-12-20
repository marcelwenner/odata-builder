import { OrderByDescriptor } from '../../types/orderby/orderby-descriptor.type';

export const toOrderByQuery = <T>(orderBy: OrderByDescriptor<T>[]) => {
    if (!orderBy || orderBy.length === 0) return '';

    const orderByFields = orderBy
        .filter(curr => curr && curr.field) // Filtere ungültige Einträge heraus
        .reduce(
            (prev, curr, index, array) =>
                prev +
                `${curr.field} ${curr.orderDirection ?? 'asc'}${
                    index < array.length - 1 ? ', ' : ''
                }`,
            '',
        );

    return orderByFields ? `$orderby=${orderByFields}` : '';
};
