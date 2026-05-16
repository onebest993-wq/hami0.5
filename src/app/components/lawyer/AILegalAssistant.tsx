import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, FileText, Loader2, AlertCircle } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from '@/app/lib/supabase-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AILegalAssistantProps {
  onInsertToDraft: (text: string) => void;
}

export const AILegalAssistant: React.FC<AILegalAssistantProps> = ({ onInsertToDraft }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 السلام عليكم، أنا مساعدك القانوني الذكي المتخصص في القانون المدني العراقي رقم (40) لسنة 1951 وتعديلاته.\n\nيمكنني مساعدتك في:\n• صياغة بنود عقدية محكمة\n• تحليل المخاطر القانونية\n• اقتراح شروط وقائية\n• الإجابة على استفسارات قانونية\n\nكيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const callGateway = useCallback(async (userMessage: string): Promise<string> => {
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));
    const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>(
      'gemini-chat',
      { body: { prompt: userMessage, messages: history } }
    );
    if (error) {
      if (error instanceof FunctionsHttpError) {
        try {
          const body = (await error.context.json()) as { error?: unknown };
          if (typeof body.error === 'string' && body.error.trim()) throw new Error(body.error);
        } catch {
          /* no-op */
        }
      }
      throw new Error(error.message || 'فشل الاتصال ببوابة الذكاء.');
    }
    if (!data) throw new Error('لم تُرجع البوابة أي محتوى.');
    if (typeof data.error === 'string' && data.error.trim()) throw new Error(data.error);
    if (typeof data.text === 'string' && data.text.trim()) return data.text;
    return 'عذراً، لم أتمكن من توليد رد.';
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const aiResponse = await callGateway(input.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      console.error('AI Error:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, callGateway]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600/20 to-purple-600/20 border-b border-slate-700/50 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              المساعد القانوني الذكي
              <Sparkles size={14} className="text-yellow-400" />
            </h3>
            <p className="text-white/60 text-xs">مدعوم بالقانون المدني العراقي</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-sm'
                      : 'bg-slate-800/80 text-white rounded-tl-sm border border-slate-700/50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Insert Button for AI responses */}
                {message.role === 'assistant' && message.id !== 'welcome' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onInsertToDraft(message.content)}
                    className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs font-medium transition-all"
                  >
                    <FileText size={14} />
                    إدراج في المسودة
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">جارٍ التفكير...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-red-900/20 border border-red-500/30 rounded-lg p-3"
          >
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-300 text-sm font-medium">حدث خطأ</p>
              <p className="text-red-400/80 text-xs mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 p-3 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب سؤالك القانوني هنا..."
            disabled={isLoading}
            className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-blue-500/50"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </motion.button>
        </div>
        <p className="text-white/30 text-[10px] mt-2 text-center">
          المساعد القانوني يعمل بتقنية GPT-4 ومُدرب على القانون المدني العراقي
        </p>
      </div>
    </div>
  );
};

export default AILegalAssistant;