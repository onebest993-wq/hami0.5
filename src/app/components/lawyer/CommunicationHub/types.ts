import type { MessageAction } from '@/app/types/common';

export type HubRole = 'user' | 'model';

export interface HubChatMessage {
    id: string;
    role: HubRole;
    content: string;
    sources?: string[];
    isFile?: boolean;
    fileUrl?: string;
    fileType?: string;
    isDemo?: boolean;
    isDocument?: boolean;
    isError?: boolean;
    actions?: MessageAction[];
    isFallback?: boolean;
    retrievedChunks?: RetrievedChunk[];
}

export type RetrievedChunk = {
    law_name: string | null;
    article_number: string | null;
    content: string;
};

export interface ScenarioBarProps {
    onRunScenario: (id: number) => void;
}

export interface HeaderProps {
    onClose: () => void;
}

export interface InputBarProps {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
    onSend: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileClick: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface LoadingDotsProps {
    loadingFrame: number;
}
