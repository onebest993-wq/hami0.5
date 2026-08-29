let legalDocumentsPromise: Promise<typeof import('./accountLegalContent')> | null = null;

export function prefetchAccountLegalDocuments(): void {
    legalDocumentsPromise ??= import('./accountLegalContent');
}

export async function loadAccountLegalDocuments() {
    legalDocumentsPromise ??= import('./accountLegalContent');
    return (await legalDocumentsPromise).ACCOUNT_LEGAL_DOCUMENTS;
}
