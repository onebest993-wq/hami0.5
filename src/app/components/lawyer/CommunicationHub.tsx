import React, { useState, useRef, useEffect } from 'react';
import logger from '@/app/utils/logger';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import type { CommunicationHubProps } from '@/app/types/common';
import type { HubChatMessage } from './CommunicationHub/types';
import { normalizeRetrievedChunks, fileToBase64 } from './CommunicationHub/utils';
import { Header } from './CommunicationHub/Header';
import { ScenarioBar } from './CommunicationHub/ScenarioBar';
import { ChatArea } from './CommunicationHub/ChatArea';
import { InputBar } from './CommunicationHub/InputBar';

export const CommunicationHub = ({ onClose, startDemo = false, contextFile = null }: CommunicationHubProps) => {
    const [messages, setMessages] = useState<HubChatMessage[]>([
        {
            id: 'hami-intro-msg',
            role: 'model',
            content: 'أهلاً بك أستاذ. أنا "حامي"، مستشارك القانوني الرقمي. أعتمد على أحدث التشريعات العراقية (بما فيها تعديلات 2026). كيف يمكنني مساعدتك اليوم؟',
            sources: []
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFrame, setLoadingFrame] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateId = () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

    useEffect(() => {
        if (!isLoading) return;
        const id = window.setInterval(() => {
            setLoadingFrame((prev) => (prev + 1) % 4);
        }, 450);
        return () => window.clearInterval(id);
    }, [isLoading]);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: formData
            });
            return await response.json();
        } catch (error) {
            logger.error("Upload failed:", error);
            return null;
        }
    };

    const sendMessage = async (text: string, isAction = false, fileData: Record<string, unknown> | null = null) => {
        if ((!text.trim() && !isAction && !fileData) || isLoading) return;

        if (!fileData) {
            const userMsg: HubChatMessage = { id: generateId(), role: 'user', content: text };
            setMessages(prev => [...prev, userMsg]);
        }

        if (!isAction) setInput('');
        setIsLoading(true);

        try {
            const validHistory = messages
                .filter(m => m.id !== 'hami-intro-msg' && !m.isError)
                .map(m => ({ role: m.role, content: m.content }));

            const prompt = text || (fileData ? "يرجى تحليل الملف المرفق وفق النص الوصفي المتاح." : "");
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/gemini-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'apikey': publicAnonKey,
                },
                body: JSON.stringify({ prompt, messages: validHistory }),
            });
            let data: {
                text?: string;
                error?: string;
                model?: string;
                isFallback?: boolean;
                rag?: { retrievedChunks?: unknown };
            } | null = null;
            try {
                data = await response.json();
            } catch {
                data = null;
            }
            if (!response.ok) {
                throw new Error(data?.error || `فشل الاتصال ببوابة الذكاء (${response.status}).`);
            }
            if (!data) throw new Error('لم تُرجع البوابة أي محتوى.');
            if (typeof data.error === 'string' && data.error.trim()) throw new Error(data.error);

            const aiMsg: HubChatMessage = {
                id: generateId(),
                role: 'model',
                content: data.text || "عذراً، لم أتمكن من قراءة الرد. حاول مرة أخرى.",
                isDocument: false,
                isFallback: !!data.isFallback,
                retrievedChunks: normalizeRetrievedChunks(data.rag?.retrievedChunks),
                sources: [],
                actions: [],
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            logger.error("AI Error:", error);
            const err = error instanceof Error ? error : new Error(String(error));
            const isKeyError = err.message.includes("API Key") || err.toString().includes("API Key");
            const isQuotaError = err.message.includes("429") || err.message.includes("quota") || err.toString().includes("429");

            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'model' as const,
                content: isKeyError
                    ? `⚠️ **تنبيه أمني:** لم يتم العثور على إعداد API صالح في الخادم.`
                    : isQuotaError
                        ? `⚠️ **تنبيه:** الخدمة الذكية تحت ضغط مرتفع حالياً.\nيرجى إعادة المحاولة بعد لحظات.`
                        : `عذراً، حدث خطأ تقني:\n${err.message}`,
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsLoading(true);

            const uploadResult = await uploadFile(file);
            const base64 = await fileToBase64(file);

            const userMsg: HubChatMessage = {
                id: generateId(),
                role: 'user',
                content: `[ملف مرفق: ${file.name}]`,
                isFile: true,
                fileUrl: uploadResult?.url,
                fileType: file.type
            };
            setMessages(prev => [...prev, userMsg]);

            await sendMessage("", false, {
                data: base64,
                mime_type: file.type,
                name: file.name
            });

            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleActionClick = (actionId: string, label: string) => {
        sendMessage(label, true);
    };

    const handleCopyMessage = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.success('تم نسخ الرد إلى الحافظة');
        } catch {
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.error('تعذر النسخ على هذا الجهاز');
        }
    };

    const handleShareMessage = async (text: string) => {
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({
                    title: 'رد حامي القانوني',
                    text,
                });
                return;
            }
            await navigator.clipboard.writeText(text);
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.success('تم نسخ الرد للمشاركة');
        } catch {
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.error('تعذرت المشاركة حالياً');
        }
    };

    const runScenario = (scenarioId: number) => {
        if (isLoading) return;
        setIsLoading(true);

        if (scenarioId === 1) {
            const userText = "موكلي اشترى سيارة وظهر فيها عيب بالمحرك، والبائع يرفض استرجاعها. هل أقدم شكوى في مركز الشرطة بتهمة الاحتيال؟";
            setMessages(prev => [...prev, { id: generateId(), role: 'user' as const, content: userText }]);

            setTimeout(() => {
                const aiResponse = "أستاذي الكريم، بناءً على الوقائع، هذه الحادثة تكييفها مدني (ضمان العيوب الخفية) ولا ترقى لتكون جريمة احتيال (جزائية) لانتفاء ركن 'الطرق الاحتيالية' ومظاهرها الخارجية.\n\nالتكييف القانوني: دعوى فسخ عقد وطلب تعويض.\nالسند القانوني: المواد (558 - 570) من القانون المدني العراقي رقم 40 لسنة 1951.\nالإجراء المقترح: توجيه إنذار عبر الكاتب العدل أولاً، ثم إقامة الدعوى في محكمة البداءة، بدلاً من استهلاك الوقت في محكمة التحقيق حيث سيقرر القاضي غلق الدعوى لمدنيتها.";
                setMessages(prev => [...prev, { id: generateId(), role: 'model' as const, content: aiResponse, isDemo: true }]);
                setIsLoading(false);
            }, 1500);
        } else if (scenarioId === 2) {
            const userText = "اكتب لي عريضة دعوى طلاق للضرر لسوء المعاشرة.";
            setMessages(prev => [...prev, { id: generateId(), role: 'user' as const, content: userText }]);

            setTimeout(() => {
                const aiResponse = `السيد قاضي محكمة الأحوال الشخصية في (الكرادة) المحترم\nالمدعية: ...... / وكيلها المحامي ......\nالمدعى عليه: ...... / العنوان ......\nجهة الدعوى: بتاريـخ --/--/---- تـم عـقـد زواج مـوكلتـي بالمدعى عـليـه بموجب عقد زواج مصدق. وحيث أن المدعى عليه دأب مؤخراً على الإضرار بموكلتي (جسدياً ومعنوياً) بما يتعذر معه استمرار الحياة الزوجية، وذلك مخالف لأحكام الشرع والقانون.\nالطلب: عليه نطلب دعوة المدعى عليه للمرافعة والحكم بالتفريق القضائي للضرر استناداً لأحكام المادة (40) من قانون الأحوال الشخصية رقم 188 لسنة 1959 المعدل.\nالأدلة: 1. عقد الزواج / 2. التقارير الطبية / 3. شهادة الشهود.\nو. المدعية`;
                setMessages(prev => [...prev, { id: generateId(), role: 'model' as const, content: aiResponse, isDocument: true }]);
                setIsLoading(false);
            }, 2000);
        }
    };

    const handleSend = () => {
        sendMessage(input);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#0A0F1C] flex flex-col overflow-hidden">
            <Header onClose={onClose} />

            <ScenarioBar onRunScenario={runScenario} />

            <ChatArea
                messages={messages}
                isLoading={isLoading}
                loadingFrame={loadingFrame}
                onCopy={handleCopyMessage}
                onShare={handleShareMessage}
                onActionClick={handleActionClick}
            />

            <InputBar
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                onSend={handleSend}
                onFileSelect={handleFileSelect}
                onFileClick={() => fileInputRef.current?.click()}
                fileInputRef={fileInputRef}
            />
        </div>
    );
};
