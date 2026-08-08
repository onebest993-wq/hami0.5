export const SPARK_OPEN_VAULT_DOC_EVENT = 'spark-open-vault-doc';

export function requestSparkOpenVaultDoc(docId: string): void {
    const id = String(docId ?? '').trim();
    if (!id) return;
    window.dispatchEvent(
        new CustomEvent(SPARK_OPEN_VAULT_DOC_EVENT, {
            detail: { docId: id },
        }),
    );
}
