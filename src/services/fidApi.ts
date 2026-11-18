const API_URL = '/api/fid';
const RESTAURANT_SLUG = 'laruedita';

async function request<T = any>(body: Record<string, unknown>, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ slug: RESTAURANT_SLUG, ...body }),
    });
  } catch {
    throw new Error('Sem conexão. Verifique a internet e tente novamente.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Não foi possível concluir. Tente novamente.');
  }
  return data as T;
}

export const fidApi = {
  config: () => request<{ name: string; config: any }>({ action: 'config' }),
  register: (data: { name: string; phone: string; birthday: string; waConsent: boolean }) =>
    request<{ customer: any; token: string }>({
      action: 'register',
      name: data.name,
      phone: data.phone,
      birthday: data.birthday,
      consent: true,
      waConsent: data.waConsent,
    }),
  me: (token: string) => request<any>({ action: 'me', token }),
  lookupCode: (code: string) => request<any>({ action: 'lookup_code', code }),
  claim: (token: string, reward: string) =>
    request<any>({ action: 'claim', token, reward }),
  claimByCode: (code: string, reward: string) =>
    request<any>({ action: 'claim_by_code', code, reward }),
  marketingPreference: (token: string, allowed: boolean) =>
    request<any>({ action: 'marketing_preference', token, allowed }),
};
