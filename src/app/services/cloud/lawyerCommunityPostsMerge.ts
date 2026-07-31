import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import type {
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
    ForumEditHistoryEntry,
} from '@/app/services/cloud/lawyerCommunityTypes';

export function normalizeCommunityPost(raw: unknown): CommunityPost | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : null;
    const authorIdRaw = typeof o.authorId === 'string' ? o.authorId : typeof o.author_id === 'string' ? o.author_id : null;
    const authorName = typeof o.authorName === 'string' ? o.authorName : null;
    const content = typeof o.content === 'string' ? o.content : null;
    const createdAt = typeof o.createdAt === 'string' ? o.createdAt : null;
    const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : createdAt;
    if (!id || !authorIdRaw || !authorName || !content || !createdAt || !updatedAt) return null;
    const tags = Array.isArray(o.tags) ? (o.tags.filter((t) => typeof t === 'string') as string[]) : [];
    const upvoterIds = Array.isArray(o.upvoterIds) ? (o.upvoterIds.filter((t) => typeof t === 'string') as string[]) : [];
    const comments = Array.isArray(o.comments)
        ? (o.comments
              .map((c) => {
                  if (!c || typeof c !== 'object') return null;
                  const cc = c as Record<string, unknown>;
                  const cid = typeof cc.id === 'string' ? cc.id : null;
                  const postId = typeof cc.postId === 'string' ? cc.postId : id;
                  const cauthorIdRaw =
                      typeof cc.authorId === 'string' ? cc.authorId : typeof cc.author_id === 'string' ? cc.author_id : null;
                  const cauthorName = typeof cc.authorName === 'string' ? cc.authorName : null;
                  const ccontent = typeof cc.content === 'string' ? cc.content : null;
                  const ccreatedAt = typeof cc.createdAt === 'string' ? cc.createdAt : null;
                  if (!cid || !postId || !cauthorIdRaw || !cauthorName || !ccontent || !ccreatedAt) return null;
                  const parentId = typeof cc.parentId === 'string' ? cc.parentId : undefined;
                  return {
                      id: cid,
                      postId,
                      authorId: cauthorIdRaw,
                      author_id: cauthorIdRaw,
                      authorName: cauthorName,
                      content: ccontent,
                      createdAt: ccreatedAt,
                      parentId,
                  } as CommunityComment;
              })
              .filter((x) => x !== null) as CommunityComment[])
        : [];
    const attachment =
        o.attachment && typeof o.attachment === 'object'
            ? (() => {
                  const a = o.attachment as Record<string, unknown>;
                  const type: CommunityAttachment['type'] | null =
                      a.type === 'image'
                          ? 'image'
                          : a.type === 'document'
                            ? 'document'
                            : a.type === 'audio'
                              ? 'audio'
                              : null;
                  const url = typeof a.url === 'string' ? a.url.trim() : '';
                  const name = typeof a.name === 'string' ? a.name : null;
                  const storagePath = typeof a.storagePath === 'string' ? a.storagePath.trim() : '';
                  if (!type || !name || (!url && !storagePath)) {
                      return null;
                  }
                  const mimeType = typeof a.mimeType === 'string' ? a.mimeType : undefined;
                  return {
                      type,
                      ...(url ? { url } : {}),
                      name,
                      mimeType,
                      storagePath: storagePath || undefined,
                  };
              })()
            : null;
    const bestCommentId =
        typeof o.bestCommentId === 'string'
            ? o.bestCommentId
            : o.bestCommentId === null
              ? null
              : null;
    const isUrgent = typeof o.isUrgent === 'boolean' ? o.isUrgent : undefined;
    const isAnonymous = typeof o.isAnonymous === 'boolean' ? o.isAnonymous : undefined;
    const isEdited = typeof o.isEdited === 'boolean' ? o.isEdited : undefined;
    const editCount = typeof o.editCount === 'number' && o.editCount >= 0 ? o.editCount : undefined;
    const editHistory = Array.isArray(o.editHistory)
        ? (o.editHistory
              .map((entry) => {
                  if (!entry || typeof entry !== 'object') return null;
                  const e = entry as Record<string, unknown>;
                  const content = typeof e.content === 'string' ? e.content : null;
                  const editedAt = typeof e.editedAt === 'string' ? e.editedAt : null;
                  if (!content || !editedAt) return null;
                  return { content, editedAt };
              })
              .filter((x): x is ForumEditHistoryEntry => x !== null))
        : undefined;
    const isPinned = typeof o.isPinned === 'boolean' ? o.isPinned : undefined;
    const isLocked = typeof o.isLocked === 'boolean' ? o.isLocked : undefined;
    const groupId =
        typeof o.groupId === 'string'
            ? o.groupId
            : typeof o.group_id === 'string'
              ? o.group_id
              : o.groupId === null || o.group_id === null
                ? null
                : undefined;
    return {
        id,
        authorId: authorIdRaw,
        author_id: authorIdRaw,
        authorName,
        content,
        tags,
        createdAt,
        updatedAt,
        attachment,
        upvoterIds,
        comments,
        bestCommentId,
        isUrgent,
        isAnonymous,
        isEdited,
        editCount,
        editHistory,
        isPinned,
        isLocked,
        groupId,
    };
}

function mergeCommunityComments(
    left: CommunityComment[],
    right: CommunityComment[],
): CommunityComment[] {
    const map = new Map<string, CommunityComment>();
    for (const c of left) map.set(c.id, c);
    for (const c of right) {
        const prev = map.get(c.id);
        if (!prev) {
            map.set(c.id, c);
            continue;
        }
        map.set(c.id, c.content.length >= prev.content.length ? c : prev);
    }
    return Array.from(map.values()).sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
}

function isCloudStoragePath(path: string | undefined | null): boolean {
    const trimmed = path?.trim() ?? '';
    return Boolean(trimmed && !trimmed.startsWith('idb:forum:'));
}

function pickBestCommunityAttachment(
    local: CommunityPost,
    remote: CommunityPost,
): CommunityPost['attachment'] {
    const la = local.attachment;
    const ra = remote.attachment;
    if (la && !ra) return la;
    if (ra && !la) return ra;
    if (!la && !ra) return null;

    const localCloud = isCloudStoragePath(la!.storagePath);
    const remoteCloud = isCloudStoragePath(ra!.storagePath);
    if (localCloud && !remoteCloud) return la;
    if (remoteCloud && !localCloud) return ra;

    const localStable = Boolean(la!.url && !la!.url.startsWith('blob:'));
    const remoteStable = Boolean(ra!.url && !ra!.url.startsWith('blob:'));
    if (localStable && !remoteStable) return la;
    if (remoteStable && !localStable) return ra;

    return la!.storagePath && !ra!.storagePath ? la : ra!.storagePath && !la!.storagePath ? ra : la;
}

function mergeSingleCommunityPost(local: CommunityPost, remote: CommunityPost): CommunityPost {
    const localTime = Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
    const remoteTime = Number.isFinite(Date.parse(remote.updatedAt)) ? Date.parse(remote.updatedAt) : 0;
    const newer = remoteTime >= localTime ? remote : local;
    const older = remoteTime >= localTime ? local : remote;

    let content = local.content;
    let isEdited = Boolean(local.isEdited || remote.isEdited);
    let editCount = Math.max(local.editCount ?? 0, remote.editCount ?? 0);
    let editHistory =
        (local.editHistory?.length ?? 0) >= (remote.editHistory?.length ?? 0)
            ? local.editHistory
            : remote.editHistory;
    if (local.content !== remote.content) {
        if (local.isEdited && !remote.isEdited) {
            content = local.content;
        } else if (!local.isEdited && remote.isEdited) {
            content = remote.content;
        } else if (remoteTime > localTime) {
            content = remote.content;
        } else {
            content = local.content;
        }
    }

    const upvoterIds = [...new Set([...(local.upvoterIds ?? []), ...(remote.upvoterIds ?? [])])];
    const comments = mergeCommunityComments(local.comments ?? [], remote.comments ?? []);
    const tags = Array.from(new Set([...(local.tags ?? []), ...(remote.tags ?? [])]));

    return {
        ...newer,
        content,
        tags,
        isEdited,
        editCount: editCount || undefined,
        editHistory,
        attachment: pickBestCommunityAttachment(local, remote),
        upvoterIds,
        comments,
        bestCommentId: newer.bestCommentId ?? older.bestCommentId ?? null,
        isPinned: local.isPinned || remote.isPinned,
        isLocked: local.isLocked || remote.isLocked,
        isUrgent: local.isUrgent || remote.isUrgent,
        isAnonymous: local.isAnonymous || remote.isAnonymous,
        updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
    };
}

export function mergeCommunityPostsById(
    localPosts: CommunityPost[],
    remotePosts: CommunityPost[],
): CommunityPost[] {
    const map = new Map<string, CommunityPost>();
    for (const p of localPosts) map.set(p.id, p);
    for (const p of remotePosts) {
        const prev = map.get(p.id);
        if (!prev) {
            map.set(p.id, p);
            continue;
        }
        map.set(p.id, mergeSingleCommunityPost(prev, p));
    }
    return Array.from(map.values());
}

export function sortCommunityPosts(posts: CommunityPost[]): CommunityPost[] {
    return [...posts].sort((a, b) => compareCommunityPostsForFeed(a, b));
}
