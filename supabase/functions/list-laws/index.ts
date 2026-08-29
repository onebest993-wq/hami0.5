/**
 * Edge list-laws retired. Catalog reads go through same-origin /api/laws/list.
 */
function corsHeadersFor(req: Request): Record<string, string> {
    const requested = req.headers.get('access-control-request-headers');
    const allowHeaders =
        requested && requested.trim().length > 0
            ? requested
            : ['authorization', 'x-client-info', 'apikey', 'content-type'].join(', ');
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': allowHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };
}

Deno.serve((req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeadersFor(req) });
    }
    return new Response(
        JSON.stringify({
            ok: false,
            error: 'Edge list-laws retired. Use same-origin /api/laws/list.',
        }),
        {
            status: 410,
            headers: {
                ...corsHeadersFor(req),
                'Content-Type': 'application/json; charset=utf-8',
            },
        },
    );
});
