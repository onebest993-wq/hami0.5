export declare function applyWifeSecurityHeaders(response: Response): Response;
export declare function wifeJsonResponse(status: number, body: Record<string, unknown>): Response;
export declare function getDevSecurityHeaders(): Record<string, string>;
export declare function getProductionSecurityHeaders(): Record<string, string>;
