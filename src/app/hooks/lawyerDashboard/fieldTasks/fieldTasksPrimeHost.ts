/** يُطلق من الدوك عند hover/pointerdown — تسخين الستارة بلا تركيب Host حتى الفتح */
export const FIELD_TASKS_PRIME_HOST_EVENT = 'hami:field-tasks-prime-host';

export function dispatchFieldTasksPrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(FIELD_TASKS_PRIME_HOST_EVENT));
}
