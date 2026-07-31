import type { ProceduralActionItem, ProceduralNoteItem } from '../../proceduralContainersEngine';

export type ContainerModalMode =
    | { kind: 'create-root' }
    | { kind: 'edit'; containerId: string }
    | { kind: 'create-nested'; parentId: string; branchRole: 'primary' | 'sub' }
    | null;

export type NoteModalMode = { parentId: string; note?: ProceduralNoteItem } | null;
export type ActionModalMode = { parentId: string; action?: ProceduralActionItem } | null;
export type AdvanceModalMode = { parentId: string; actionId: string; actionTitle: string } | null;

export type StructuralTone = 'root' | 'primary' | 'sub' | 'item';
