export type RepositoryDocument = {
    id: string;
    title: string;
    description: string;
    type: 'عقد' | 'قرار حكم' | 'عريضة' | 'بحث قانوني' | 'أخرى';
    authorId: string;
    authorName: string;
    uploadDate: string;
    fileName: string;
    mimeType: string;
    storagePath: string;
    fileSize: number;
    tags?: string[];
};

export type SmartVaultDocType = 'pdf' | 'image';
export type SmartVaultFilterTag = 'الكل' | 'عقود' | 'طابو' | 'عرائض' | 'أخرى';

export type SmartVaultDoc = {
    id: string;
    title: string;
    type: SmartVaultDocType;
    tags: string[];
    authorId: string;
    createdAt: string;
    updatedAt: string;
    fileSize: number;
    fileName: string;
    mimeType: string;
    storagePath: string;
    signedUrl?: string | null;
    aiSummary?: string | null;
    lawyerNote?: string | null;
    customCategory?: string | null;
    isProcessing?: boolean;
    boundDossierId?: string | null;
    roomId?: string | null;
};
