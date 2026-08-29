import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    TransactionStatus,
    type Transaction,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { blob, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

const LIFECYCLE_ACTIVE: SearchLifecycle = 'active';

export function quantumTaskToEntry(t: LegalTask, fileLifecycleById: Map<string, SearchLifecycle>): GlobalSearchEntry {
    const sub = t.subTasks.map((s) => s.title).join(' ');
    const docs = t.documentRequirements.map((d) => d.text).join(' ');
    const text = `${t.title} ${t.rawText} ${t.location || ''} ${sub} ${docs}`;
    const linkedLifecycle = t.linkedCaseId ? fileLifecycleById.get(String(t.linkedCaseId)) : undefined;
    return withLifecycle(
        {
            id: `qtask-${t.id}`,
            category: 'task',
            title: t.title,
            subtitle: t.location ? `مهمة ميدانية — ${t.location}` : 'مهام المحامي الكمية',
            snippet: t.rawText || undefined,
            _searchStr: norm(text),
            navigate: { type: 'tasks_manager', taskId: t.id },
        },
        linkedLifecycle ?? LIFECYCLE_ACTIVE,
    );
}

export function calendarToEntry(e: CalendarEvent, fileLifecycleById: Map<string, SearchLifecycle>): GlobalSearchEntry {
    const text = `${e.title} ${e.notes || ''} ${e.clientName || ''} ${e.location || ''} ${e.caseNo || ''} ${e.court || ''} ${e.caseId || ''}`;
    const linkedLifecycle = e.caseId ? fileLifecycleById.get(String(e.caseId)) : undefined;
    return withLifecycle(
        {
            id: `cal-${e.id}`,
            category: 'calendar',
            title: e.title,
            subtitle: `${e.date}${e.time ? ` ${e.time}` : ''}${e.clientName ? ` • ${e.clientName}` : ''}${e.caseNo ? ` • ${e.caseNo}` : ''}`,
            snippet: e.notes,
            _searchStr: norm(text),
            navigate: { type: 'calendar', eventId: e.id, date: e.date },
        },
        linkedLifecycle ?? LIFECYCLE_ACTIVE,
    );
}

export function urgentToEntry(raw: unknown, idx: number): GlobalSearchEntry[] {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const name = String(r.applicantName ?? r.title ?? r.clientName ?? `طلب ${idx + 1}`);
    const court = String(r.court ?? r.courtName ?? '');
    const caseNo = String(r.requestNumber ?? r.caseNo ?? r.caseNumber ?? '').trim();
    const text = [
        r.applicantName,
        r.title,
        r.clientName,
        r.court,
        r.courtName,
        r.requestNumber,
        r.caseNo,
        r.caseNumber,
        r.notes,
        r.description,
    ]
        .filter((v) => typeof v === 'string' && v.trim())
        .join(' ');
    const lifecycle: SearchLifecycle = r.archived === true ? 'archived' : LIFECYCLE_ACTIVE;
    return [
        withLifecycle(
            {
                id: `urgent-${r.id ?? idx}`,
                category: 'urgent',
                title: name,
                subtitle: court ? `${court}${caseNo ? ` • ${caseNo}` : ''}` : 'طلبات مستعجلة',
                _searchStr: norm(`${name} ${court} ${caseNo} ${text}`),
                navigate: { type: 'urgent', urgentId: String(r.id ?? idx) },
            },
            lifecycle,
        ),
    ];
}

export function threadingTxToEntry(tx: Transaction): GlobalSearchEntry {
    const text = `${tx.title} ${tx.clientName} ${tx.targetDepartment} ${tx.status}`;
    const lifecycle: SearchLifecycle =
        tx.status === TransactionStatus.Completed ? 'archived' : LIFECYCLE_ACTIVE;
    return withLifecycle(
        {
            id: `tx-${tx.id}`,
            category: 'threading',
            title: tx.clientName || tx.title,
            subtitle: `معاملة إدارية — ${tx.targetDepartment}`,
            _searchStr: norm(text),
            navigate: { type: 'transactions', transactionId: tx.id },
        },
        lifecycle,
    );
}

export function threadingTaskToEntry(t: TransactionTask, txTitle: string, transactionId: string): GlobalSearchEntry {
    const text = `${t.title} ${t.notes || ''} ${t.officialReference || ''} ${txTitle}`;
    return withLifecycle(
        {
            id: `txtask-${t.id}`,
            category: 'task',
            title: t.title,
            subtitle: `مهمة معاملة — ${txTitle}`,
            snippet: t.notes || undefined,
            _searchStr: norm(text),
            navigate: { type: 'transactions', transactionId },
        },
        LIFECYCLE_ACTIVE,
    );
}

export function notificationToEntry(n: {
    id: string;
    title: string;
    message: string;
    type: string;
}): GlobalSearchEntry {
    return withLifecycle(
        {
            id: `notif-${n.id}`,
            category: 'notification',
            title: n.title,
            subtitle: n.message.slice(0, 80) || 'إشعار',
            snippet: n.message.length > 80 ? n.message : undefined,
            _searchStr: norm(`${n.title} ${n.message} ${n.type}`),
            navigate: { type: 'notifications' },
        },
        LIFECYCLE_ACTIVE,
    );
}

export function communityPostToEntries(p: CommunityPost): GlobalSearchEntry[] {
    const tagText = p.tags.join(' ');
    const attach = p.attachment?.name || '';
    const postText = `${p.content} ${tagText} ${attach} ${p.authorName}`;
    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `forum-${p.id}`,
                category: 'community',
                title: p.content.slice(0, 80) || 'منشور مجتمع المحامين',
                subtitle: `${p.authorName}${p.tags.length ? ` • ${p.tags.join(', ')}` : ''}`,
                snippet: p.content.length > 80 ? p.content : undefined,
                _searchStr: norm(postText),
                navigate: { type: 'community', postId: p.id },
            },
            LIFECYCLE_ACTIVE,
        ),
    ];
    for (const c of p.comments ?? []) {
        if (!c.content?.trim()) continue;
        entries.push(
            withLifecycle(
                {
                    id: `forum-c-${p.id}-${c.id}`,
                    category: 'community',
                    title: c.content.slice(0, 80),
                    subtitle: `تعليق — ${p.authorName}`,
                    snippet: c.content,
                    _searchStr: blob([c.content, c.authorName, postText]),
                    navigate: { type: 'community', postId: p.id },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }
    return entries;
}
