import type { MutableRefObject } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

export type LegalRepositoryAuthUser = {
    id: string;
    email?: string;
    user_metadata?: { fullName?: string };
} | null;

export type UseLegalRepositoryMutationsParams = {
    user: LegalRepositoryAuthUser;
    userId: string | null;
    authorName: string;
    isOwner: (doc: RepositoryDocument) => boolean;
    documentsRef: MutableRefObject<RepositoryDocument[]>;
    applyDocuments: (docs: RepositoryDocument[]) => void;
    actionInflightRef: MutableRefObject<Set<string>>;
};
