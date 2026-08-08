const GENERIC_DATE_LABELS = new Set(['تاريخ', 'موعد', 'مهلة', 'جلسة', 'date']);

function isGenericDateLabel(label: string): boolean {
    const trimmed = label.trim();
    return !trimmed || GENERIC_DATE_LABELS.has(trimmed);
}

export function formatUnscheduledDossierDateMessage(input: {
    moduleLabel: string;
    title: string;
    pathLabel: string;
    whenLabel: string;
}): string {
    const { moduleLabel, title, pathLabel, whenLabel } = input;
    const titleGeneric = isGenericDateLabel(title);
    const pathGeneric = isGenericDateLabel(pathLabel) || pathLabel.trim() === title.trim();

    if (!titleGeneric && !pathGeneric) {
        return `موعد غير مجدول في ${moduleLabel} «${title}» (${pathLabel}: ${whenLabel}) — هل تود مراجعته؟`;
    }
    if (!titleGeneric) {
        return `موعد غير مجدول في ${moduleLabel} «${title}» — ${whenLabel} — هل تود مراجعته؟`;
    }
    if (!pathGeneric) {
        return `موعد غير مجدول في ${moduleLabel} (${pathLabel}: ${whenLabel}) — هل تود مراجعته؟`;
    }
    return `موعد غير مجدول في ${moduleLabel} — ${whenLabel} — هل تود مراجعته؟`;
}
