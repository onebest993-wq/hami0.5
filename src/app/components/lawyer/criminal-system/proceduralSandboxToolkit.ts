import {
    CONTAINER_COLOR_PRESETS,
    CONTAINER_ICON_PRESETS,
    createProceduralId,
    type ProceduralContainer,
    type ProceduralSubItem,
} from './proceduralContainersEngine';

/** سجل تغييرات خفيف — شفافية دون تعقيد */
export type ProceduralCanvasAuditEntry = {
    id: string;
    at: string;
    summary: string;
};

const PROCEDURAL_AUDIT_MAX = 80;

export type SandboxTemplateId = 'starter-lane' | 'triple-lanes' | 'nested-workspace';

type SandboxTemplateMeta = {
    id: SandboxTemplateId;
    title: string;
    hint: string;
};

export const SANDBOX_TEMPLATES: SandboxTemplateMeta[] = [
    {
        id: 'starter-lane',
        title: 'مسار واحد فارغ',
        hint: 'حاوية رئيسية واحدة — عدّل الاسم وابنِ بداخلها',
    },
    {
        id: 'triple-lanes',
        title: 'ثلاث مراحل فارغة',
        hint: 'ثلاث حاويات جنباً إلى جنب — أعد تسميتها حسب قضيتك',
    },
    {
        id: 'nested-workspace',
        title: 'مساحة متداخلة',
        hint: 'حاوية رئيسية + فرع فارغ — للخطوات العميقة',
    },
];

export function normalizeProceduralCanvasAudit(raw: unknown): ProceduralCanvasAuditEntry[] {
    if (!Array.isArray(raw)) return [];
    const out: ProceduralCanvasAuditEntry[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const o = row as Record<string, unknown>;
        const summary = String(o.summary ?? '').trim();
        if (!summary) continue;
        out.push({
            id: String(o.id ?? '').trim() || createProceduralId(),
            at: String(o.at ?? '').trim() || new Date().toISOString(),
            summary,
        });
    }
    return out.slice(-PROCEDURAL_AUDIT_MAX);
}

export function appendProceduralAudit(
    list: ProceduralCanvasAuditEntry[],
    summary: string,
): ProceduralCanvasAuditEntry[] {
    const entry: ProceduralCanvasAuditEntry = {
        id: createProceduralId(),
        at: new Date().toISOString(),
        summary: String(summary ?? '').trim(),
    };
    if (!entry.summary) return list;
    return [...list, entry].slice(-PROCEDURAL_AUDIT_MAX);
}

function remapSubItems(items: ProceduralSubItem[], parentId: string): ProceduralSubItem[] {
    return items.map((item) => {
        if (item.type === 'note') {
            return { ...item, id: createProceduralId() };
        }
        if (item.type === 'action') {
            return { ...item, id: createProceduralId() };
        }
        const nested = cloneContainerWithNewIds(item.container, parentId);
        return { type: 'container', container: nested };
    });
}

/** نسخ حاوية كاملة بمعرّفات جديدة (أداة مساعدة للمحامي) */
export function cloneContainerWithNewIds(source: ProceduralContainer, parentId: string | null): ProceduralContainer {
    const id = createProceduralId();
    return {
        ...source,
        id,
        parentId,
        title: `${source.title} (نسخة)`,
        subItems: remapSubItems(source.subItems, id),
    };
}

export function buildSandboxTemplateRoots(templateId: SandboxTemplateId): ProceduralContainer[] {
    if (templateId === 'starter-lane') {
        return [
            {
                id: createProceduralId(),
                title: 'مسار — عدّل الاسم',
                color: CONTAINER_COLOR_PRESETS[0],
                icon: CONTAINER_ICON_PRESETS[0],
                parentId: null,
                subItems: [],
            },
        ];
    }
    if (templateId === 'triple-lanes') {
        return [1, 2, 3].map((n, i) => ({
            id: createProceduralId(),
            title: `مرحلة ${n} — عدّل الاسم`,
            color: CONTAINER_COLOR_PRESETS[i % CONTAINER_COLOR_PRESETS.length],
            icon: CONTAINER_ICON_PRESETS[i % CONTAINER_ICON_PRESETS.length],
            parentId: null,
            subItems: [],
        }));
    }
    const rootId = createProceduralId();
    const childId = createProceduralId();
    return [
        {
            id: rootId,
            title: 'مسار رئيسي — عدّل الاسم',
            color: CONTAINER_COLOR_PRESETS[1],
            icon: '📁',
            parentId: null,
            subItems: [
                {
                    type: 'container',
                    container: {
                        id: childId,
                        title: 'فرع — عدّل الاسم',
                        color: CONTAINER_COLOR_PRESETS[2],
                        icon: '📋',
                        parentId: rootId,
                        subItems: [],
                    },
                },
            ],
        },
    ];
}

type PrintLine = { depth: number; kind: 'container' | 'note' | 'action'; text: string; meta?: string };

export function flattenContainersForPrint(roots: ProceduralContainer[]): PrintLine[] {
    const lines: PrintLine[] = [];
    const walkContainer = (c: ProceduralContainer, depth: number) => {
        lines.push({ depth, kind: 'container', text: `${c.icon} ${c.title}` });
        for (const item of c.subItems) {
            if (item.type === 'note') {
                const body = item.body ? ` — ${item.body}` : '';
                const ref = item.contextRef ? ` [${item.contextRef}]` : '';
                lines.push({ depth: depth + 1, kind: 'note', text: item.title + body + ref });
            } else if (item.type === 'action') {
                const ref = item.contextRef ? ` | ${item.contextRef}` : '';
                lines.push({
                    depth: depth + 1,
                    kind: 'action',
                    text: item.title,
                    meta: `${item.date} — ${item.status}${ref}`,
                });
            } else {
                walkContainer(item.container, depth + 1);
            }
        }
    };
    for (const r of roots) walkContainer(r, 0);
    return lines;
}
