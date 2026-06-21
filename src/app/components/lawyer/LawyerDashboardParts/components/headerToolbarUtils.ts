export function formatHeaderToolbarBadge(count: number): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
}

export function shouldShowHeaderToolbarBadge(count: number): boolean {
    return count > 0;
}
