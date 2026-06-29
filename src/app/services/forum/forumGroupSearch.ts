/** يهرب محارف ilike في PostgREST (.or filters) */
export function escapePostgrestIlike(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
