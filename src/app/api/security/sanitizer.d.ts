type JsonPrimitive = string | number | boolean | null | undefined;
type JsonLike = JsonPrimitive | JsonLike[] | {
    [key: string]: JsonLike;
};
export declare function sanitizePayload<T = JsonLike>(payload: T): T;
export {};
