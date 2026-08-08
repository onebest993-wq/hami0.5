import { describe, expect, it, vi } from 'vitest';
import {
    requestSparkOpenVaultDoc,
    SPARK_OPEN_VAULT_DOC_EVENT,
} from '@/app/spark/focus/sparkVaultDocFocus';

describe('sparkVaultDocFocus', () => {
    it('يبث حدث فتح المرفق مع معرّف المستند', () => {
        const handler = vi.fn();
        window.addEventListener(SPARK_OPEN_VAULT_DOC_EVENT, handler);
        requestSparkOpenVaultDoc('doc-42');
        window.removeEventListener(SPARK_OPEN_VAULT_DOC_EVENT, handler);

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent<{ docId: string }>;
        expect(event.detail.docId).toBe('doc-42');
    });

    it('يتجاهل المعرّف الفارغ', () => {
        const handler = vi.fn();
        window.addEventListener(SPARK_OPEN_VAULT_DOC_EVENT, handler);
        requestSparkOpenVaultDoc('   ');
        window.removeEventListener(SPARK_OPEN_VAULT_DOC_EVENT, handler);
        expect(handler).not.toHaveBeenCalled();
    });
});
