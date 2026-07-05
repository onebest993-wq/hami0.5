/**
 * Bootstrap CSRF session — requires valid JWT + WIFE signature on GET.
 * Returns token in JSON and sets HttpOnly cookie (double-submit + server registry).
 */
export declare function GET(request: Request): Promise<Response>;
/** Revoke CSRF session on logout — requires JWT + WIFE on DELETE. */
export declare function DELETE(request: Request): Promise<Response>;
