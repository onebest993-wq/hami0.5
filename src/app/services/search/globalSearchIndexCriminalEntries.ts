import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { blob, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

const LIFECYCLE_ACTIVE: SearchLifecycle = 'active';

export function criminalToEntry(raw: unknown): GlobalSearchEntry[] {
    if (!raw || typeof raw !== 'object') return [];
    const c = raw as Record<string, unknown>;
    const id = String(c.id ?? '');
    if (!id) return [];

    const location =
        c.location && typeof c.location === 'object' ? (c.location as Record<string, unknown>) : {};
    const caseNo =
        String(c.courtCaseNumber ?? location.caseNumber ?? location.investigationDossierNumber ?? '').trim();
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    const d0 =
        defendants[0] && typeof defendants[0] === 'object' ? (defendants[0] as Record<string, unknown>) : null;
    const complainants = Array.isArray(c.complainants) ? c.complainants : [];
    const comp0 =
        complainants[0] && typeof complainants[0] === 'object'
            ? (complainants[0] as Record<string, unknown>)
            : null;
    const clientName = String(d0?.fullName ?? comp0?.fullName ?? '').trim();
    const basics = c.basics && typeof c.basics === 'object' ? (c.basics as Record<string, unknown>) : {};
    const stage = String(basics.stage ?? '').trim();
    const title = clientName || (stage ? `جزائي — ${stage}` : 'إضبارة جزائية');
    const lifecycle: SearchLifecycle = c.isArchived === true ? 'archived' : LIFECYCLE_ACTIVE;
    const notesRaw = Array.isArray(c.notes) ? c.notes : [];
    const noteTextsForMain: string[] = [];
    for (const nRaw of notesRaw) {
        if (!nRaw || typeof nRaw !== 'object') continue;
        const n = nRaw as Record<string, unknown>;
        if (n.isDeleted) continue;
        const noteText = String(n.text ?? n.content ?? '').trim();
        if (noteText) noteTextsForMain.push(noteText);
    }

    const proceduralTimeline = Array.isArray(c.proceduralTimeline) ? c.proceduralTimeline : [];
    const proceduralTexts: string[] = [];
    for (const evRaw of proceduralTimeline) {
        if (!evRaw || typeof evRaw !== 'object') continue;
        const ev = evRaw as Record<string, unknown>;
        const evTitle = String(ev.title ?? ev.name ?? '').trim();
        const evDetails = String(ev.details ?? ev.description ?? '').trim();
        if (evTitle || evDetails) proceduralTexts.push(`${evTitle} ${evDetails}`.trim());
    }

    const partyNamesForMain = [
        ...defendants.map((p) =>
            p && typeof p === 'object' ? String((p as Record<string, unknown>).fullName ?? '') : '',
        ),
        ...complainants.map((p) =>
            p && typeof p === 'object' ? String((p as Record<string, unknown>).fullName ?? '') : '',
        ),
    ]
        .map((n) => n.trim())
        .filter(Boolean);

    const text = [title, caseNo, stage, ...partyNamesForMain, ...noteTextsForMain, ...proceduralTexts]
        .filter(Boolean)
        .join(' ');

    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `criminal-${id}`,
                category: 'criminal',
                title,
                subtitle: caseNo ? `جزائي • ${caseNo}` : 'قضايا جزائية',
                _searchStr: norm(text),
                navigate: { type: 'criminal', criminalId: id },
            },
            lifecycle,
        ),
    ];

    const indexParty = (
        person: Record<string, unknown>,
        idx: number,
        role: 'متهم' | 'شاكٍ',
        partyType: 'defendant' | 'complainant',
    ) => {
        const name = String(person.fullName ?? '').trim();
        if (!name) return;
        const nat = String(person.nationality ?? '').trim();
        const occ = String(person.occupation ?? '').trim();
        const addr = String(person.address ?? '').trim();
        entries.push(
            withLifecycle(
                {
                    id: `criminal-${partyType}-${id}-${idx}`,
                    category: 'party',
                    title: name,
                    subtitle: `${role} — ${title}${caseNo ? ` • ${caseNo}` : ''}`,
                    _searchStr: blob([name, nat, occ, addr, role]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    };

    defendants.forEach((p, i) => {
        if (p && typeof p === 'object') indexParty(p as Record<string, unknown>, i, 'متهم', 'defendant');
    });
    complainants.forEach((p, i) => {
        if (p && typeof p === 'object') indexParty(p as Record<string, unknown>, i, 'شاكٍ', 'complainant');
    });

    for (const nRaw of notesRaw) {
        if (!nRaw || typeof nRaw !== 'object') continue;
        const n = nRaw as Record<string, unknown>;
        if (n.isDeleted) continue;
        const noteText = String(n.text ?? n.content ?? '').trim();
        if (!noteText) continue;
        entries.push(
            withLifecycle(
                {
                    id: `criminal-note-${id}-${String(n.id ?? noteText.slice(0, 20))}`,
                    category: 'note',
                    title: noteText.slice(0, 80),
                    subtitle: `ملاحظة جزائية — ${title}`,
                    snippet: noteText,
                    _searchStr: blob([noteText]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    }

    for (const evRaw of proceduralTimeline) {
        if (!evRaw || typeof evRaw !== 'object') continue;
        const ev = evRaw as Record<string, unknown>;
        const evTitle = String(ev.title ?? ev.name ?? '').trim();
        const evDetails = String(ev.details ?? ev.description ?? '').trim();
        if (!evTitle && !evDetails) continue;
        entries.push(
            withLifecycle(
                {
                    id: `criminal-event-${id}-${String(ev.id ?? evTitle)}`,
                    category: 'criminal',
                    title: evTitle || evDetails.slice(0, 80),
                    subtitle: `إجراء — ${title}`,
                    snippet: evDetails || undefined,
                    _searchStr: blob([evTitle, evDetails]),
                    navigate: { type: 'criminal', criminalId: id },
                },
                lifecycle,
            ),
        );
    }

    return entries;
}
