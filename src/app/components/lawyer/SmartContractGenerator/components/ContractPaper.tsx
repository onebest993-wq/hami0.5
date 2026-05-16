import React from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'motion/react';
import type { ContractData, ContractDetails } from '../types/types';

interface ContractPaperProps {
    contractData: ContractData;
    contractDetails: ContractDetails;
    isCanvasEmpty: boolean;
    formatArabicDate: (dateStr: string) => string;
    activeShieldsArticles: Array<{ id: string; content: string }>;
    contractSpecificArticles: Array<{ id: string; content: string }>;
    willDefectsClause: string | null;
}

function formatPartyName(party: ContractData['partyOne'], isCompany: boolean) {
    if (isCompany) {
        return (
            <>
                شركة{' '}
                <span className="font-bold text-slate-900 bg-yellow-100 px-2 py-0.5 rounded">
                    {party.name || '..............'}
                </span>
                {' '}(بصفتها{' '}
                <span className="font-semibold">{party.role}</span>
                )، المسجلة بموجب شهادة التسجيل رقم{' '}
                <span className="font-bold bg-slate-100 px-2 py-0.5 rounded">
                    {party.id || '..............'}
                </span>
                ، ومقرها الرئيسي في{' '}
                <span className="font-bold">
                    {party.address || '..............'}
                </span>
                ، ويمثلها في هذا العقد المدير المفوض السيد/ة{' '}
                <span className="font-bold text-slate-900 bg-blue-100 px-2 py-0.5 rounded">
                    {party.representedBy || '..............'}
                </span>
                .
            </>
        );
    }
    return (
        <>
            السيد/ة{' '}
            <span className="font-bold text-slate-900 bg-yellow-100 px-2 py-0.5 rounded">
                {party.name || '..............'}
            </span>
            {' '}(بصفته/ا{' '}
            <span className="font-semibold">{party.role}</span>
            )، يحمل بطاقة وطنية رقم{' '}
            <span className="font-bold bg-slate-100 px-2 py-0.5 rounded">
                {party.id || '..............'}
            </span>
            ، وعنوانه{' '}
            <span className="font-bold">
                {party.address || '..............'}
            </span>
            .
        </>
    );
}

function ContractPaper({
    contractData,
    isCanvasEmpty,
    formatArabicDate,
    activeShieldsArticles,
    contractSpecificArticles,
    willDefectsClause,
}: ContractPaperProps) {
    return (
        <div className="w-full max-w-4xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                id="contract-paper"
                className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-8 sm:p-12 lg:p-16 transition-all duration-300 relative"
                style={{
                    fontFamily: 'Traditional Arabic, Arial, sans-serif',
                    lineHeight: '2.2',
                }}
            >
                {isCanvasEmpty && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 select-none pointer-events-none">
                        <FileText size={120} className="text-slate-300 mb-6" />
                        <h2 className="text-3xl font-bold text-slate-400 text-center px-8 leading-relaxed">
                            سيتم توليد مسودة العقد هنا<br />فور إدخال البيانات...
                        </h2>
                        <div className="mt-4 text-slate-300 text-lg">⚖️</div>
                    </div>
                )}

                {!isCanvasEmpty && (
                    <div className="space-y-8 text-justify" dir="rtl">
                        <div className="text-center border-b-2 border-slate-800 pb-6 mb-10">
                            <h1 className="text-4xl font-bold mb-3 text-slate-900">{contractData.type}</h1>
                            <div className="w-32 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto mt-4 mb-4"></div>
                            <p className="text-sm text-slate-600 mt-4">
                                المبرم في مدينة{' '}
                                <span className="font-bold text-slate-800">
                                    {contractData.location || '..............'}
                                </span>
                                {' '}بتاريخ{' '}
                                <span className="font-bold text-slate-800">
                                    {formatArabicDate(contractData.date)}
                                </span>
                            </p>
                        </div>

                        <div className="text-base leading-loose">
                            <p className="mb-8 text-center text-lg font-semibold text-slate-700 border-y border-slate-300 py-4">
                                بعون الله تعالى، تم الاتفاق والتراضي بين كل من:
                            </p>

                            <div className="mb-8 bg-slate-50 p-6 rounded-lg border-r-4 border-emerald-500">
                                <h2 className="text-xl font-bold mb-4 text-emerald-700 flex items-center gap-2">
                                    <span className="bg-emerald-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                    الطرف الأول:
                                </h2>
                                <p className="leading-loose pr-10">
                                    {formatPartyName(contractData.partyOne, contractData.partyOne.entity === 'شركة')}
                                </p>
                            </div>

                            <div className="mb-8 bg-slate-50 p-6 rounded-lg border-r-4 border-purple-500">
                                <h2 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2">
                                    <span className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                                    الطرف الثاني:
                                </h2>
                                <p className="leading-loose pr-10">
                                    {formatPartyName(contractData.partyTwo, contractData.partyTwo.entity === 'شركة')}
                                </p>
                            </div>

                            <p className="text-center text-sm italic text-slate-600 mt-8 border-t border-b border-slate-300 py-3">
                                وقد اتفق الطرفان، وهما بكامل أهليتهما القانونية، على ما يلي:
                            </p>

                            {willDefectsClause && (
                                <div className="mt-6 p-5 bg-purple-50 border-r-4 border-purple-500 rounded-lg">
                                    <p className="text-sm leading-relaxed text-purple-900">
                                        <strong className="text-purple-700">إقرار خاص:</strong>{' '}
                                        {willDefectsClause}
                                    </p>
                                </div>
                            )}
                        </div>

                        {(activeShieldsArticles.length > 0 || contractSpecificArticles.length > 0) && (
                            <div className="mt-10">
                                <h2 className="text-2xl font-bold text-center mb-8 text-slate-800 border-b-2 border-emerald-600 pb-3">
                                    الأحكام العامة
                                </h2>
                            </div>
                        )}

                        {activeShieldsArticles.map((article) => (
                            <div key={article.id} className="mb-8">
                                <div className="bg-gradient-to-l from-emerald-50 to-transparent p-6 rounded-lg border-r-4 border-emerald-600">
                                    <p className="text-base leading-loose text-justify">
                                        {article.content}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {contractSpecificArticles.map((article) => (
                            <div key={article.id} className="mb-8">
                                <div className="bg-gradient-to-l from-cyan-50 to-transparent p-6 rounded-lg border-r-4 border-cyan-600">
                                    <p className="text-base leading-loose text-justify">
                                        {article.content}
                                    </p>
                                </div>
                            </div>
                        ))}

                        <div className="mt-20 pt-8 border-t-2 border-slate-300">
                            <div className="grid grid-cols-2 gap-8 text-center">
                                <div className="space-y-16">
                                    <div>
                                        <p className="text-lg font-bold text-slate-800 mb-2">
                                            توقيع {contractData.partyOne.role}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {contractData.partyOne.name || '..............'}
                                        </p>
                                    </div>
                                    <div className="border-b-2 border-slate-400 w-48 mx-auto"></div>
                                </div>
                                <div className="space-y-16">
                                    <div>
                                        <p className="text-lg font-bold text-slate-800 mb-2">
                                            توقيع {contractData.partyTwo.role}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {contractData.partyTwo.name || '..............'}
                                        </p>
                                    </div>
                                    <div className="border-b-2 border-slate-400 w-48 mx-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default ContractPaper;
