/**
 * Generic API response / error types.
 */

export interface APIResponse<T> {
    data: T;
    error?: string;
    status: APIStatus;
    message?: string;
}

export type APIStatus = 'success' | 'error' | 'loading';

export interface APIError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
