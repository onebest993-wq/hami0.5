/** أيقونات/ثوابت خفيفة لـ chunk scope — بلا مزوّدات UI ثقيلة (executionDashboardRuntimeChunkScope) */
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { CalendarBridge } from '@/app/services/calendarBridge';
import { X } from '@/app/components/ui/icons/X';
import { User } from '@/app/components/ui/icons/User';
import { DollarSign } from '@/app/components/ui/icons/DollarSign';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { FileText } from '@/app/components/ui/icons/FileText';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Clock } from '@/app/components/ui/icons/Clock';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Users } from '@/app/components/ui/icons/Users';
import { Bell } from '@/app/components/ui/icons/Bell';
import { Activity } from '@/app/components/ui/icons/Activity';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Book } from '@/app/components/ui/icons/Book';
import { History } from '@/app/components/ui/icons/History';
import { Phone } from '@/app/components/ui/icons/Phone';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Bot } from '@/app/components/ui/icons/Bot';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { Shield } from '@/app/components/ui/icons/Shield';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import { Pause } from '@/app/components/ui/icons/Pause';
import { Play } from '@/app/components/ui/icons/Play';
import { Car } from '@/app/components/ui/icons/Car';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Package } from '@/app/components/ui/icons/Package';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { Forward } from '@/app/components/ui/icons/Forward';
import { Shuffle } from '@/app/components/ui/icons/Shuffle';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { MessageSquare } from '@/app/components/ui/icons/MessageSquare';
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
