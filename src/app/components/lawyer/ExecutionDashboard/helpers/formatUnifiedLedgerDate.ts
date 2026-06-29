/** تنسيق تاريخ دفتر موحّد — chunk execution-helpers (بلا React / lazy shell UI) */
export function formatUnifiedLedgerDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('ar-IQ');
}
