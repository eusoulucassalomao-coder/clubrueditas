import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Send, X } from 'lucide-react';
import { FidApiError, fidApi } from '../api/fid';
import { openExternal } from '../config/links';
import {
  brainChips,
  brainFooter,
  brainPlaceholder,
  brainReply,
  brainWelcome,
  newBrainState,
} from '../lib/assistantBrain';
import {
  formatNumber,
  formatTemplate,
  TranslationDictionary,
} from '../i18n/translations';
import { AssistantMessage, Language, MemberProfile, RewardDefinition, TabId } from '../types';

interface VirtualAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfile;
  rewards: RewardDefinition[];
  language: Language;
  t: TranslationDictionary;
  onNavigate: (tab: TabId) => void;
  onOpenRegister: () => void;
}

type MessageAction = NonNullable<AssistantMessage['actions']>[number];
type Reply = Pick<AssistantMessage, 'text' | 'actions'>;

function getTimeLabel(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

export const VirtualAssistantDrawer: React.FC<VirtualAssistantDrawerProps> = ({
  isOpen,
  onClose,
  member,
  rewards,
  language,
  t,
  onNavigate,
  onOpenRegister,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const brainState = useRef(newBrainState());

  // Saudação inicial (muda com o idioma e com o fato de a pessoa ter conta)
  useEffect(() => {
    brainState.current = newBrainState();
    setMessages([
      {
        id: `welcome-${language}-${member.isGuest ? 'g' : 'm'}`,
        sender: 'assistant',
        text: brainWelcome(language, !!member.isGuest, member.firstName),
        timestamp: getTimeLabel(t.locale),
      },
    ]);
  }, [language, member.isGuest, member.firstName, t.locale]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      const timer = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, messages.length, isTyping]);

  if (!isOpen) return null;

  const generateReply = async (rawInput: string): Promise<Reply> => {
    const clean = rawInput.trim();
    const upper = clean.toUpperCase();

    // Código de sócio (ex.: ANA123): consulta real no banco do clube
    const codeMatch = upper.match(/\b[A-Z]{2,4}\d{3,5}\b/);
    if (codeMatch) {
      try {
        const found = await fidApi.lookupCode(codeMatch[0]);
        const next = rewards.find((r) => r.pointsRequired > found.customer.points);
        const text = next
          ? formatTemplate(t.assistant.replyPointsFound, {
              name: found.customer.name,
              code: found.customer.code,
              points: formatNumber(found.customer.points, language),
              target: formatNumber(next.pointsRequired, language),
              remaining: formatNumber(next.pointsRequired - found.customer.points, language),
            })
          : `${found.customer.name}: ${formatNumber(found.customer.points, language)} ${t.common.pointsShort}.`;
        return {
          text,
          actions: [{ type: 'navigate-rewards', label: t.assistant.actionViewRewards }],
        };
      } catch (error) {
        if (error instanceof FidApiError && error.code === 'customer-not-found') {
          return { text: formatTemplate(t.assistant.replyCodeNotFound, { code: codeMatch[0] }) };
        }
        return { text: t.common.connectionError };
      }
    }

    return brainReply(
      rawInput,
      {
        lang: language,
        isGuest: !!member.isGuest,
        firstName: member.firstName,
        points: member.points,
        rewards: rewards.map((r) => ({ title: r.title ?? r.id, pointsRequired: r.pointsRequired })),
      },
      brainState.current
    );
  };

  const handleSend = (textToSend?: string) => {
    const content = (textToSend ?? inputValue).trim();
    if (!content || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: getTimeLabel(t.locale),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    void generateReply(content)
      .then((reply) => {
        const assistantMsg: AssistantMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: reply.text,
          actions: reply.actions,
          timestamp: getTimeLabel(t.locale),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .finally(() => setIsTyping(false));
  };

  const handleMessageAction = (action: MessageAction) => {
    if (action.type === 'open-url' && action.url) {
      openExternal(action.url);
      return;
    }
    onClose();
    if (action.type === 'navigate-rewards') onNavigate('rewards');
    else if (action.type === 'navigate-points') onNavigate('points');
    else if (action.type === 'open-register') onOpenRegister();
  };

  const quickPrompts = brainChips(language, !!member.isGuest).map((label) => ({
    label,
    value: label,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1F281B]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={t.assistant.title}
    >
      {/* Backdrop click to dismiss */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      {/* Conversation Drawer */}
      <div className="w-full max-w-md h-full bg-[#FAF7F0] shadow-2xl border-l border-[#E7DFCC] flex flex-col">
        {/* Header with Waving Hand (NO robot icon) */}
        <div className="px-5 py-4 bg-[#4A5D3F] text-[#FAF7F0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF7F0]/15 flex items-center justify-center shrink-0">
              <span className="wave-hand-once text-2xl leading-none" role="img" aria-hidden="true">
                👋
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold leading-tight truncate">
                {t.assistant.title}
              </h2>
              <p className="text-xs text-[#FAF7F0]/80 truncate mt-0.5">
                {t.assistant.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#FAF7F0]/85 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-[#4A5D3F] text-[#FAF7F0] rounded-br-md'
                      : 'bg-white text-[#1F281B] border border-[#E7DFCC] rounded-bl-md'
                  }`}
                >
                  {msg.text}

                  {msg.actions?.map((action) => (
                    <button
                      key={`${action.type}-${action.label}`}
                      type="button"
                      onClick={() => handleMessageAction(action)}
                      className="mt-3 w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-[#EAEFE5] hover:bg-[#dce5d4] text-[#293622] text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[#6B7365] mt-1 px-1 tabular-nums">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-bl-md bg-white border border-[#E7DFCC] px-4 py-3 text-sm text-[#5A6353]">
                {t.common.loading}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Interactive Suggestion Buttons */}
        <div className="px-4 pt-3 pb-2 border-t border-[#E7DFCC] bg-[#FAF7F0]">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => handleSend(prompt.value)}
                disabled={isTyping}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D8CEB8] hover:border-[#4A5D3F] hover:bg-[#F4F7F0] text-xs font-medium text-[#293622] transition-colors whitespace-nowrap"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={brainPlaceholder(language)}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-white border border-[#D8CEB8] text-sm text-[#1F281B] placeholder:text-[#7B8275] focus:outline-none focus:border-[#4A5D3F]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              aria-label={t.assistant.sendAria}
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#4A5D3F] hover:bg-[#38492F] disabled:opacity-45 text-[#FAF7F0] flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-[#6B7365] text-center mt-2.5">
            {brainFooter(language)}
          </p>
        </div>
      </div>
    </div>
  );
};
