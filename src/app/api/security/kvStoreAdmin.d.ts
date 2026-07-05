export declare function kvSet(key: string, value: unknown): Promise<void>;
export declare function kvGet(key: string): Promise<unknown>;
export declare function kvDel(key: string): Promise<void>;
export declare function kvGetByPrefix(prefix: string): Promise<unknown[]>;
export declare function kvKeysByPrefix(prefix: string): Promise<string[]>;
export declare function kvDelByPrefix(prefix: string): Promise<number>;
