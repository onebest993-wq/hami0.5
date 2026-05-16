declare module '@supabase/supabase-js' {
    export type User = any;
    export type Session = any;
    export type RealtimeChannel = {
        on: (...args: any[]) => RealtimeChannel;
        subscribe: (...args: any[]) => RealtimeChannel;
        unsubscribe: (...args: any[]) => Promise<void> | void;
    };

    export type SupabaseFunctionsClient = {
        invoke: <T = any>(fn: string, opts?: any) => Promise<{ data: T | null; error: any | null }>;
    };

    export type SupabaseAuthClient = {
        getUser: (...args: any[]) => Promise<any>;
        getSession: (...args: any[]) => Promise<any>;
        signInWithPassword: (...args: any[]) => Promise<any>;
        signUp: (...args: any[]) => Promise<any>;
        updateUser: (...args: any[]) => Promise<any>;
        signOut: (...args: any[]) => Promise<any>;
        onAuthStateChange: (...args: any[]) => any;
    };

    export type SupabaseStorageBucketApi = {
        upload: (...args: any[]) => Promise<{ data: any; error: any }>;
        createSignedUrl: (...args: any[]) => Promise<{ data: any; error: any }>;
        download: (...args: any[]) => Promise<{ data: any; error: any }>;
        list: (...args: any[]) => Promise<{ data: any; error: any }>;
        remove: (...args: any[]) => Promise<{ data: any; error: any }>;
    };

    export type SupabaseStorageClient = {
        from: (bucket: string) => SupabaseStorageBucketApi;
    };

    export type SupabaseClient = {
        auth: SupabaseAuthClient;
        functions: SupabaseFunctionsClient;
        storage: SupabaseStorageClient;
        channel: (name: string, opts?: any) => RealtimeChannel;
        removeChannel: (channel: RealtimeChannel) => Promise<void> | void;
        removeAllChannels: () => Promise<void> | void;
        from: <T = any>(table: string) => any;
        rpc: <T = any>(fn: string, args?: any, opts?: any) => Promise<{ data: T | null; error: any | null }>;
    };

    export function createClient(...args: any[]): SupabaseClient;
}
