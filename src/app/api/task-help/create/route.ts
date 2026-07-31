import { assertRecipientInNetwork } from '../../../services/caseShare/caseShareNetworkGuard.ts';
import { TaskHelpRepository } from '../../../services/taskHelp/taskHelpRepository.ts';
import { redactPiiText } from '../../../services/tasks/taskSanitizer.ts';
import type { ShareScope } from '../../../types/taskHelpTypes.ts';
import { jsonResponse, readJsonBody, requireTaskHelpAuth } from '../_auth.ts';

const PUBLIC_TITLE_PREFIX = '[طلب مساعدة عامة]';

function enforcePublicSanitization(input: {
    title: string;
    location: string | null;
    instructions?: string;
}): { title: string; location: string | null; instructions?: string; isSanitised: true } {
    const cleanedTitle = redactPiiText(input.title) || 'مهمة';
    const title = cleanedTitle.startsWith(PUBLIC_TITLE_PREFIX)
        ? cleanedTitle
        : `${PUBLIC_TITLE_PREFIX} ${cleanedTitle}`.trim();
    const location = input.location ? redactPiiText(input.location) || null : null;
    const instructions = input.instructions ? redactPiiText(input.instructions) : undefined;
    return { title: title.slice(0, 500), location, instructions, isSanitised: true };
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireTaskHelpAuth(request);
        if (auth instanceof Response) return auth;
        const payload = await readJsonBody(request);
        if (!payload) return jsonResponse(400, { ok: false, error: 'جسم الطلب غير صالح' });

        const sourceTaskId =
            typeof payload.sourceTaskId === 'string' ? payload.sourceTaskId.trim() : '';
        let title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const shareScope = payload.shareScope as ShareScope | undefined;
        if (!sourceTaskId || !title) {
            return jsonResponse(400, { ok: false, error: 'sourceTaskId و title مطلوبان' });
        }
        if (shareScope !== 'PRIVATE_DIRECT' && shareScope !== 'PUBLIC_FORUM') {
            return jsonResponse(400, { ok: false, error: 'shareScope غير صالح' });
        }

        let targetColleagueId: string | undefined;
        let targetColleagueName: string | undefined;
        if (shareScope === 'PRIVATE_DIRECT') {
            if (typeof payload.targetColleagueId !== 'string' || !payload.targetColleagueId.trim()) {
                return jsonResponse(400, { ok: false, error: 'targetColleagueId مطلوب للطلب الخاص' });
            }
            targetColleagueId = payload.targetColleagueId.trim();
            if (targetColleagueId === auth.userId) {
                return jsonResponse(400, { ok: false, error: 'لا يمكن طلب المساعدة من نفسك' });
            }
            const inNetwork = await assertRecipientInNetwork(auth.userId, targetColleagueId);
            if (!inNetwork) {
                return jsonResponse(403, { ok: false, error: 'الزميل ليس ضمن شبكة المتابعة' });
            }
            if (typeof payload.targetColleagueName === 'string') {
                targetColleagueName = payload.targetColleagueName.trim();
            }
        }

        let location: string | null =
            typeof payload.location === 'string' ? payload.location : null;
        let instructions: string | undefined =
            typeof payload.instructions === 'string'
                ? payload.instructions.slice(0, 4000)
                : typeof payload.note === 'string'
                  ? payload.note.slice(0, 4000)
                  : undefined;
        let isSanitised = !!payload.isSanitised;

        if (shareScope === 'PUBLIC_FORUM') {
            const sanitized = enforcePublicSanitization({ title, location, instructions });
            title = sanitized.title;
            location = sanitized.location;
            instructions = sanitized.instructions;
            isSanitised = true;
        } else {
            title = title.slice(0, 500);
        }

        const requestRecord = await TaskHelpRepository.create({
            sourceTaskId,
            requesterId: auth.userId,
            requesterName:
                typeof payload.requesterName === 'string' ? payload.requesterName.trim() : undefined,
            shareScope,
            title,
            location,
            dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : null,
            instructions,
            isSanitised,
            targetColleagueId,
            targetColleagueName,
            forumPostId: typeof payload.forumPostId === 'string' ? payload.forumPostId : null,
        });

        return jsonResponse(200, { ok: true, request: requestRecord });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
