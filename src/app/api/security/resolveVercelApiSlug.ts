function firstQueryValue(raw: string | string[] | undefined): string {
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean).join('/');
    return typeof raw === 'string' ? raw : '';
}

/** Catch-all `[...slug]` or rewrite `/api/:slug*` → `/api/handler`. */
export function resolveVercelApiSlug(req: {
    query?: { [key: string]: string | string[] };
    url?: string | null;
}): string {
    const fromQuery = firstQueryValue(req.query?.slug) || firstQueryValue(req.query?.path);
    const cleanedQuery = fromQuery.replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanedQuery && cleanedQuery !== 'handler' && cleanedQuery !== '[...slug]') {
        return cleanedQuery;
    }
    const pathOnly = (req.url ?? '').split('?')[0] ?? '';
    const stripped = pathOnly.replace(/^\/api\/?/, '').replace(/\/+$/, '');
    if (!stripped || stripped === 'handler' || stripped === '[...slug]') return '';
    return stripped;
}
