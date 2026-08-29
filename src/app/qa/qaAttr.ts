export function qa(id: string): { 'data-testid': string } | Record<string, never> {
    if (import.meta.env.MODE === 'test') return { 'data-testid': id };
    return {};
}
