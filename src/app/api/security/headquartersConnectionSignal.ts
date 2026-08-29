import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import { readForwardedClientIp } from './wifeSameOrigin.ts';
import {
    formatHqNetworkPlace,
    parseHqDeviceFromRequest,
    readHqEdgeCity,
    readHqEdgeCountry,
    sanitizeHqIp,
    type HqConnectionFact,
    type HqConnectionSource,
} from '@/app/domain/admin/hqConnectionSignal';
import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';

const DEBOUNCE_MS = 6 * 60 * 60 * 1000;
const LABEL_MAX = 80;

type SignalRow = {
    id?: unknown;
    seen_at?: unknown;
    ip?: unknown;
    device_class?: unknown;
    device_label?: unknown;
    country_code?: unknown;
    city?: unknown;
    source?: unknown;
};

function asIso(raw: unknown): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const iso = raw instanceof Date ? raw.toISOString() : String(raw).trim();
    return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function mapSignalRow(row: SignalRow): HqConnectionFact | null {
    const at = asIso(row.seen_at);
    const deviceLabel = stripHqControlChars(row.device_label, LABEL_MAX);
    if (!at || !deviceLabel) return null;
    const sourceRaw = String(row.source ?? '').trim();
    const source: HqConnectionSource =
        sourceRaw === 'login' || sourceRaw === 'signup' || sourceRaw === 'refresh' || sourceRaw === 'session'
            ? sourceRaw
            : 'session';
    const ip = sanitizeHqIp(row.ip);
    const countryCode = String(row.country_code ?? '').trim().toUpperCase() || null;
    const city = stripHqControlChars(row.city, 80) || null;
    return {
        at,
        deviceLabel,
        ip,
        place: formatHqNetworkPlace({ ip, countryCode, city }),
        source,
    };
}

/** يسجّل إشارة اتصال للمقر. الفشل لا يمنع الدخول. لا GPS ولا إحداثيات. */
export async function recordHeadquartersConnectionSignal(
    userId: string,
    request: Request,
    source: 'login' | 'signup' | 'refresh',
): Promise<void> {
    const id = userId.trim();
    if (!isPostgresUuidSubject(id)) return;
    try {
        const admin = getSupabaseAdminClient();
        if (!admin) return;
        const device = parseHqDeviceFromRequest(request);
        const ip = sanitizeHqIp(readForwardedClientIp(request));
        const countryCode = readHqEdgeCountry(request);
        const city = readHqEdgeCity(request);
        const { data: latest } = await admin
            .from('hq_connection_signals')
            .select('id, ip, device_class, country_code, city, seen_at')
            .eq('user_id', id)
            .order('seen_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const last = latest as SignalRow | null;
        const same =
            last &&
            String(last.device_class ?? '') === device.deviceClass &&
            sanitizeHqIp(last.ip) === ip &&
            String(last.country_code ?? '').toUpperCase() === (countryCode ?? '') &&
            stripHqControlChars(last.city, 80) === (city ?? '');
        const lastAt = last ? Date.parse(String(last.seen_at ?? '')) : NaN;
        if (same && Number.isFinite(lastAt) && Date.now() - lastAt < DEBOUNCE_MS && last?.id) {
            await admin
                .from('hq_connection_signals')
                .update({ seen_at: new Date().toISOString() })
                .eq('id', last.id);
            return;
        }
        await admin.from('hq_connection_signals').insert({
            user_id: id,
            ip,
            device_class: device.deviceClass,
            device_label: device.deviceLabel.slice(0, LABEL_MAX),
            country_code: countryCode,
            city: city?.slice(0, 80) ?? null,
            source,
        });
    } catch {
        /* الدخول لا يعتمد على سجل المقر */
    }
}

export async function listHeadquartersConnectionSignals(
    admin: {
        from: (table: string) => {
            select: (cols: string) => {
                eq: (col: string, value: string) => {
                    order: (
                        col: string,
                        opts: { ascending: boolean },
                    ) => { limit: (n: number) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };
                };
            };
        };
    },
    userId: string,
): Promise<{ rows: HqConnectionFact[]; failed: boolean }> {
    try {
        const { data, error } = await admin
            .from('hq_connection_signals')
            .select('seen_at, ip, device_label, country_code, city, source')
            .eq('user_id', userId)
            .order('seen_at', { ascending: false })
            .limit(8);
        if (error) {
            const hay = String(error.message ?? '').toLowerCase();
            if (hay.includes('hq_connection_signals') && (hay.includes('does not exist') || hay.includes('schema cache'))) {
                return { rows: [], failed: false };
            }
            return { rows: [], failed: true };
        }
        const rows: HqConnectionFact[] = [];
        for (const raw of Array.isArray(data) ? data : []) {
            const mapped = mapSignalRow(raw as SignalRow);
            if (mapped) rows.push(mapped);
        }
        return { rows, failed: false };
    } catch {
        return { rows: [], failed: true };
    }
}
