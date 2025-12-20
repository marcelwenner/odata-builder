export function toSelectQuery(select: string[]): string {
    if (select.length === 0) return '';

    return `$select=${select.join(', ')}`;
}
