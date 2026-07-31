/** يُطلق من hover بطاقة التنفيذ لتسليح Host مبكراً (keep-alive) */
export const EXECUTION_ARCHIVE_PRIME_HOST_EVENT = 'hami:prime-execution-archive-host';

export function dispatchExecutionArchivePrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(EXECUTION_ARCHIVE_PRIME_HOST_EVENT));
}
