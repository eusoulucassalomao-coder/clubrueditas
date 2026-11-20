// Textos da página do cliente (/k) em espanhol e português.
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
      welcome: "¡Bienvenido/a, {name}!", welcomeGeneric: "¡Bienvenido/a!", yourCode: "Tu código de socio", saveIt: "Guardalo: también podés ingresar con tu WhatsApp.",
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
      redeemTiny: "Al canjear, se descuentan los puntos y recibís un cupón con QR para mostrar en la caja. Vale por poco tiempo.",
      redeemBtn: "Canjear", pts: "{n} puntos", missing: "Te faltan {n} · {total} pts", noRewards: "Todavía no hay premios cargados.",
      confirmClaim: "¿Canjear este premio ahora? Se descuentan los puntos y el cupón vale por poco tiempo.",
      couponTop: "Cupón de premio", couponFor: "Para {name}", couponShow: "Mostrá este cupón en la caja.", couponNote: "Este cupón se puede usar una sola vez. Si no lo usás a tiempo, tus puntos vuelven a tu cuenta.",
      couponLeft: "Vale por {min}:{sec} min", couponExpired: "Vencido", couponExpiredNote: "Este cupón venció. Tus puntos vuelven a tu cuenta.", backClub: "Volver al Club",
      appHasTitle: "Ya tenés la app instalada", appHasText: "Abrila desde el ícono de La Ruedita para ver tus puntos y tu historial.",
      appNoTitle: "Llevá el Club en tu celular", appNoText: "Instalá la app para ver tus puntos.", appHow: "Ver cómo"
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
      welcome: "Bem-vindo(a), {name}!", welcomeGeneric: "Bem-vindo(a)!", yourCode: "Seu código de sócio", saveIt: "Guarde: você também pode entrar com seu WhatsApp.",
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
      redeemTiny: "Ao resgatar, os pontos são descontados e você recebe um cupom com QR para mostrar no caixa. Vale por pouco tempo.",
      redeemBtn: "Resgatar", pts: "{n} pontos", missing: "Faltam {n} · {total} pts", noRewards: "Ainda não há prêmios cadastrados.",
      confirmClaim: "Resgatar este prêmio agora? Os pontos são descontados e o cupom vale por pouco tempo.",
      couponTop: "Cupom de prêmio", couponFor: "Para {name}", couponShow: "Mostre este cupom no caixa.", couponNote: "Este cupom só pode ser usado uma vez. Se você não usar a tempo, seus pontos voltam para sua conta.",
      couponLeft: "Vale por {min}:{sec} min", couponExpired: "Vencido", couponExpiredNote: "Este cupom venceu. Seus pontos voltam para sua conta.", backClub: "Voltar ao Clube",
      appHasTitle: "Você já tem o app instalado", appHasText: "Abra pelo ícone da La Ruedita para ver seus pontos e seu histórico.",
      appNoTitle: "Leve o Clube no seu celular", appNoText: "Instale o app para ver seus pontos.", appHow: "Ver como"
    }
  };

  // Mensagens que vêm do servidor (em espanhol): traduzidas para o português quando preciso.
  const SERVER_PT = [
    [/c[oó]digo incorrecto o vencido/i, "Código incorreto ou vencido."],
    [/ya fue usado/i, "Esse comprovante já foi usado."],
    [/ese comprobante venci/i, "Esse comprovante venceu."],
    [/no encontramos ese c[oó]digo de pago/i, "Não encontramos esse código de pagamento. Confira."],
    [/ya ten[eé]s un cup[oó]n activo/i, "Você já tem um cupom ativo. Mostre no caixa ou espere vencer."],
    [/te faltan (\d+) puntos/i, "Faltam $1 pontos."],
    [/premio no disponible/i, "Prêmio indisponível."],
    [/verificaci[oó]n venci/i, "Sua verificação venceu. Comece de novo."],
    [/qr venci|sesi[oó]n venci/i, "Esse QR venceu. Escaneie de novo o do caixa."],
    [/demasiados intentos/i, "Muitas tentativas. Espere um minuto."],
    [/sin conexi[oó]n/i, "Sem conexão. Tente de novo."],
    [/no se pudo completar/i, "Não foi possível concluir. Tente de novo."],
    [/escrib[ií] tu nombre/i, "Escreva seu nome."],
    [/revis[aá] tu n[uú]mero/i, "Confira seu número de celular com DDD."],
    [/fecha de nacimiento/i, "Informe sua data de nascimiento para receber seu benefício de aniversário."],
    [/aceptar las comunicaciones/i, "Para entrar no clube, você precisa aceitar as comunicações e o uso dos seus dados."],
    [/ya (existe|est[aá] registrad)/i, "Esse número já tem uma conta."]
  ];

  let lang = "es";
  try{ lang = localStorage.getItem("club-la-ruedita-k-lang") || ""; }catch(e){}
  if(lang !== "es" && lang !== "pt") lang = /^pt/i.test(navigator.language || "") ? "pt" : "es";

  function kt(key, vars){
    let s = (D[lang] && D[lang][key]) || D.es[key] || key;
    if(vars) Object.keys(vars).forEach(k => { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }
  function kerr(err){
    const m = (err && err.message) || "";
    if(lang === "es") return m;
    for(const [re, out] of SERVER_PT){ const mm = re.exec(m); if(mm) return out.replace("$1", mm[1] || ""); }
    return m;
  }
  function apply(){
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i]").forEach(el => { el.textContent = kt(el.getAttribute("data-i")); });
    document.querySelectorAll("[data-ip]").forEach(el => { el.setAttribute("placeholder", kt(el.getAttribute("data-ip"))); });
    document.querySelectorAll(".langbtn").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
  }
  function setLang(l){
    lang = l === "pt" ? "pt" : "es";
    try{ localStorage.setItem("club-la-ruedita-k-lang", lang); }catch(e){}
    apply();
    if(window.__kOnLang) window.__kOnLang(lang);
  }
  window.kt = kt; window.kerr = kerr; window.kLang = () => lang; window.kSetLang = setLang; window.kApply = apply;
})();
