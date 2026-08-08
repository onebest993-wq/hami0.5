// @ts-nocheck
/** أيقونات/ثوابت خفيفة لـ chunk scope — بلا مزوّدات UI ثقيلة (executionDashboardRuntimeChunkScope) */
import { motion, AnimatePresence } from 'motion/react';
import { CalendarBridge } from '@/app/services/calendarBridge';
import {
    X, User, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Calendar, FileText, FolderOpen, Scale,
    Clock, AlertCircle, CheckCircle, Users, Bell,
    Activity, Trash2,
    Book, History, Phone, MapPin, Pencil, Bot,
    Wallet, CreditCard, Shield,
    XCircle, Pause, Play, Car, ClipboardList, Building2, Package, AlertTriangle,
    Forward, Shuffle, RefreshCw, MessageSquare
} from '@/app/components/ui/lucideIcons';
import {
    AR_TABLIGH_RAQM,
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
    EXEC_SECTION_LAZY_FALLBACK,
    PartyOverflowToggle,
} from './executionDashboardLazyShellUi';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
    HAMI_APPEND_EXECUTION_TIMELINE,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';

export const EXECUTION_DASHBOARD_STATIC_CHUNK_SCOPE = {
    AR_TABLIGH_RAQM,
    Activity,
    AlertCircle,
    AlertTriangle,
    AnimatePresence,
    Bell,
    Book,
    Bot,
    Building2,
    Calendar,
    CalendarBridge,
    Car,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ClipboardList,
    Clock,
    CreditCard,
    DollarSign,
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
    EXEC_OVERLAY_LAZY_FALLBACK,
    EXEC_SECTION_LAZY_FALLBACK,
    FileText,
    FolderOpen,
    Forward,
    HAMI_APPEND_EXECUTION_TIMELINE,
    History,
    MapPin,
    MessageSquare,
    Package,
    PartyOverflowToggle,
    Pause,
    Pencil,
    Phone,
    Play,
    RefreshCw,
    Scale,
    Shield,
    Shuffle,
    Trash2,
    User,
    Users,
    Wallet,
    X,
    XCircle,
} as const;

export function spreadExecutionDashboardStaticChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_STATIC_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
