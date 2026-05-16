/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👥 ExecutionPartiesSection - Parties Management Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays and manages creditors and debtors in execution file
 * يعرض ويدير الدائنين والمدينين في ملف التنفيذ
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Users,
    User,
    Phone,
    MapPin,
    ChevronDown,
    ChevronUp,
    Edit2,
    Trash2,
    Plus,
    AlertCircle,
    Contact,
    Link,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/app/components/ui/tooltip';
import type { Party } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionPartiesSectionProps {
    creditors: Party[];
    debtors: Party[];
    expandedParties?: Record<string, boolean>;
    onToggleParty?: (partyId: string) => void;
    onEditParty?: (party: Party) => void;
    onDeleteParty?: (partyId: string) => void;
    onAddCreditor?: () => void;
    onAddDebtor?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTY CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PartyCardProps {
    party: Party;
    type: 'creditor' | 'debtor';
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit?: (party: Party) => void;
    onDelete?: (partyId: string) => void;
    creditors?: Party[];
    debtors?: Party[];
}

const PartyCard: React.FC<PartyCardProps> = ({ 
    party, 
    type, 
    index,
    isExpanded, 
    onToggle, 
    onEdit, 
    onDelete,
    creditors = [],
    debtors = []
}) => {
    const rel = party.kinship || party.relation;
    const kinshipText = rel
        ? (() => {
              if (type === 'creditor' && party.linkedDebtorId != null && String(party.linkedDebtorId) !== '') {
                  const lid = party.linkedDebtorId;
                  const linked = debtors.find((d) => String(d.id) === String(lid));
                  return linked ? `صلة القرابة: ${rel} (${linked.name})` : `صلة القرابة: ${rel}`;
              }
              return `صلة القرابة: ${rel}`;
          })()
        : '';
    const typeConfig = {
        creditor: {
            title: 'دائن',
            color: 'border-green-500/30 bg-green-500/5',
            iconColor: 'text-green-400',
            badgeColor: 'bg-green-500/20 text-green-400'
        },
        debtor: {
            title: 'مدين',
            color: 'border-red-500/30 bg-red-500/5',
            iconColor: 'text-red-400',
            badgeColor: 'bg-red-500/20 text-red-400'
        }
    };

    const config = typeConfig[type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`border rounded-xl overflow-hidden ${config.color}`}
        >
            {/* Header */}
            <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-navy-800 border border-navy-700 rounded-lg flex items-center justify-center ${config.iconColor}`}>
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
                                <span className="text-gray-400 font-mono text-sm">{index + 1}-</span>
                                <span>{party.name}</span>
                                {kinshipText && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center cursor-help">
                                                <Link className="w-4 h-4 text-amber-400 hover:text-amber-300 flex-shrink-0" />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="bg-navy-800/95 backdrop-blur-xl border border-amber-500/30 text-amber-100 text-xs max-w-[220px]">
                                            {kinshipText}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                                {config.title}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button type="button"
                                onClick={() => onEdit(party)}
                                className="w-8 h-8 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                        )}
                        {onDelete && (
                            <button type="button"
                                onClick={() => onDelete(String(party.id))}
                                className="w-8 h-8 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                        )}
                        <button type="button"
                            onClick={onToggle}
                            className="w-8 h-8 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg flex items-center justify-center transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    {party.nationalId && (
                        <div className="flex items-center gap-1.5">
                            <Contact className="w-4 h-4" />
                            <span>{party.nationalId}</span>
                        </div>
                    )}
                    {party.phone && (
                        <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            <span dir="ltr">{party.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-navy-700 bg-navy-900/30 p-4"
                    >
                        <div className="space-y-3">
                            {/* Address */}
                            {party.address && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs text-gray-500">العنوان</span>
                                    </div>
                                    <p className="text-sm text-white">{party.address}</p>
                                </div>
                            )}

                            {/* Age */}
                            {party.age && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">العمر</span>
                                    <span className="text-sm text-white">{party.age} سنة</span>
                                </div>
                            )}

                            {/* Kinship */}
                            {(party.kinship || party.relation) && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">القرابة</span>
                                    <span className="text-sm text-white">
                                        {party.kinship || party.relation}
                                    </span>
                                </div>
                            )}

                            {/* Notes */}
                            {party.notes && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs text-gray-500">ملاحظات</span>
                                    </div>
                                    <p className="text-sm text-gray-300 bg-navy-800/50 p-2 rounded-lg">
                                        {party.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ExecutionPartiesSection = React.memo<ExecutionPartiesSectionProps>(({
    creditors = [],
    debtors = [],
    expandedParties = {},
    onToggleParty,
    onEditParty,
    onDeleteParty,
    onAddCreditor,
    onAddDebtor
}) => {
    const [filterType, setFilterType] = React.useState<'all' | 'creditors' | 'debtors'>('all');

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    const handleToggleParty = (partyId: string) => {
        if (onToggleParty) {
            onToggleParty(partyId);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    const totalParties = creditors.length + debtors.length;

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">الأطراف</h3>
                        <p className="text-sm text-gray-400">{totalParties} طرف في الملف</p>
                    </div>
                </div>

                {/* Add Party Button */}
                {onAddCreditor && (
                    <button type="button"
                        onClick={onAddCreditor}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-gold-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>إضافة طرف</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-navy-900/50 p-1 rounded-xl border border-navy-700">
                <button type="button"
                    onClick={() => setFilterType('all')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'all'
                            ? 'bg-gold-500 text-navy-900'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    الكل ({totalParties})
                </button>
                <button type="button"
                    onClick={() => setFilterType('creditors')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'creditors'
                            ? 'bg-gold-500 text-navy-900'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    الدائنين ({creditors.length})
                </button>
                <button type="button"
                    onClick={() => setFilterType('debtors')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        filterType === 'debtors'
                            ? 'bg-gold-500 text-navy-900'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    المدينين ({debtors.length})
                </button>
            </div>

            {/* Parties List */}
            <div className="space-y-3">
                {/* Creditors */}
                {(filterType === 'all' || filterType === 'creditors') && creditors.length > 0 && (
                    <div className="space-y-2">
                        {filterType === 'all' && (
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">الدائنين</h4>
                        )}
                        {creditors.map((creditor, idx) => (
                            <PartyCard
                                key={creditor.id}
                                party={creditor}
                                type="creditor"
                                index={idx}
                                isExpanded={expandedParties[String(creditor.id)] || false}
                                onToggle={() => handleToggleParty(String(creditor.id))}
                                onEdit={onEditParty}
                                onDelete={onDeleteParty}
                                creditors={creditors}
                                debtors={debtors}
                            />
                        ))}
                    </div>
                )}

                {/* Debtors */}
                {(filterType === 'all' || filterType === 'debtors') && debtors.length > 0 && (
                    <div className="space-y-2">
                        {filterType === 'all' && (
                            <h4 className="text-sm font-semibold text-gray-400 mt-4 mb-2">المدينين</h4>
                        )}
                        {debtors.map((debtor, idx) => (
                            <PartyCard
                                key={debtor.id}
                                party={debtor}
                                type="debtor"
                                index={idx}
                                isExpanded={expandedParties[String(debtor.id)] || false}
                                onToggle={() => handleToggleParty(String(debtor.id))}
                                onEdit={onEditParty}
                                onDelete={onDeleteParty}
                                creditors={creditors}
                                debtors={debtors}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {totalParties === 0 && (
                    <div className="text-center py-12 bg-navy-900/30 border border-dashed border-navy-700 rounded-xl">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 mb-4">لا توجد أطراف في الملف</p>
                        {onAddCreditor && (
                            <button type="button"
                                onClick={onAddCreditor}
                                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
                            >
                                إضافة الطرف الأول
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ExecutionPartiesSection;
