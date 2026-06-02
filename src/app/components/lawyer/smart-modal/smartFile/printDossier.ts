/** Opens the browser print dialog (user can save as PDF). */
export function printDossier(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
    }
}
