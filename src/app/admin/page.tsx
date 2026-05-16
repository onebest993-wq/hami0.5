import React from "react";
import { AdminLawEntry } from "@/app/components/admin/AdminLawEntry";
import { ChevronRight } from "lucide-react";

export interface AdminLawLibraryPageProps {
    /** عند الربط مع `App.tsx`: العودة إلى لوحة الإدارة */
    onBack?: () => void;
}

/**
 * صفحة إدارة المكتبة القانونية الذكية (إدخال مواد عبر دالة `add-law`).
 * مكوّن عميل: يعتمد على `AdminLawEntry` (حالة وطلبات شبكة).
 */
export default function AdminLawLibraryPage({
    onBack,
}: AdminLawLibraryPageProps) {
    return (
        <div
            dir="rtl"
            className="min-h-screen w-full bg-[#05060D] text-white"
        >
            <div
                className="pointer-events-none fixed inset-0 opacity-40"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(230, 198, 115, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(10, 15, 28, 0.9), transparent)",
                }}
                aria-hidden
            />

            <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 md:py-10">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mb-6 flex w-fit items-center gap-1 rounded-lg border border-[#E6C673]/25 bg-[#0A0F1C]/80 px-3 py-2 text-sm text-[#E6C673] transition hover:border-[#E6C673]/45 hover:bg-[#E6C673]/10"
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                        العودة إلى لوحة الإدارة
                    </button>
                )}

                <header className="mb-8 text-center md:mb-10">
                    <h1 className="text-balance text-xl font-extrabold tracking-tight text-white sm:text-2xl md:text-3xl">
                        لوحة تحكم حامي — إدارة المكتبة القانونية الذكية
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-gray-400 md:text-base">
                        أدخل النص الحرفي للمواد ليتم تضمينها وتخزينها في قاعدة
                        البيانات للبحث الدلالي لاحقاً.
                    </p>
                </header>

                <div className="flex flex-1 flex-col items-center justify-center pb-8">
                    <AdminLawEntry className="w-full shadow-2xl shadow-black/40" />
                </div>
            </div>
        </div>
    );
}
