import { flushSync } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { notifyFollowers } from '@/app/services/cloud/lawyerCommunityCloud';
import { RepositoryDB, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import {
    inferRepositoryMimeType,
    getRepositoryMediaKind,
} from '../components/repositoryMedia';
import { buildRepositoryDocumentFromUpload } from '../legalRepositoryUploadBuild';
import { syncRepositoryDocumentToCloud } from '../legalRepositoryCloudSync';
import {
    releaseRepositoryBlobUrl,
    reserveRepositoryFileLocally,
} from '../repositoryStorageService';
import {
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
} from '../repositoryUploadValidation';
import type { RepositoryUploadPayload } from '../legalRepositoryTypes';
import type { UseLegalRepositoryMutationsParams } from './useLegalRepositoryMutations.types';

const UPLOAD_ABORT_CODES = [
    'auth',
    'no-file',
    'no-storage',
    'invalid-fields',
    'invalid-file',
    'persist-failed',
    'save-failed',
];

type RunLegalRepositoryUploadArgs = Pick<
    UseLegalRepositoryMutationsParams,
    'user' | 'authorName' | 'documentsRef' | 'applyDocuments' | 'actionInflightRef'
> & {
    editingDoc: RepositoryDocument | null | undefined;
    data: RepositoryUploadPayload;
    setIsSubmitting: (value: boolean) => void;
    closeUploadModal: (opts?: { force?: boolean }) => void;
};

export async function runLegalRepositoryUploadSubmit(args: RunLegalRepositoryUploadArgs): Promise<void> {
    const { user, authorName, documentsRef, applyDocuments, actionInflightRef, editingDoc, data } = args;
    if (!user) {
        SmartToast.warning('سجّل الدخول أولاً');
        throw new Error('auth');
    }

    const title = sanitizeRepositoryUploadTitle(data.title);
    const description = sanitizeRepositoryUploadDescription(data.description);
    if (!title || !description) {
        SmartToast.warning('يرجى ملء جميع الحقول المطلوبة');
        throw new Error('invalid-fields');
    }

    if (!editingDoc && !data.file) {
        SmartToast.warning('يرجى اختيار ملف أو صورة للرفع');
        throw new Error('no-file');
    }

    if (data.file) {
        const kind =
            getRepositoryMediaKind(inferRepositoryMimeType(data.file), data.file.name) === 'image'
                ? 'image'
                : 'document';
        const fileError = validateRepositoryUploadFile(data.file, kind);
        if (fileError) {
            SmartToast.warning(fileError);
            throw new Error('invalid-file');
        }
    }

    const inflightKey = `upload:${editingDoc?.id ?? 'new'}`;
    if (actionInflightRef.current.has(inflightKey)) return;
    actionInflightRef.current.add(inflightKey);

    args.setIsSubmitting(true);
    let reservedPath: string | null = null;
    try {
        let storagePath = editingDoc?.storagePath ?? '';
        let fileName = editingDoc?.fileName ?? '';
        let mimeType = editingDoc?.mimeType ?? '';
        let fileSize = editingDoc?.fileSize ?? 0;
        const uploadFile = data.file;

        if (uploadFile) {
            const reserved = reserveRepositoryFileLocally(uploadFile);
            reservedPath = reserved.storagePath;
            storagePath = reserved.storagePath;
            fileName = reserved.fileName;
            mimeType = reserved.mimeType;
            fileSize = reserved.fileSize;
            try {
                await reserved.persist();
            } catch {
                releaseRepositoryBlobUrl(reservedPath);
                reservedPath = null;
                SmartToast.error('تعذّر حفظ نسخة الملف محلياً');
                throw new Error('persist-failed');
            }
        }

        if (!storagePath) {
            SmartToast.error('فشل رفع الملف — لم يُحفظ مسار التخزين');
            throw new Error('no-storage');
        }

        const savedDoc = buildRepositoryDocumentFromUpload({
            editingDoc,
            title,
            description,
            type: data.type as RepositoryDocument['type'],
            tags: data.tags,
            authorId: user.id,
            authorName,
            fileName,
            mimeType,
            storagePath,
            fileSize,
        });

        const snapshot = documentsRef.current;
        applyDocuments(
            editingDoc
                ? snapshot.map((doc) => (doc.id === savedDoc.id ? savedDoc : doc))
                : [savedDoc, ...snapshot],
        );

        try {
            await RepositoryDB.saveDocument(savedDoc);
        } catch {
            applyDocuments(snapshot);
            if (reservedPath) {
                releaseRepositoryBlobUrl(reservedPath);
                reservedPath = null;
            }
            SmartToast.error('فشل حفظ المستند محلياً');
            throw new Error('save-failed');
        }

        flushSync(() => {
            args.closeUploadModal({ force: true });
        });

        if (editingDoc) {
            SmartToast.success('تم تحديث المستند');
        } else {
            SmartToast.success('تم رفع المستند بنجاح');
            void notifyFollowers(
                user.id,
                'new_document',
                'مستند جديد من متابَع',
                `أضاف ${savedDoc.authorName} مستند "${savedDoc.title}" في المستودع القانوني`,
            );
        }

        if (uploadFile) {
            void syncRepositoryDocumentToCloud({
                savedDoc,
                file: uploadFile,
                ownerId: user.id,
                isStillPresent: (id) => documentsRef.current.some((doc) => doc.id === id),
                applyCloudDoc: (cloudDoc) =>
                    applyDocuments(
                        documentsRef.current.map((doc) => (doc.id === cloudDoc.id ? cloudDoc : doc)),
                    ),
            });
        }
    } catch (err) {
        if (err instanceof Error && UPLOAD_ABORT_CODES.includes(err.message)) {
            /* toast shown */
        } else {
            SmartToast.error('فشل رفع المستند');
        }
        throw err;
    } finally {
        actionInflightRef.current.delete(inflightKey);
        args.setIsSubmitting(false);
    }
}
