export interface CalendarPermissionContext {
    userId: string | undefined;
    isAdmin?: boolean;
    eventOwnerId?: string;
    dossierAccessLevel?: 'view' | 'edit' | 'admin';
    nativeSyncEnabled?: boolean;
    audioAlarmsEnabled?: boolean;
    canShare?: boolean;
    roleTier?: 'intern' | 'associate' | 'senior' | 'partner';
}

type CalendarPermissionPredicate = (ctx: CalendarPermissionContext) => boolean;

const isAuthenticated: CalendarPermissionPredicate = (ctx) => typeof ctx.userId === 'string' && ctx.userId.length > 0;
const isEventOwnerOrAdmin: CalendarPermissionPredicate = (ctx) =>
    isAuthenticated(ctx) && (ctx.isAdmin === true || ctx.eventOwnerId === ctx.userId);

export function canCreateEvent(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && ctx.roleTier !== 'intern';
}

export function canEditEvent(ctx: CalendarPermissionContext): boolean {
    if (!isAuthenticated(ctx)) return false;
    if (ctx.isAdmin === true) return true;
    return ctx.eventOwnerId === ctx.userId;
}

export function canDeleteEvent(ctx: CalendarPermissionContext): boolean {
    if (!isAuthenticated(ctx)) return false;
    if (ctx.isAdmin === true) return true;
    if (ctx.roleTier === 'partner' && ctx.eventOwnerId !== undefined) return true;
    return ctx.eventOwnerId === ctx.userId;
}

export function canViewConfidentialEvent(ctx: CalendarPermissionContext): boolean {
    if (!isAuthenticated(ctx)) return false;
    if (ctx.isAdmin === true) return true;
    if (ctx.dossierAccessLevel === 'admin' || ctx.dossierAccessLevel === 'edit') return true;
    return isEventOwnerOrAdmin(ctx);
}

export function canSyncNativeCalendar(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && ctx.nativeSyncEnabled === true;
}

export function canSyncDossierExecution(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && (ctx.dossierAccessLevel === 'edit' || ctx.dossierAccessLevel === 'admin' || ctx.isAdmin === true);
}

export function canSyncVisitation(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && (ctx.roleTier === 'senior' || ctx.roleTier === 'partner' || ctx.isAdmin === true);
}

export function canOverrideConflict(ctx: CalendarPermissionContext): boolean {
    if (!isAuthenticated(ctx)) return false;
    return ctx.isAdmin === true || ctx.roleTier === 'partner';
}

export function canTriggerAlarmAudio(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && ctx.audioAlarmsEnabled === true;
}

export function canExportIcs(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && ctx.canShare === true;
}

export function canAdminTombstones(ctx: CalendarPermissionContext): boolean {
    return isAuthenticated(ctx) && ctx.isAdmin === true;
}

export function canViewOthersSchedule(ctx: CalendarPermissionContext): boolean {
    if (!isAuthenticated(ctx)) return false;
    return ctx.isAdmin === true || ctx.roleTier === 'partner' || ctx.roleTier === 'senior';
}
