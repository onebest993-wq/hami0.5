import SecureStoreService from '@/app/services/SecureStoreService';

export interface Document {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    dataUrl: string; // Base64
    createdAt: number;
    tags?: string[];
    caseId?: string; // Linked Case ID
}

class DocsVaultService {
    private storageKey = 'hami_docs_vault';
    private docs: Document[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const stored = SecureStoreService.getItemSync(this.storageKey);
            if (stored) {
                const parsed: unknown = JSON.parse(stored);
                this.docs = Array.isArray(parsed) ? (parsed as Document[]) : [];
            }
        } catch (e) {
            console.error("Failed to load docs vault", e);
        }
    }

    private save() {
        try {
            SecureStoreService.setItemSync(this.storageKey, JSON.stringify(this.docs));
        } catch (e) {
            console.error("Failed to save docs vault", e);
        }
    }

    addDocument(dataUrl: string, name: string, type: 'image' | 'pdf' = 'image', caseId?: string): Document {
        const newDoc: Document = {
            id: Date.now().toString(),
            name,
            type,
            dataUrl,
            createdAt: Date.now(),
            caseId
        };
        this.docs.unshift(newDoc);
        this.save();
        // Audit log: تمت إضافة مستند
        try {
            void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                AuditLog.document.added({
                    docId: newDoc.id,
                    name: newDoc.name,
                    linkedCaseId: newDoc.caseId,
                });
            });
        } catch { /* silent */ }
        return newDoc;
    }

    getDocuments(): Document[] {
        return this.docs;
    }

    deleteDocument(id: string) {
        this.docs = this.docs.filter(d => d.id !== id);
        this.save();
    }
}

export const docsVault = new DocsVaultService();
