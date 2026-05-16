/** Minimal globals for Supabase Edge (Deno) — satisfies the workspace TypeScript checker. */
declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
    serve: (
        handler: (req: Request) => Response | Promise<Response>,
    ) => void;
};
