import { createClient } from 'npm:@supabase/supabase-js@2';

type ExecutionFileRow = {
    id: string;
    user_id: string;
    case_no: string | null;
    status: string | null;
    execution_type: string | null;
    updated_at: string | null;
    encrypted_data: string | null;
};

type AuditorSuggestion = {
    type?: string;
    priority?: string;
    title?: string;
    description?: string;
    rationale?: string;
};

type ExecutionCopilotResult = {
    suggestions?: AuditorSuggestion[];
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function getAdminClient() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !serviceRole) return null;
    return createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function parseEncryptedData(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function hasRiskSignal(result: ExecutionCopilotResult): boolean {
    const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
    if (!suggestions.length) return false;
    return suggestions.some((s) => {
        const t = String(s.type || '').trim();
        const p = String(s.priority || '').trim();
        const text = `${s.title || ''} ${s.description || ''} ${s.rationale || ''}`;
        return (
            t === 'حرج' ||
            t === 'إجراء_فوري' ||
            p === 'critical' ||
            /تقادم|مهلة|انتهاء|تبليغ|إخبار|اخبار/i.test(text)
        );
    });
}

async function callExecutionCopilot(
    row: ExecutionFileRow,
    encrypted: Record<string, unknown>
): Promise<ExecutionCopilotResult | null> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !serviceRole) return null;

    const nowIso = new Date().toISOString();
    const snapshot = {
        executionId: row.id,
        dossierStatus: row.status || 'active',
        claimType: String(encrypted?.claimType || row.execution_type || 'تنفيذي'),
        executionType: String(encrypted?.executionType || row.execution_type || ''),
        documentType: String(encrypted?.documentType || encrypted?.docType || ''),
        debtorJob: String(encrypted?.debtorJob || ''),
        hasGuarantor: Boolean(encrypted?.hasGuarantor || encrypted?.guarantor_followup),
        remainingDebt: Number(encrypted?.remainingDebt || 0),
        generatedAt: nowIso,
        timeline: [
            {
                id: 'daily-auditor-last-action',
                title: 'آخر تحديث للإضبارة',
                date: row.updated_at || nowIso,
                source: 'daily-auditor',
                type: 'other',
            },
        ],
        notes: [],
        tasks: [],
        decisions: [],
        quickFacts: {
            creditorsCount: 0,
            debtorsCount: 0,
            pendingTasksCount: 0,
            timelineCount: 1,
            decisionsCount: 0,
            appealedDecisionsCount: 0,
            lastTimelineDate: row.updated_at || nowIso,
        },
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/execution-copilot`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${serviceRole}`,
            apikey: serviceRole,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mode: 'hybrid',
            trigger: 'auto',
            snapshot,
        }),
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const client = getAdminClient();
        if (!client) {
            return new Response(JSON.stringify({ error: 'Missing Supabase admin env' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: staleFiles, error } = await client
            .from('execution_files')
            .select('id, user_id, case_no, status, execution_type, updated_at, encrypted_data')
            .eq('status', 'active')
            .lt('updated_at', sevenDaysAgoIso)
            .order('updated_at', { ascending: true })
            .limit(200);
        if (error) {
            throw new Error(error.message);
        }

        let scanned = 0;
        let alerted = 0;
        for (const row of (staleFiles || []) as ExecutionFileRow[]) {
            scanned += 1;
            const encrypted = parseEncryptedData(row.encrypted_data);
            const copilotResult = await callExecutionCopilot(row, encrypted);
            if (!copilotResult || !hasRiskSignal(copilotResult)) continue;

            const runDay = new Date().toISOString().slice(0, 10);
            const auditKey = `daily-auditor:${row.id}:${runDay}`;
            const { data: exists } = await client
                .from('notifications')
                .select('id')
                .eq('user_id', row.user_id)
                .eq('notification_key', auditKey)
                .limit(1);
            if (Array.isArray(exists) && exists.length > 0) continue;

            const topSuggestion = Array.isArray(copilotResult?.suggestions)
                ? copilotResult.suggestions[0]
                : null;
            const title = String(topSuggestion?.title || 'تنبيه مراقبة يومي للإضبارة');
            const message = String(
                topSuggestion?.description ||
                    topSuggestion?.rationale ||
                    'تم رصد مخاطرة إجرائية تحتاج متابعة من المحامي.'
            );
            const severity =
                String(topSuggestion?.type || '').trim() === 'حرج' ||
                String(topSuggestion?.priority || '').trim() === 'critical'
                    ? 'critical'
                    : 'warning';

            const { error: insertError } = await client.from('notifications').insert({
                user_id: row.user_id,
                execution_id: row.id,
                title,
                message,
                severity,
                notification_key: auditKey,
                metadata: {
                    source: 'daily-auditor',
                    case_no: row.case_no || null,
                    scanned_at: new Date().toISOString(),
                    suggestion: topSuggestion || null,
                },
                is_read: false,
            });
            if (!insertError) alerted += 1;
        }

        return new Response(
            JSON.stringify({
                ok: true,
                scanned,
                alerted,
                stale_count: (staleFiles || []).length,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
