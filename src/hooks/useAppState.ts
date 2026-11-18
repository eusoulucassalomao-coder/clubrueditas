import { useCallback, useEffect, useState } from 'react';
import { HistoryEntry, Language, MemberProfile, RewardDefinition } from '../types';
import { fidApi } from '../services/fidApi';
import { getCookiePreferences } from '../services/cookiePreferences';

const TOKEN_KEY = 'club_la_ruedita_customer_token';
const CODE_KEY = 'club_la_ruedita_customer_code';
const LANGUAGE_KEY = 'club_la_ruedita_language';

const EMPTY_MEMBER: MemberProfile = {
  id: '',
  customerCode: '',
  fullName: '',
  firstName: '',
  email: '',
  phone: '',
  birthDate: '',
  memberSince: '',
  avatarUrl: null,
  points: 0,
  lifetimePoints: 0,
  redeemedPoints: 0,
  nextRewardTarget: 300,
  favoriteBranch: 'La Ruedita',
  whatsappOptIn: false,
  notificationsPreviewEnabled: false,
};

function getNextTarget(points: number, rewards: RewardDefinition[]): number {
  const next = rewards.map((reward) => reward.pointsRequired).filter((value) => value > points).sort((a, b) => a - b)[0];
  return next ?? rewards.map((reward) => reward.pointsRequired).sort((a, b) => a - b).at(-1) ?? 300;
}

function mapRewards(config: any): RewardDefinition[] {
  const rows = Array.isArray(config?.rewards) ? config.rewards : [];
  return rows.map((item: any, index: number) => {
    const name = String(item.name || item.id || 'Beneficio');
    const lower = name.toLowerCase();
    const category: RewardDefinition['category'] = lower.includes('postre') || lower.includes('molleja') || lower.includes('entrada')
      ? 'experiences'
      : lower.includes('descuento')
        ? 'boutique'
        : lower.includes('café') || lower.includes('cafe')
          ? 'cafe'
          : 'bakery';
    const image = String(item.img || 'assets/logo.webp').replace(/^\//, '');
    return {
      id: String(item.id || `reward-${index}`),
      title: name,
      shortDesc: String(item.note || ''),
      fullDesc: String(item.note || ''),
      pointsRequired: Number(item.pts || 0),
      category,
      imageUrl: `/${image}`,
      featured: index < 3,
      codePrefix: String(item.id || 'PREMIO').toUpperCase(),
    };
  }).filter((item: RewardDefinition) => item.pointsRequired > 0);
}

function mapHistory(data: any): HistoryEntry[] {
  const ledger: HistoryEntry[] = (data.history || []).filter((entry: any) => entry.type !== 'canje').map((entry: any, index: number) => {
    const points = Number(entry.points || 0);
    return {
      id: `ledger-${index}-${entry.created_at || ''}`,
      type: points >= 0 ? 'earned' : 'used',
      pointsDelta: points,
      dateIso: String(entry.created_at || '').slice(0, 10),
      customTitle: String(entry.note || (points >= 0 ? 'Puntos recibidos' : 'Puntos utilizados')),
      customDescription: String(entry.type || ''),
    };
  });
  const redemptions: HistoryEntry[] = (data.redemptions || []).map((entry: any, index: number) => ({
    id: `redemption-${index}-${entry.code || ''}`,
    type: 'redeemed',
    pointsDelta: -Math.abs(Number(entry.points || 0)),
    dateIso: String(entry.created_at || '').slice(0, 10),
    customTitle: String(entry.name || 'Beneficio canjeado'),
    customDescription: String(entry.status || ''),
    voucherCode: String(entry.code || ''),
  }));
  return [...ledger, ...redemptions].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}

function mapMember(customer: any, rewards: RewardDefinition[]): MemberProfile {
  const fullName = String(customer.name || '');
  const points = Number(customer.points || 0);
  const lifetime = Number(customer.lifetime ?? customer.points ?? 0);
  const createdAt = String(customer.createdAt || customer.created_at || new Date().toISOString());
  return {
    ...EMPTY_MEMBER,
    id: String(customer.id || ''),
    customerCode: String(customer.code || ''),
    fullName,
    firstName: fullName.trim().split(/\s+/)[0] || '',
    phone: String(customer.phone || ''),
    birthDate: String(customer.birthday || ''),
    memberSince: createdAt.slice(0, 7),
    points,
    lifetimePoints: lifetime,
    redeemedPoints: Math.max(0, lifetime - points),
    nextRewardTarget: getNextTarget(points, rewards),
    whatsappOptIn: Boolean(customer.marketingConsent),
  };
}

export function useAppState() {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_KEY) : null;
    return saved === 'pt' || saved === 'en' || saved === 'es' ? saved : 'es';
  });
  const [member, setMember] = useState<MemberProfile>(EMPTY_MEMBER);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rewards, setRewards] = useState<RewardDefinition[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const applyMemberResponse = useCallback((response: any, rewardList = rewards) => {
    const nextMember = mapMember(response.customer || {}, rewardList);
    setMember(nextMember);
    setHistory(mapHistory(response));
    return nextMember;
  }, [rewards]);

  const refreshMember = useCallback(async () => {
    const token = sessionToken || localStorage.getItem(TOKEN_KEY);
    const code = member.customerCode || localStorage.getItem(CODE_KEY) || '';
    if (token) {
      const response = await fidApi.me(token);
      applyMemberResponse(response);
      return;
    }
    if (code) {
      const response = await fidApi.lookupCode(code);
      applyMemberResponse(response);
    }
  }, [sessionToken, member.customerCode, applyMemberResponse]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const configResponse = await fidApi.config();
        const configuredRewards = mapRewards(configResponse.config);
        if (active) setRewards(configuredRewards);

        const token = localStorage.getItem(TOKEN_KEY);
        const savedCode = localStorage.getItem(CODE_KEY);
        if (token) {
          const response = await fidApi.me(token);
          if (active) {
            setSessionToken(token);
            const nextMember = mapMember(response.customer || {}, configuredRewards);
            setMember(nextMember);
            setHistory(mapHistory(response));
          }
        } else if (savedCode) {
          const response = await fidApi.lookupCode(savedCode);
          if (active) {
            setMember(mapMember(response.customer || {}, configuredRewards));
            setHistory(mapHistory(response));
          }
        }
      } catch (error) {
        if (active) setApiError(error instanceof Error ? error.message : 'Não foi possível carregar seus dados.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  const updateMember = useCallback((patch: Partial<MemberProfile>) => {
    setMember((previous) => ({ ...previous, ...patch }));
  }, []);

  const registerDemoAccount = useCallback(async (payload: {
    fullName: string;
    phone: string;
    birthDate: string;
  }): Promise<MemberProfile> => {
    setApiError('');
    const preferences = getCookiePreferences();
    const response = await fidApi.register({
      name: payload.fullName.trim(),
      phone: payload.phone,
      birthday: payload.birthDate,
      waConsent: preferences?.marketing === true,
    });
    if (!response.token) throw new Error('O cadastro foi criado, mas não recebemos a chave de acesso. Entre em contato com a loja.');
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(CODE_KEY, String(response.customer?.code || ''));
    setSessionToken(response.token);
    const detail = await fidApi.me(response.token);
    return applyMemberResponse(detail);
  }, [applyMemberResponse]);

  const lookupByCode = useCallback(async (code: string) => {
    setApiError('');
    const cleanCode = code.trim().toUpperCase();
    const response = await fidApi.lookupCode(cleanCode);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(CODE_KEY, cleanCode);
    setSessionToken(null);
    applyMemberResponse(response);
    return response.customer;
  }, [applyMemberResponse]);

  const simulateRedeemReward = useCallback(async (rewardId: string): Promise<string | null> => {
    if (!member.customerCode) return null;
    const token = sessionToken || localStorage.getItem(TOKEN_KEY);
    const response = token
      ? await fidApi.claim(token, rewardId)
      : await fidApi.claimByCode(member.customerCode, rewardId);
    const code = String(response.redemption?.code || response.redemption?.voucher || '');
    try { await refreshMember(); } catch { /* Keep the confirmed redemption code visible even if refresh fails. */ }
    return code || null;
  }, [member.customerCode, sessionToken, refreshMember]);

  const updateMarketingPreference = useCallback(async (allowed: boolean) => {
    const token = sessionToken || localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const response = await fidApi.marketingPreference(token, allowed);
    if (response.customer) {
      setMember((previous) => ({
        ...previous,
        whatsappOptIn: Boolean(response.customer.marketingConsent),
      }));
    }
  }, [sessionToken]);

  const switchBackToMaria = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CODE_KEY);
    setSessionToken(null);
    setMember(EMPTY_MEMBER);
    setHistory([]);
  }, []);

  const resetDemoData = switchBackToMaria;

  return {
    language,
    member,
    history,
    rewards,
    milestones: rewards.map((reward) => reward.pointsRequired).sort((a, b) => a - b),
    sessionToken,
    loading,
    apiError,
    hasMember: Boolean(member.customerCode),
    setLanguage,
    updateMember,
    simulateRedeemReward,
    registerDemoAccount,
    lookupByCode,
    refreshMember,
    updateMarketingPreference,
    switchBackToMaria,
    resetDemoData,
  };
}
