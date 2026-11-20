// Textos do cliente (/k e a tela do tablet) em espanhol, português e inglês.
(function(){
  const D = {
    es: {
      loading: "Un momento…", busy: "Un momento…",
      deadTitle: "Ese QR venció", deadMsg: "Escaneá de nuevo el código QR que está en la caja del local.", deadBack: "Volver al inicio",
      deadSession: "Pasó un rato. Escaneá de nuevo el QR de la caja.",
      menuTitle: "¿Qué querés hacer?", menuSub: "Elegí una opción. Es rápido y simple.",
      goRegister: "Crear mi cuenta", goRegisterSub: "Sumate al Club y empezá a ganar puntos",
      goVisit: "Registrar mi visita", goVisitSub: "Sumá puntos por tu cuenta de hoy",
      goRedeem: "Canjear un premio", goRedeemSub: "Usá tus puntos y recibí tu cupón",
      menuTiny: "Para registrar una visita o canjear un premio te mandamos un código por WhatsApp.",
      needTitle: "Escaneá el QR de la caja", needText: "Para registrar tu visita o canjear un premio, escaneá el código QR que está en el tablet de la caja del local.", back: "Volver",
      regTitle: "Creá tu cuenta", regSub: "Gratis y en un minuto. Te regalamos puntos de bienvenida.",
      rName: "Nombre y apellido", rNamePh: "Ej.: Ana Pérez", rPhone: "Tu WhatsApp", rPhonePh: "Ej.: 376 4123456", rBirth: "Fecha de nacimiento",
      rConsent: "Acepto que Club La Ruedita use mis datos para administrar mi cuenta y me envíe mensajes por WhatsApp.",
      rBtn: "Crear mi cuenta", backArrow: "← Volver",
      errName: "Escribí tu nombre.", errPhone: "Revisá tu número de WhatsApp (sin el 0 ni el 15).", errBirth: "Ingresá tu fecha de nacimiento.", errConsent: "Para unirte necesitás aceptar los mensajes y el uso de tus datos.",
      welcome: "¡Bienvenido/a, {name}!", welcomeM: "¡Bienvenido, {name}!", welcomeF: "¡Bienvenida, {name}!", welcomeGeneric: "¡Bienvenido/a!", yourCode: "Tu código de socio", saveIt: "Guardalo: también podés ingresar con tu WhatsApp.",
      welcomeText: "Ya sos parte del Club. Si estás en el local, volvé al inicio para registrar tu visita.", seeCard: "Ver mi tarjeta del Club",
      idTitle: "Confirmemos que sos vos", idSub: "Escribí tu número de WhatsApp (el que usaste al registrarte) o tu código de socio. Te enviamos un código de 6 dígitos.",
      idLabel: "WhatsApp o código de socio", idPh: "Ej.: 376 4123456  o  ANA123", idBtn: "Enviarme el código por WhatsApp", errId: "Escribí tu WhatsApp con código de área, o tu código de socio.",
      otpTitle: "Revisá tu WhatsApp", otpSub: "Si la cuenta existe, te enviamos un código de 6 dígitos. Puede tardar unos segundos.", otpLabel: "Código", otpBtn: "Confirmar",
      resend: "Reenviar código", changeNumber: "← Cambiar número", errOtp6: "El código tiene 6 dígitos.", waitResend: "Esperá unos segundos para pedir otro código.", resent: "Te enviamos un código nuevo.",
      tooMany: "Demasiados intentos. Esperá un minuto.",
      visitTitle: "Registrá tu visita", visitTitleName: "Registrá tu visita, {name}",
      visitSub: "Escaneá el QR de tu comprobante de pago o escribí su código. Sumamos los puntos según el total de tu cuenta.",
      scanBtn: "📷 Escanear QR del comprobante", scanClose: "Cerrar cámara", visitLabel: "O escribí el código del pago", visitPh: "Ej.: BF8F-AB51", visitBtn: "Registrar visita",
      errVisitCode: "Revisá el código del pago.", noCamera: "Este navegador no permite usar la cámara. Escribí el código.", camDenied: "No pudimos abrir la cámara. Permití el acceso o escribí el código.",
      visitOkTitle: "¡Visita registrada!", added: "Sumaste", pointsWord: "puntos", forBill: "por tu cuenta de $ {amount}", totalNow: "Ahora tenés {total} puntos en total. ¡Gracias por venir!", seePoints: "Ver mis puntos",
      kcLost: "Tu verificación venció. Confirmá de nuevo.",
      redeemTitle: "Canjeá tu premio", redeemTitleName: "{name}, canjeá tu premio", yourPoints: "Tus puntos",
      redeemTiny: "Al canjear, se descuentan los puntos y recibís un cupón con QR. Acercalo a la cámara del tablet de la caja para validarlo. Vale por poco tiempo.",
      redeemBtn: "Canjear", pts: "{n} puntos", missing: "Te faltan {n} · {total} pts", noRewards: "Todavía no hay premios cargados.",
      confirmClaim: "¿Canjear este premio ahora? Se descuentan los puntos y el cupón vale por poco tiempo.",
      couponTop: "Cupón de premio", couponFor: "Para {name}", couponShow: "Acercá este QR a la cámara del tablet de la caja.", couponNote: "Este cupón se puede usar una sola vez. Si no lo usás a tiempo, tus puntos vuelven a tu cuenta.",
      couponLeft: "Vale por {min}:{sec} min", couponExpired: "Vencido", couponExpiredNote: "Este cupón venció. Tus puntos vuelven a tu cuenta.", backClub: "Volver al Club",
      appHasTitle: "Ya tenés la app instalada", appHasText: "Abrila para ver tus puntos y tu historial.",
      appNoTitle: "Llevá el Club en tu celular", appNoText: "Instalá la app para ver tus puntos.", appHow: "Ver cómo", appOpen: "Abrir la app", appOpenHint: "Si no se abrió, buscá el ícono de La Ruedita en tu pantalla de inicio.",
      // tablet
      tCoupon: "Tengo un cupón", tScanTitle: "Acercá el QR de tu cupón a la cámara", tScanSub: "Mostralo de frente, con buena luz.",
      tCancel: "Cancelar", tValid: "VÁLIDO", tForName: "Para {name}", tConfirm: "Confirmar canje", tDone: "¡Listo!", tDoneSub: "Canje confirmado. Avisamos a la caja: el personal te entrega tu premio.",
      tUsed: "YA USADO", tUsedSub: "Este cupón ya fue canjeado.", tExpired: "VENCIDO", tExpiredSub: "Este cupón venció. Tus puntos volvieron a tu cuenta.",
      tModeCam: "Escanear QR", tModeType: "Escribir código", tTypeTitle: "Escribí el código de tu cupón", tTypeSub: "Es el que aparece debajo del QR (ej.: P12345).", tCheck: "Validar código", tBadCode: "Revisá el código (ej.: P12345).", tNotFound: "NO VÁLIDO", tNotFoundSub: "Ese código no corresponde a ningún cupón del Club.", tNoCam: "No se pudo abrir la cámara. Permití el acceso en el navegador.", tBack: "Volver", tChecking: "Verificando…"
    },
    pt: {
      loading: "Um momento…", busy: "Um momento…",
      deadTitle: "Esse QR venceu", deadMsg: "Escaneie de novo o código QR que está no caixa do restaurante.", deadBack: "Voltar ao início",
      deadSession: "Passou um tempo. Escaneie de novo o QR do caixa.",
      menuTitle: "O que você quer fazer?", menuSub: "Escolha uma opção. É rápido e simples.",
      goRegister: "Criar minha conta", goRegisterSub: "Entre para o Clube e comece a ganhar pontos",
      goVisit: "Registrar minha visita", goVisitSub: "Some pontos pela conta de hoje",
      goRedeem: "Resgatar um prêmio", goRedeemSub: "Use seus pontos e receba seu cupom",
      menuTiny: "Para registrar uma visita ou resgatar um prêmio, enviamos um código por WhatsApp.",
      needTitle: "Escaneie o QR do caixa", needText: "Para registrar sua visita ou resgatar um prêmio, escaneie o código QR que está no tablet do caixa do restaurante.", back: "Voltar",
      regTitle: "Crie sua conta", regSub: "Grátis e em um minuto. Damos pontos de boas-vindas.",
      rName: "Nome e sobrenome", rNamePh: "Ex.: Ana Pérez", rPhone: "Seu WhatsApp", rPhonePh: "Ex.: 376 4123456", rBirth: "Data de nascimento",
      rConsent: "Aceito que o Club La Ruedita use meus dados para administrar minha conta e me envie mensagens por WhatsApp.",
      rBtn: "Criar minha conta", backArrow: "← Voltar",
      errName: "Escreva seu nome.", errPhone: "Confira seu número de WhatsApp (sem o 0 nem o 15).", errBirth: "Informe sua data de nascimento.", errConsent: "Para entrar, você precisa aceitar as mensagens e o uso dos seus dados.",
      welcome: "Bem-vindo(a), {name}!", welcomeM: "Bem-vindo, {name}!", welcomeF: "Bem-vinda, {name}!", welcomeGeneric: "Bem-vindo(a)!", yourCode: "Seu código de sócio", saveIt: "Guarde: você também pode entrar com seu WhatsApp.",
      welcomeText: "Você já faz parte do Clube. Se estiver no restaurante, volte ao início para registrar sua visita.", seeCard: "Ver meu cartão do Clube",
      idTitle: "Vamos confirmar que é você", idSub: "Escreva seu número de WhatsApp (o que usou ao se cadastrar) ou seu código de sócio. Enviamos um código de 6 dígitos.",
      idLabel: "WhatsApp ou código de sócio", idPh: "Ex.: 376 4123456  ou  ANA123", idBtn: "Enviar o código por WhatsApp", errId: "Escreva seu WhatsApp com DDD, ou seu código de sócio.",
      otpTitle: "Confira seu WhatsApp", otpSub: "Se a conta existir, enviamos um código de 6 dígitos. Pode demorar alguns segundos.", otpLabel: "Código", otpBtn: "Confirmar",
      resend: "Reenviar código", changeNumber: "← Trocar número", errOtp6: "O código tem 6 dígitos.", waitResend: "Espere alguns segundos para pedir outro código.", resent: "Enviamos um código novo.",
      tooMany: "Muitas tentativas. Espere um minuto.",
      visitTitle: "Registre sua visita", visitTitleName: "Registre sua visita, {name}",
      visitSub: "Escaneie o QR do seu comprovante de pagamento ou escreva o código. Somamos os pontos conforme o total da sua conta.",
      scanBtn: "📷 Escanear QR do comprovante", scanClose: "Fechar câmera", visitLabel: "Ou escreva o código do pagamento", visitPh: "Ex.: BF8F-AB51", visitBtn: "Registrar visita",
      errVisitCode: "Confira o código do pagamento.", noCamera: "Este navegador não permite usar a câmera. Escreva o código.", camDenied: "Não conseguimos abrir a câmera. Permita o acesso ou escreva o código.",
      visitOkTitle: "Visita registrada!", added: "Você somou", pointsWord: "pontos", forBill: "pela sua conta de $ {amount}", totalNow: "Agora você tem {total} pontos no total. Obrigado por vir!", seePoints: "Ver meus pontos",
      kcLost: "Sua verificação venceu. Confirme de novo.",
      redeemTitle: "Resgate seu prêmio", redeemTitleName: "{name}, resgate seu prêmio", yourPoints: "Seus pontos",
      redeemTiny: "Ao resgatar, os pontos são descontados e você recebe um cupom com QR. Aproxime da câmera do tablet do caixa para validar. Vale por pouco tempo.",
      redeemBtn: "Resgatar", pts: "{n} pontos", missing: "Faltam {n} · {total} pts", noRewards: "Ainda não há prêmios cadastrados.",
      confirmClaim: "Resgatar este prêmio agora? Os pontos são descontados e o cupom vale por pouco tempo.",
      couponTop: "Cupom de prêmio", couponFor: "Para {name}", couponShow: "Aproxime este QR da câmera do tablet do caixa.", couponNote: "Este cupom só pode ser usado uma vez. Se você não usar a tempo, seus pontos voltam para sua conta.",
      couponLeft: "Vale por {min}:{sec} min", couponExpired: "Vencido", couponExpiredNote: "Este cupom venceu. Seus pontos voltam para sua conta.", backClub: "Voltar ao Clube",
      appHasTitle: "Você já tem o app instalado", appHasText: "Abra para ver seus pontos e seu histórico.",
      appNoTitle: "Leve o Clube no seu celular", appNoText: "Instale o app para ver seus pontos.", appHow: "Ver como", appOpen: "Abrir o app", appOpenHint: "Se não abriu, procure o ícone da La Ruedita na tela inicial.",
      tCoupon: "Tenho um cupom", tScanTitle: "Aproxime o QR do seu cupom da câmera", tScanSub: "Mostre de frente, com boa luz.",
      tCancel: "Cancelar", tValid: "VÁLIDO", tForName: "Para {name}", tConfirm: "Confirmar resgate", tDone: "Pronto!", tDoneSub: "Resgate confirmado. Avisamos o caixa: a equipe entrega seu prêmio.",
      tUsed: "JÁ USADO", tUsedSub: "Este cupom já foi resgatado.", tExpired: "VENCIDO", tExpiredSub: "Este cupom venceu. Seus pontos voltaram para sua conta.",
      tModeCam: "Escanear QR", tModeType: "Digitar código", tTypeTitle: "Digite o código do seu cupom", tTypeSub: "É o que aparece embaixo do QR (ex.: P12345).", tCheck: "Validar código", tBadCode: "Confira o código (ex.: P12345).", tNotFound: "NÃO VÁLIDO", tNotFoundSub: "Esse código não corresponde a nenhum cupom do Clube.", tNoCam: "Não foi possível abrir a câmera. Permita o acesso no navegador.", tBack: "Voltar", tChecking: "Verificando…"
    },
    en: {
      loading: "One moment…", busy: "One moment…",
      deadTitle: "That QR expired", deadMsg: "Scan the QR code at the restaurant's cashier again.", deadBack: "Back to start",
      deadSession: "It's been a while. Scan the cashier's QR again.",
      menuTitle: "What would you like to do?", menuSub: "Pick an option. It's quick and simple.",
      goRegister: "Create my account", goRegisterSub: "Join the Club and start earning points",
      goVisit: "Log my visit", goVisitSub: "Earn points for today's bill",
      goRedeem: "Redeem a reward", goRedeemSub: "Use your points and get your coupon",
      menuTiny: "To log a visit or redeem a reward we send you a code on WhatsApp.",
      needTitle: "Scan the cashier's QR", needText: "To log your visit or redeem a reward, scan the QR code on the tablet at the restaurant's cashier.", back: "Back",
      regTitle: "Create your account", regSub: "Free and takes a minute. We give you welcome points.",
      rName: "Full name", rNamePh: "E.g.: Ana Pérez", rPhone: "Your WhatsApp", rPhonePh: "E.g.: 376 4123456", rBirth: "Date of birth",
      rConsent: "I agree that Club La Ruedita may use my data to manage my account and message me on WhatsApp.",
      rBtn: "Create my account", backArrow: "← Back",
      errName: "Enter your name.", errPhone: "Check your WhatsApp number (without the 0 or 15).", errBirth: "Enter your date of birth.", errConsent: "To join you need to accept the messages and the use of your data.",
      welcome: "Welcome, {name}!", welcomeM: "Welcome, {name}!", welcomeF: "Welcome, {name}!", welcomeGeneric: "Welcome!", yourCode: "Your member code", saveIt: "Keep it: you can also sign in with your WhatsApp.",
      welcomeText: "You're now part of the Club. If you're at the restaurant, go back to the start to log your visit.", seeCard: "See my Club card",
      idTitle: "Let's confirm it's you", idSub: "Enter your WhatsApp number (the one you registered with) or your member code. We'll send you a 6-digit code.",
      idLabel: "WhatsApp or member code", idPh: "E.g.: 376 4123456  or  ANA123", idBtn: "Send me the code on WhatsApp", errId: "Enter your WhatsApp with area code, or your member code.",
      otpTitle: "Check your WhatsApp", otpSub: "If the account exists, we sent a 6-digit code. It may take a few seconds.", otpLabel: "Code", otpBtn: "Confirm",
      resend: "Resend code", changeNumber: "← Change number", errOtp6: "The code has 6 digits.", waitResend: "Wait a few seconds before asking for another code.", resent: "We sent you a new code.",
      tooMany: "Too many attempts. Wait a minute.",
      visitTitle: "Log your visit", visitTitleName: "Log your visit, {name}",
      visitSub: "Scan the QR on your payment receipt or type its code. We add points based on your bill total.",
      scanBtn: "📷 Scan receipt QR", scanClose: "Close camera", visitLabel: "Or type the payment code", visitPh: "E.g.: BF8F-AB51", visitBtn: "Log visit",
      errVisitCode: "Check the payment code.", noCamera: "This browser can't use the camera. Type the code.", camDenied: "We couldn't open the camera. Allow access or type the code.",
      visitOkTitle: "Visit logged!", added: "You earned", pointsWord: "points", forBill: "for your $ {amount} bill", totalNow: "You now have {total} points in total. Thanks for coming!", seePoints: "See my points",
      kcLost: "Your verification expired. Confirm again.",
      redeemTitle: "Redeem your reward", redeemTitleName: "{name}, redeem your reward", yourPoints: "Your points",
      redeemTiny: "When you redeem, the points are deducted and you get a coupon with a QR. Hold it up to the cashier tablet's camera to validate it. It's valid for a short time.",
      redeemBtn: "Redeem", pts: "{n} points", missing: "{n} more needed · {total} pts", noRewards: "No rewards available yet.",
      confirmClaim: "Redeem this reward now? The points are deducted and the coupon is valid for a short time.",
      couponTop: "Reward coupon", couponFor: "For {name}", couponShow: "Hold this QR up to the cashier tablet's camera.", couponNote: "This coupon can only be used once. If you don't use it in time, your points go back to your account.",
      couponLeft: "Valid for {min}:{sec} min", couponExpired: "Expired", couponExpiredNote: "This coupon expired. Your points go back to your account.", backClub: "Back to the Club",
      appHasTitle: "You already have the app installed", appHasText: "Open it to see your points and history.",
      appNoTitle: "Take the Club on your phone", appNoText: "Install the app to see your points.", appHow: "See how", appOpen: "Open the app", appOpenHint: "If it did not open, look for the La Ruedita icon on your home screen.",
      tCoupon: "I have a coupon", tScanTitle: "Hold your coupon's QR up to the camera", tScanSub: "Show it face-on, with good light.",
      tCancel: "Cancel", tValid: "VALID", tForName: "For {name}", tConfirm: "Confirm redemption", tDone: "Done!", tDoneSub: "Redemption confirmed. We notified the cashier: our staff will bring your reward.",
      tUsed: "ALREADY USED", tUsedSub: "This coupon was already redeemed.", tExpired: "EXPIRED", tExpiredSub: "This coupon expired. Your points went back to your account.",
      tModeCam: "Scan QR", tModeType: "Type code", tTypeTitle: "Type your coupon code", tTypeSub: "It is the one shown under the QR (e.g. P12345).", tCheck: "Check code", tBadCode: "Check the code (e.g. P12345).", tNotFound: "NOT VALID", tNotFoundSub: "That code doesn't match any Club coupon.", tNoCam: "Couldn't open the camera. Allow access in the browser.", tBack: "Back", tChecking: "Checking…"
    }
  };

  // Mensagens que vêm do servidor (em espanhol): traduzidas quando o idioma não é o espanhol.
  const SERVER = [
    [/c[oó]digo incorrecto o vencido/i, { pt: "Código incorreto ou vencido.", en: "Incorrect or expired code." }],
    [/ya fue usado/i, { pt: "Esse comprovante já foi usado.", en: "That receipt was already used." }],
    [/ese comprobante venci/i, { pt: "Esse comprovante venceu.", en: "That receipt expired." }],
    [/no encontramos ese c[oó]digo de pago/i, { pt: "Não encontramos esse código de pagamento. Confira.", en: "We couldn't find that payment code. Check it." }],
    [/ya ten[eé]s un cup[oó]n activo/i, { pt: "Você já tem um cupom ativo. Mostre no caixa ou espere vencer.", en: "You already have an active coupon. Show it at the cashier or wait for it to expire." }],
    [/te faltan (\d+) puntos/i, { pt: "Faltam $1 pontos.", en: "You need $1 more points." }],
    [/premio no disponible/i, { pt: "Prêmio indisponível.", en: "Reward unavailable." }],
    [/verificaci[oó]n venci/i, { pt: "Sua verificação venceu. Comece de novo.", en: "Your verification expired. Start again." }],
    [/qr venci|sesi[oó]n venci/i, { pt: "Esse QR venceu. Escaneie de novo o do caixa.", en: "That QR expired. Scan the cashier's again." }],
    [/demasiados intentos/i, { pt: "Muitas tentativas. Espere um minuto.", en: "Too many attempts. Wait a minute." }],
    [/sin conexi[oó]n/i, { pt: "Sem conexão. Tente de novo.", en: "No connection. Try again." }],
    [/no se pudo completar/i, { pt: "Não foi possível concluir. Tente de novo.", en: "Couldn't complete. Try again." }],
    [/escrib[ií] tu nombre/i, { pt: "Escreva seu nome.", en: "Enter your name." }],
    [/revis[aá] tu n[uú]mero/i, { pt: "Confira seu número de celular com DDD.", en: "Check your mobile number with area code." }],
    [/fecha de nacimiento/i, { pt: "Informe sua data de nascimento para receber seu benefício de aniversário.", en: "Enter your date of birth to get your birthday benefit." }],
    [/aceptar las comunicaciones/i, { pt: "Para entrar no clube, você precisa aceitar as comunicações e o uso dos seus dados.", en: "To join the club you need to accept the communications and the use of your data." }],
    [/ya (existe|est[aá] registrad)/i, { pt: "Esse número já tem uma conta.", en: "That number already has an account." }]
  ];

  const LANGS = ["es", "pt", "en"];
  const LOCALES = { es: "es-AR", pt: "pt-BR", en: "en-US" };
  let lang = "";
  try{ lang = localStorage.getItem("club-la-ruedita-k-lang") || ""; }catch(e){}
  if(LANGS.indexOf(lang) < 0){ const n = String(navigator.language || ""); lang = /^pt/i.test(n) ? "pt" : /^en/i.test(n) ? "en" : "es"; }

  function kt(key, vars){
    let s = (D[lang] && D[lang][key]) || D.es[key] || key;
    if(vars) Object.keys(vars).forEach(k => { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }

  // Palpite de gênero pelo primeiro nome (espanhol/português): "f", "m" ou "u" (indefinido).
  const FEM_NOT_A = new Set(["carmen","isabel","mercedes","beatriz","raquel","ruth","rocio","ines","luz","soledad","pilar","dolores","miriam","abigail","esther","judith","noemi","maribel","yasmin","jazmin","belen","lourdes","consuelo","amparo","socorro","milagros","nieves","angeles","mar","sol","paz","rosario","guadalupe","araceli","maite","lis","iris","ingrid","edith","elizabeth","jennifer","karen","nicole","sharon","shirley","tamara","vanessa","wendy","yeni","ivonne","yvonne","aylen","ayelen","brenda","brigitte","cecile","charlotte","denise","doris","estefany","gisele","giselle","jacqueline","janet","joyce","kelly","lizbeth","liz","mabel","marisol","maricel","rachel","rebeca","sabrina","stefany","susan","suzan","carol","carolin","caroline","cristal","crystal","daisy","emily","evelyn","gladys","heidi","jessica","jessie","lilian","lilibeth","lidia"]);
  const MASC_A = new Set(["luca","gianluca","joshua","borja","bautista","nicola","mustafa","jota","moshe","elia","isaia","tobia","matia","zacarias","jeremia","josua"]);
  const UNDEF = new Set(["alex","sasha","ariel","yael","kim","cris","jean","jordan","dani","ale","sam","taylor","robin","maxi","andy","charlie","nahuel"]);
  function guessGender(name){
    const first = String(name || "").trim().split(/\s+/)[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
    if(first.length < 2) return "u";
    if(UNDEF.has(first)) return "u";
    if(FEM_NOT_A.has(first)) return "f";
    if(MASC_A.has(first)) return "m";
    if(/a$/.test(first)) return "f";
    return "m";   // o, consoantes e demais: nomes comuns (Juan, Lucas, Daniel, Martín...) são masculinos
  }
  function kWelcome(name){
    const g = guessGender(name);
    return kt(g === "f" ? "welcomeF" : g === "m" ? "welcomeM" : "welcome", { name: name });
  }
  function kerr(err){
    const m = (err && err.message) || "";
    if(lang === "es") return m;
    for(const [re, out] of SERVER){ const mm = re.exec(m); if(mm) return (out[lang] || m).replace("$1", mm[1] || ""); }
    return m;
  }
  function apply(){
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i]").forEach(el => { el.textContent = kt(el.getAttribute("data-i")); });
    document.querySelectorAll("[data-ip]").forEach(el => { el.setAttribute("placeholder", kt(el.getAttribute("data-ip"))); });
    document.querySelectorAll(".langbtn").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
  }
  function setLang(l){
    lang = LANGS.indexOf(l) >= 0 ? l : "es";
    try{ localStorage.setItem("club-la-ruedita-k-lang", lang); }catch(e){}
    apply();
    if(window.__kOnLang) window.__kOnLang(lang);
  }
  window.kWelcome = kWelcome; window.kGuessGender = guessGender; window.kt = kt; window.kerr = kerr; window.kLang = () => lang; window.kLocale = () => LOCALES[lang]; window.kSetLang = setLang; window.kApply = apply;
})();
