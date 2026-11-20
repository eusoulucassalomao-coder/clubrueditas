// Cérebro do assistente (sem IA): reconhece a intenção, responde com variações,
// lembra o contexto curto e sempre devolve a pessoa ao objetivo do Club.
import { CARTA_URL, DELIVERY_URL, MAPS_URL, WHATSAPP_NUMBER_LABEL, whatsappUrl } from '../config/links';
import { Language } from '../types';

export type BrainActionType =
  | 'navigate-rewards'
  | 'navigate-points'
  | 'open-register'
  | 'open-url';

export interface BrainAction {
  type: BrainActionType;
  label: string;
  url?: string;
}

export interface BrainState {
  lastOffer: Offer | null;
  offTopic: number;
  turn: number;
}

type Offer = 'register' | 'menu' | 'delivery' | 'hours' | 'address' | 'rewards';

export interface BrainContext {
  lang: Language;
  isGuest: boolean;
  firstName: string;
  points: number;
  rewards: { title: string; pointsRequired: number }[];
}

export interface BrainReply {
  text: string;
  actions: BrainAction[];
}

export const newBrainState = (): BrainState => ({ lastOffer: null, offTopic: 0, turn: 0 });

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const has = (s: string, re: RegExp) => re.test(s);
const pick = <T,>(list: T[], n: number): T => list[n % list.length];

// ---------- horário (Posadas, Argentina) ----------
const SEGMENTS_WEEK: [number, number][] = [
  [11 * 60 + 45, 14 * 60 + 45],
  [19 * 60 + 45, 24 * 60],
];
const SEGMENTS_SUN: [number, number][] = [[11 * 60 + 45, 14 * 60 + 45]];
const hhmm = (m: number) =>
  `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function openStatus(lang: Language): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const now = h * 60 + m;
  const segs = wd === 'Sun' ? SEGMENTS_SUN : SEGMENTS_WEEK;
  const current = segs.find(([a, b]) => now >= a && now < b);
  const T = {
    es: {
      open: (t: string) => `Ahora estamos abiertos ✅ (hasta las ${t}).`,
      later: (t: string) => `Ahora estamos cerrados. Hoy abrimos a las ${t}.`,
      tomorrow: (t: string) => `Ahora estamos cerrados. Abrimos mañana a las ${t}.`,
    },
    en: {
      open: (t: string) => `We are open right now ✅ (until ${t}).`,
      later: (t: string) => `We are closed right now. Today we open at ${t}.`,
      tomorrow: (t: string) => `We are closed right now. We open tomorrow at ${t}.`,
    },
    pt: {
      open: (t: string) => `Agora estamos abertos ✅ (até as ${t}).`,
      later: (t: string) => `Agora estamos fechados. Hoje abrimos às ${t}.`,
      tomorrow: (t: string) => `Agora estamos fechados. Abrimos amanhã às ${t}.`,
    },
  }[lang];
  if (current) return T.open(hhmm(current[1] === 1440 ? 1440 : current[1]));
  const next = segs.find(([a]) => a > now);
  if (next) return T.later(hhmm(next[0]));
  return T.tomorrow(hhmm(SEGMENTS_WEEK[0][0]));
}

// ---------- textos ----------
interface Texts {
  welcomeGuest: string;
  welcomeMember: (n: string) => string;
  placeholder: string;
  footer: string;
  chipsGuest: string[];
  chipsMember: string[];
  lbl: {
    register: string;
    rewards: string;
    points: string;
    menu: string;
    delivery: string;
    maps: string;
    whatsapp: string;
    reserve: string;
  };
  greet: ((n: string) => string)[];
  greetTailGuest: string;
  greetTailMember: string;
  thanks: string[];
  bye: string[];
  no: string;
  human: string;
  reserve: string;
  hours: string;
  address: string;
  menu: string;
  delivery: string;
  pointsHow: string;
  expiry: string;
  guestNoPoints: string;
  myPoints: (n: string, pts: number) => string;
  next: (rem: number, name: string, target: number) => string;
  allUnlocked: string;
  rewardsGuest: (list: string) => string;
  rewardsMember: (list: string, can: number) => string;
  register: string;
  registered: string;
  hasAccount: (n: string) => string;
  install: string;
  offTopic1: string;
  offTopic2: string;
  rewardLine: (name: string, pts: number) => string;
  reserveMsg: string;
}

const ES: Texts = {
  welcomeGuest:
    '¡Hola! Soy el asistente de La Ruedita 👋 Te cuento cómo funciona el Club, la carta, el delivery y los horarios. ¿En qué te ayudo?',
  welcomeMember: (n) => `¡Hola, ${n}! 👋 Soy el asistente de La Ruedita. ¿Querés ver tus puntos, los premios o pedir delivery?`,
  placeholder: 'Escribí tu consulta o tu código de socio…',
  footer: 'Asistente automático del Club. Para otras consultas, escribinos por WhatsApp.',
  chipsGuest: ['¿Cómo gano puntos?', 'Ver la carta', 'Horarios'],
  chipsMember: ['Mis puntos', 'Premios', 'Pedir delivery'],
  lbl: {
    register: 'Crear mi cuenta gratis',
    rewards: 'Ver los premios',
    points: 'Ver mis puntos',
    menu: 'Ver la carta',
    delivery: 'Pedir delivery',
    maps: 'Cómo llegar',
    whatsapp: 'Escribir por WhatsApp',
    reserve: 'Reservar por WhatsApp',
  },
  greet: [
    (n) => `¡Hola${n ? ', ' + n : ''}! 😊`,
    (n) => `¡Hola${n ? ' ' + n : ''}! Qué bueno verte por acá.`,
    (n) => `¡Buenas${n ? ', ' + n : ''}! ¿Cómo estás?`,
  ],
  greetTailGuest: 'Si todavía no sos del Club, podés crear tu cuenta gratis y empezar a sumar puntos. ¿Te muestro cómo?',
  greetTailMember: '¿Querés ver tus puntos, los premios o pedir delivery?',
  thanks: [
    '¡De nada! 😊 Cualquier cosa que necesites, estoy acá.',
    '¡Un gusto ayudarte! ¿Querés ver los premios o la carta?',
    '¡Con gusto! Si querés, te cuento cómo sumar más puntos.',
  ],
  bye: ['¡Hasta pronto! Te esperamos en La Ruedita 🍖', '¡Chau! Cuando quieras, acá estoy.'],
  no: 'Perfecto 🙂 Cualquier cosa me escribís.',
  human: `Claro. Escribinos por WhatsApp al ${WHATSAPP_NUMBER_LABEL} y te atiende una persona del equipo.`,
  reserve: `Las reservas las tomamos por WhatsApp al ${WHATSAPP_NUMBER_LABEL}. Escribinos con el día, la hora y la cantidad de personas y te confirmamos.`,
  hours:
    'Atendemos de lunes a sábado de 11:45 a 14:45 y de 19:45 a 00:00, y los domingos de 11:45 a 14:45. En feriados el horario puede cambiar.',
  address: 'Estamos en Alfonso de Arrechea 835, Posadas, Misiones.',
  menu: 'Mirá nuestra carta digital, con fotos y todos los platos 🍖',
  delivery: 'Podés pedir delivery desde nuestra carta. Elegí tus platos y listo 🛵',
  pointsHow:
    'Es muy simple: sumás puntos con cada visita según lo que consumís (el cajero los carga al cobrar), y los canjeás por premios. Al crear tu cuenta ya te regalamos puntos de bienvenida.',
  expiry:
    'Tus puntos pueden vencer si pasás mucho tiempo sin visitarnos (alrededor de 12 meses). Antes de que eso pase, te avisamos por WhatsApp.',
  guestNoPoints:
    'Todavía no tenés cuenta, así que aún no tenés puntos. Creála gratis y ya empezás con puntos de bienvenida.',
  myPoints: (n, pts) => `${n ? n + ', ' : ''}tenés ${pts} puntos.`,
  next: (rem, name, target) => `Te faltan ${rem} para «${name}» (${target} pts).`,
  allUnlocked: '¡Ya podés canjear cualquiera de los premios!',
  rewardsGuest: (list) => `Estos son los premios del Club:\n${list}\n\nCreá tu cuenta gratis y empezá a sumar.`,
  rewardsMember: (list, can) =>
    `Estos son los premios del Club:\n${list}\n\n${can > 0 ? `Ahora podés canjear ${can}. ` : ''}¿Querés verlos?`,
  register: 'Unirte es rápido: nombre, celular y fecha de nacimiento. ¿Abro el formulario?',
  registered: '¡Genial! Te abro el formulario.',
  hasAccount: (n) => `${n ? n + ', ya' : 'Ya'} tenés tu cuenta del Club 😊 Tu código de socio está en tu Perfil.`,
  install:
    'Podés instalar el Club en segundos:\n• Android: tocá «Instalar aplicación» o usá el menú de Chrome.\n• iPhone: abrilo en Safari → Compartir → Añadir a pantalla de inicio.',
  offTopic1:
    'Eso se me escapa 😅 Pero te puedo ayudar con: puntos, premios, la carta, el delivery, horarios, dirección o tu cuenta. ¿Con cuál empezamos?',
  offTopic2: `Prefiero no inventarte nada. Para eso escribinos por WhatsApp al ${WHATSAPP_NUMBER_LABEL} y te atiende una persona.`,
  rewardLine: (name, pts) => `• ${name} — ${pts} pts`,
  reserveMsg: 'Hola, quiero reservar una mesa en La Ruedita.',
};

const EN: Texts = {
  welcomeGuest:
    "Hi! I'm the La Ruedita assistant 👋 I can tell you how the Club works, the menu, delivery and opening hours. How can I help?",
  welcomeMember: (n) => `Hi, ${n}! 👋 I'm the La Ruedita assistant. Want to see your points, the rewards or order delivery?`,
  placeholder: 'Type your question or your member code…',
  footer: 'Automatic Club assistant. For anything else, message us on WhatsApp.',
  chipsGuest: ['How do I earn points?', 'See the menu', 'Opening hours'],
  chipsMember: ['My points', 'Rewards', 'Order delivery'],
  lbl: {
    register: 'Create my free account',
    rewards: 'See rewards',
    points: 'See my points',
    menu: 'See the menu',
    delivery: 'Order delivery',
    maps: 'Get directions',
    whatsapp: 'Message on WhatsApp',
    reserve: 'Book on WhatsApp',
  },
  greet: [
    (n) => `Hi${n ? ', ' + n : ''}! 😊`,
    (n) => `Hello${n ? ' ' + n : ''}! Nice to see you here.`,
    (n) => `Hey${n ? ', ' + n : ''}! How are you?`,
  ],
  greetTailGuest: "If you're not in the Club yet, you can create a free account and start earning points. Want me to show you how?",
  greetTailMember: 'Want to see your points, the rewards or order delivery?',
  thanks: [
    "You're welcome! 😊 I'm here if you need anything.",
    'Happy to help! Want to see the rewards or the menu?',
    'My pleasure! I can tell you how to earn more points if you like.',
  ],
  bye: ['See you soon! We look forward to seeing you at La Ruedita 🍖', 'Bye! I am here whenever you need me.'],
  no: 'Perfect 🙂 Message me anytime.',
  human: `Of course. Message us on WhatsApp at ${WHATSAPP_NUMBER_LABEL} and a team member will reply.`,
  reserve: `We take bookings on WhatsApp at ${WHATSAPP_NUMBER_LABEL}. Send the day, time and number of people and we will confirm.`,
  hours:
    'We are open Monday to Saturday 11:45–14:45 and 19:45–00:00, and Sunday 11:45–14:45. Hours may change on public holidays.',
  address: 'We are at Alfonso de Arrechea 835, Posadas, Misiones.',
  menu: 'Check out our digital menu, with photos of every dish 🍖',
  delivery: 'You can order delivery from our menu. Pick your dishes and you are done 🛵',
  pointsHow:
    'It is simple: you earn points on every visit based on what you spend (the cashier adds them when you pay), and you redeem them for rewards. When you create your account we give you welcome points.',
  expiry:
    'Your points may expire if you go a long time without visiting (about 12 months). We warn you on WhatsApp before that happens.',
  guestNoPoints: "You don't have an account yet, so no points yet. Create it for free and you start with welcome points.",
  myPoints: (n, pts) => `${n ? n + ', you' : 'You'} have ${pts} points.`,
  next: (rem, name, target) => `You need ${rem} more for “${name}” (${target} pts).`,
  allUnlocked: 'You can already redeem any reward!',
  rewardsGuest: (list) => `These are the Club rewards:\n${list}\n\nCreate your free account and start earning.`,
  rewardsMember: (list, can) =>
    `These are the Club rewards:\n${list}\n\n${can > 0 ? `You can redeem ${can} right now. ` : ''}Want to see them?`,
  register: 'Joining is quick: name, mobile number and date of birth. Shall I open the form?',
  registered: 'Great! Opening the form for you.',
  hasAccount: (n) => `${n ? n + ', you' : 'You'} already have your Club account 😊 Your member code is in your Profile.`,
  install:
    'You can install the Club in seconds:\n• Android: tap “Install app” or use the Chrome menu.\n• iPhone: open in Safari → Share → Add to Home Screen.',
  offTopic1:
    "That's a bit outside what I know 😅 But I can help with points, rewards, the menu, delivery, hours, address or your account. Where shall we start?",
  offTopic2: `I'd rather not make anything up. Message us on WhatsApp at ${WHATSAPP_NUMBER_LABEL} and a person will help.`,
  rewardLine: (name, pts) => `• ${name} — ${pts} pts`,
  reserveMsg: 'Hi, I would like to book a table at La Ruedita.',
};

const PT: Texts = {
  welcomeGuest:
    'Olá! Sou o assistente da La Ruedita 👋 Posso explicar como funciona o Club, o cardápio, o delivery e os horários. Como posso ajudar?',
  welcomeMember: (n) => `Olá, ${n}! 👋 Sou o assistente da La Ruedita. Quer ver seus pontos, os prêmios ou pedir delivery?`,
  placeholder: 'Escreva sua dúvida ou seu código de sócio…',
  footer: 'Assistente automático do Club. Para outros assuntos, fale conosco pelo WhatsApp.',
  chipsGuest: ['Como ganho pontos?', 'Ver o cardápio', 'Horários'],
  chipsMember: ['Meus pontos', 'Prêmios', 'Pedir delivery'],
  lbl: {
    register: 'Criar minha conta grátis',
    rewards: 'Ver os prêmios',
    points: 'Ver meus pontos',
    menu: 'Ver o cardápio',
    delivery: 'Pedir delivery',
    maps: 'Como chegar',
    whatsapp: 'Falar no WhatsApp',
    reserve: 'Reservar no WhatsApp',
  },
  greet: [
    (n) => `Olá${n ? ', ' + n : ''}! 😊`,
    (n) => `Oi${n ? ' ' + n : ''}! Que bom te ver por aqui.`,
    (n) => `Olá${n ? ', ' + n : ''}! Tudo bem?`,
  ],
  greetTailGuest: 'Se você ainda não é do Club, pode criar sua conta grátis e começar a somar pontos. Quer ver como?',
  greetTailMember: 'Quer ver seus pontos, os prêmios ou pedir delivery?',
  thanks: [
    'De nada! 😊 Qualquer coisa, estou aqui.',
    'Um prazer ajudar! Quer ver os prêmios ou o cardápio?',
    'Com gosto! Se quiser, explico como somar mais pontos.',
  ],
  bye: ['Até logo! Esperamos você na La Ruedita 🍖', 'Tchau! Quando precisar, estou aqui.'],
  no: 'Perfeito 🙂 Qualquer coisa é só falar.',
  human: `Claro. Fale conosco no WhatsApp ${WHATSAPP_NUMBER_LABEL} e uma pessoa da equipe atende.`,
  reserve: `As reservas são pelo WhatsApp ${WHATSAPP_NUMBER_LABEL}. Envie o dia, a hora e o número de pessoas e confirmamos.`,
  hours:
    'Atendemos de segunda a sábado das 11:45 às 14:45 e das 19:45 às 00:00, e aos domingos das 11:45 às 14:45. Em feriados o horário pode mudar.',
  address: 'Estamos na Alfonso de Arrechea 835, Posadas, Misiones.',
  menu: 'Veja nosso cardápio digital, com fotos de todos os pratos 🍖',
  delivery: 'Você pode pedir delivery pelo nosso cardápio. Escolha os pratos e pronto 🛵',
  pointsHow:
    'É simples: você soma pontos a cada visita conforme o que consome (o caixa lança ao cobrar) e troca por prêmios. Ao criar sua conta, ganha pontos de boas-vindas.',
  expiry:
    'Seus pontos podem vencer se você ficar muito tempo sem visitar (cerca de 12 meses). Avisamos pelo WhatsApp antes disso.',
  guestNoPoints: 'Você ainda não tem conta, então ainda não tem pontos. Crie grátis e já começa com pontos de boas-vindas.',
  myPoints: (n, pts) => `${n ? n + ', você' : 'Você'} tem ${pts} pontos.`,
  next: (rem, name, target) => `Faltam ${rem} para «${name}» (${target} pts).`,
  allUnlocked: 'Você já pode trocar qualquer prêmio!',
  rewardsGuest: (list) => `Estes são os prêmios do Club:\n${list}\n\nCrie sua conta grátis e comece a somar.`,
  rewardsMember: (list, can) =>
    `Estes são os prêmios do Club:\n${list}\n\n${can > 0 ? `Agora você pode trocar ${can}. ` : ''}Quer ver?`,
  register: 'Entrar é rápido: nome, celular e data de nascimento. Abro o formulário?',
  registered: 'Ótimo! Vou abrir o formulário.',
  hasAccount: (n) => `${n ? n + ', você' : 'Você'} já tem sua conta do Club 😊 Seu código de sócio está no seu Perfil.`,
  install:
    'Você instala o Club em segundos:\n• Android: toque em “Instalar aplicativo” ou use o menu do Chrome.\n• iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início.',
  offTopic1:
    'Isso foge do que eu sei 😅 Mas posso ajudar com pontos, prêmios, cardápio, delivery, horários, endereço ou sua conta. Por onde começamos?',
  offTopic2: `Prefiro não inventar nada. Fale conosco no WhatsApp ${WHATSAPP_NUMBER_LABEL} e uma pessoa ajuda.`,
  rewardLine: (name, pts) => `• ${name} — ${pts} pts`,
  reserveMsg: 'Olá, quero reservar uma mesa na La Ruedita.',
};

const TEXTS: Record<Language, Texts> = { es: ES, en: EN, pt: PT };

export const brainWelcome = (lang: Language, isGuest: boolean, firstName: string) =>
  isGuest || !firstName ? TEXTS[lang].welcomeGuest : TEXTS[lang].welcomeMember(firstName);
export const brainPlaceholder = (lang: Language) => TEXTS[lang].placeholder;
export const brainFooter = (lang: Language) => TEXTS[lang].footer;
export const brainChips = (lang: Language, isGuest: boolean) =>
  isGuest ? TEXTS[lang].chipsGuest : TEXTS[lang].chipsMember;

// ---------- reconhecimento de intenção ----------
const RE = {
  human: /\b(persona|humano|alguien|alguem|atencion|atendente|hablar con|falar com|speak to|talk to|llamar|telefono|telefone|contacto|contato|reclamo|queja|reclamacao|human|agent)\b|whatsapp/,
  reserve: /(reserv|booking|book a table|book table|mesa para|quiero una mesa|quero uma mesa)/,
  hours: /(horario|abren|abrem|abierto|aberto|cierran|cierra|fecham|fecha|\bopen\b|\bclose\b|opening|\bhoras?\b|funcionan|funcionam|atienden|atendem|hasta que hora|que hora)/,
  address: /(donde (estan|esta|queda|quedan|se ubican|ubican|es el local)|onde (fica|ficam|estao)|where are you|where is|direccion|endereco|ubicacion|localizacion|como llegar|como chegar|address|location)/,
  delivery: /(deliver|domicilio|envio|pedir|pedido|entrega|a casa|llevar|take ?away|\border\b|encomenda)/,
  menu: /(carta|menu|cardapio|platos|pratos|comida|que tienen|que hay|que servem|precios?|precos?|cuanto (sale|cuesta|cobran)|quanto (custa|sai)|\bprice|\bfood\b|\bdishes\b|what do you|how much)/,
  expiry: /(vence|vencen|vencimiento|expiran|expira|caduca|caducan|expire|vencem|vencimento)/,
  remaining: /(me falta|faltan|falta para|cuanto falta|how many more|quanto falta|faltam)/,
  pointsHow: /(como (gano|sumo|acumulo|consigo|obtengo|funciona)|como ganho|como somo|como funciona|how (do i|can i|to) (earn|get|collect)|how does|how it works|que es el club|que es esto|para que sirve)/,
  myPoints: /(\b(mis|mi|cuantos|cuanto|tengo|saldo|balance|my|meus|meu|quantos|quanto)\b.*\b(punto|puntos|pontos|points|saldo|balance)\b)|(\b(punto|puntos|pontos|points)\b.*\b(tengo|tenho|have)\b)/,
  rewards: /(premio|recompensa|beneficio|canje|canjear|reward|prêmio|premio|resgat|descuento|desconto|discount|trocar)/,
  register: /(\bcuenta\b|registr|crear|inscrib|unirme|unirse|sign ?up|\baccount\b|cadastr|\bconta\b|criar|\bjoin\b|afiliar)/,
  install: /(instal|\bapp\b|aplicacion|aplicativo|descarg|\bpwa\b|baixar|download)/,
  thanks: /(gracias|thank|thx|obrigad|valeu|genial|perfecto|excelente|muy bien)/,
  bye: /(chau|adios|hasta luego|hasta pronto|bye|tchau|ate logo|nos vemos)/,
  greet: /^(hola|holi|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|hi|hello|oi|ola|bom dia|boa tarde|boa noite|que tal|como estas|como andas|tudo bem|good (morning|afternoon|evening))/,
  yes: /^(si|sii|dale|ok|okay|claro|bueno|perfecto|por favor|yes|yeah|sure|please|sim|pode)( (por favor|dale|gracias|claro|please|favor))?$/,
  no: /^(no|nop|nope|nada|nao|no gracias|no thanks|no thank you|nao obrigado|nao obrigada)$/,
};

// ---------- resposta ----------
export function brainReply(rawInput: string, ctx: BrainContext, state: BrainState): BrainReply {
  const L = TEXTS[ctx.lang];
  const s = norm(rawInput);
  const n = state.turn++;
  const firstName = ctx.isGuest ? '' : ctx.firstName;

  const act = (type: BrainActionType, label: string, url?: string): BrainAction => ({ type, label, url });
  const registerAct = () => act('open-register', L.lbl.register);
  const rewardsAct = () => act('navigate-rewards', L.lbl.rewards);
  const cartaAct = () => act('open-url', L.lbl.menu, CARTA_URL);
  const deliveryAct = () => act('open-url', L.lbl.delivery, DELIVERY_URL);
  const waAct = (label: string, msg?: string) => act('open-url', label, whatsappUrl(msg));

  const done = (text: string, actions: BrainAction[], offer: Offer | null = null): BrainReply => {
    state.lastOffer = offer;
    state.offTopic = 0;
    return { text, actions };
  };

  const rewardList = ctx.rewards.map((r) => L.rewardLine(r.title, r.pointsRequired)).join('\n');

  const answer = (intent: string): BrainReply | null => {
    switch (intent) {
      case 'human':
        return done(L.human, [waAct(L.lbl.whatsapp)]);
      case 'reserve':
        return done(L.reserve, [waAct(L.lbl.reserve, L.reserveMsg)]);
      case 'hours':
        return done(`${openStatus(ctx.lang)}\n\n${L.hours}`, [act('open-url', L.lbl.maps, MAPS_URL)], 'address');
      case 'address':
        return done(L.address, [act('open-url', L.lbl.maps, MAPS_URL)], 'hours');
      case 'delivery':
        return done(L.delivery, [deliveryAct(), cartaAct()], 'menu');
      case 'menu':
        return done(L.menu, [cartaAct(), deliveryAct()], 'delivery');
      case 'expiry':
        return done(L.expiry, ctx.isGuest ? [registerAct()] : [act('navigate-points', L.lbl.points)]);
      case 'pointsHow':
        return done(L.pointsHow, ctx.isGuest ? [registerAct(), rewardsAct()] : [rewardsAct()], ctx.isGuest ? 'register' : 'rewards');
      case 'remaining':
      case 'myPoints': {
        if (ctx.isGuest) return done(L.guestNoPoints, [registerAct()], 'register');
        const next = ctx.rewards.find((r) => r.pointsRequired > ctx.points);
        const line = next ? L.next(next.pointsRequired - ctx.points, next.title, next.pointsRequired) : L.allUnlocked;
        return done(`${L.myPoints(firstName, ctx.points)} ${line}`, [rewardsAct()], 'rewards');
      }
      case 'rewards': {
        if (ctx.isGuest) return done(L.rewardsGuest(rewardList), [registerAct()], 'register');
        const can = ctx.rewards.filter((r) => ctx.points >= r.pointsRequired).length;
        return done(L.rewardsMember(rewardList, can), [rewardsAct()]);
      }
      case 'register':
        return ctx.isGuest
          ? done(L.register, [registerAct()], 'register')
          : done(L.hasAccount(firstName), [act('navigate-points', L.lbl.points)]);
      case 'install':
        return done(L.install, []);
      case 'thanks':
        return done(pick(L.thanks, n), ctx.isGuest ? [rewardsAct()] : [cartaAct()]);
      case 'bye':
        return done(pick(L.bye, n), []);
      case 'greet': {
        const tail = ctx.isGuest ? L.greetTailGuest : L.greetTailMember;
        return done(`${pick(L.greet, n)(firstName)}\n${tail}`, ctx.isGuest ? [registerAct()] : [act('navigate-points', L.lbl.points)], ctx.isGuest ? 'register' : null);
      }
      default:
        return null;
    }
  };

  // respostas curtas a uma oferta anterior ("sim", "dale", "no, gracias")
  if (state.lastOffer && has(s, RE.yes) && s.split(' ').length <= 4) {
    const offer = state.lastOffer;
    if (offer === 'register') {
      state.lastOffer = null;
      return { text: L.registered, actions: [registerAct()] };
    }
    const r = answer(offer);
    if (r) return r;
  }
  if (state.lastOffer && has(s, RE.no) && s.split(' ').length <= 4) {
    state.lastOffer = null;
    return { text: L.no, actions: [] };
  }

  // "sim"/"não" soltos, sem nenhuma oferta antes: pergunta o que a pessoa quer (sem contar como desvio)
  if (!state.lastOffer && (has(s, RE.yes) || has(s, RE.no))) {
    return { text: L.offTopic1, actions: [] };
  }

  // intenções específicas (a ordem importa)
  const order: [string, RegExp][] = [
    ['human', RE.human],
    ['reserve', RE.reserve],
    ['hours', RE.hours],
    ['address', RE.address],
    ['delivery', RE.delivery],
    ['menu', RE.menu],
    ['expiry', RE.expiry],
    ['remaining', RE.remaining],
    ['pointsHow', RE.pointsHow],
    ['myPoints', RE.myPoints],
    ['rewards', RE.rewards],
    ['register', RE.register],
    ['install', RE.install],
    ['bye', RE.bye],
    ['thanks', RE.thanks],
    ['greet', RE.greet],
  ];
  for (const [name, re] of order) {
    if (has(s, re)) {
      const r = answer(name);
      if (r) return r;
    }
  }

  // fora do assunto: puxa de volta e, se insistir, oferece uma pessoa
  state.offTopic += 1;
  if (state.offTopic >= 2) {
    state.lastOffer = null;
    return { text: L.offTopic2, actions: [waAct(L.lbl.whatsapp)] };
  }
  state.lastOffer = null;
  return { text: L.offTopic1, actions: [] };
}
