(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString("es-AR");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  const base = location.href.split(/[?#]/)[0];
  const TK = "mkf_t_" + F.slug;
  let CF = F.conf();

  const getToken = () => { try{ return localStorage.getItem(TK) || ""; }catch(e){ return ""; } };
  const setToken = t => { try{ t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); }catch(e){} };

  function rulesText(cf){
    const by = {};
    Object.entries(cf.multipliers || {}).filter(([, v]) => v > 1).forEach(([d, v]) => (by[v] = by[v] || []).push(+d));
    const groups = Object.entries(by).map(([v, ds]) => ({ v: +v, names: ds.sort().map(d => DAYS[d]).join(" y ") }));
    return { earn: `Con cada $${fmt(cf.earn.perAmount)} que gastás sumás ${cf.earn.points} punto.`,
             extra: groups.map(g => ` Los ${g.names} valen x${g.v}.`).join(""), groups };
  }

  function paint(){
    const cf = CF;
    document.title = `${cf.club} · Sumá puntos, ganá premios`;
    $("navLogo").src = $("footLogo").src = cf.logo;
    $("navName").textContent = cf.name; $("navClub").textContent = cf.club;
    $("footName").textContent = cf.name; $("footAddr").textContent = cf.address; $("copyName").textContent = cf.name; $("yr").textContent = new Date().getFullYear();
    $("lnkMenu").href = cf.menuUrl; $("lnkDelivery").href = cf.deliveryUrl; $("lnkMaps").href = cf.mapsUrl;
    document.querySelectorAll(".cn").forEach(e => e.textContent = cf.name);
    if(cf.hero){ $("heroBg").style.backgroundImage = `url(${cf.hero})`; }
    const r = rulesText(cf);
    $("earnTxt").textContent = r.earn + r.extra;
    $("faqEarn").textContent = r.earn + r.extra + " También sumás por traer amigos y en tu cumpleaños.";
    document.querySelectorAll(".rp").forEach(e => e.textContent = fmt(cf.bonus.referral));
    $("refPts").textContent = fmt(cf.bonus.referral);

    $("rewards").innerHTML = cf.rewards.slice().sort((a, b) => a.pts - b.pts).map(w => `
      <article class="rw rv"><div class="rw-img"><img src="${esc(w.img)}" alt="${esc(w.name)}" loading="lazy"><span class="rw-pts">${fmt(w.pts)} pts</span></div>
      <div class="rw-body"><h3>${esc(w.name)}</h3><p>${esc(w.note || "")}</p><button class="btn btn-ghost" type="button" data-open-redeem>Canjear</button></div></article>`).join("");
    $("rewards").querySelectorAll("[data-open-redeem]").forEach(b => b.onclick = () => { setChat(true); startLookup(); });

    const ex = [[`+${fmt(cf.bonus.welcome)}`, "al registrarte"], [`+${fmt(cf.bonus.birthday)}`, "en tu cumpleaños"]];
    r.groups.forEach(g => ex.push([`x${g.v}`, `puntos los ${g.names}`]));
    $("extras").innerHTML = ex.map(([b, t]) => `<div class="ex"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join("");
    observe();
  }

  function observe(){
    const els = document.querySelectorAll(".rv:not(.in)");
    if(!("IntersectionObserver" in window)){ els.forEach(e => e.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    els.forEach(e => io.observe(e));
  }

  // ---------- modal ----------
  function modal(html){ $("modalBody").innerHTML = html; $("modal").hidden = false; }
  $("modalX").onclick = () => { $("modal").hidden = true; };
  $("modal").addEventListener("click", e => { if(e.target === $("modal")) $("modal").hidden = true; });

  // ---------- tarjeta de socio ----------
  function shareLinks(c){
    const link = `${base}?ref=${c.code}#unirme`;
    return { link };
  }

  function memberCard(d, opts){
    const c = d.customer, cf = CF, sh = shareLinks(c);
    const sorted = cf.rewards.slice().sort((a, b) => a.pts - b.pts), nx = sorted.find(w => w.pts > c.points);
    const pct = nx ? Math.min(100, Math.round(c.points / nx.pts * 100)) : 100;
    const pend = (d.redemptions || []).filter(r => r.status === "pendiente");
    return `
      <div class="mcard"><small>${esc(cf.club)}</small>
        <div class="big">${fmt(c.points)}<span>puntos</span></div>
        <div class="bar" style="margin:12px 0 8px"><i style="width:${pct}%"></i></div>
        <div style="font-size:13px;opacity:.85">${nx ? `Te faltan <b>${fmt(nx.pts - c.points)}</b> para <b>${esc(nx.name)}</b>` : "¡Ya podés canjear cualquier premio!"}</div>
      </div>
      ${opts.welcome ? `<p class="hint">Te sumamos <b>${fmt(cf.bonus.welcome)} puntos</b> de bienvenida. Ya podés consultar tu saldo y tus premios directamente con el asistente.</p>` : ""}
      <p class="hint" style="margin-top:14px">Tu código para invitar</p><span class="code">${esc(c.code)}</span>
      <div class="share"><button class="btn btn-ghost" type="button" data-copy="${esc(sh.link)}">Copiar link de invitación</button></div>
      ${pend.length ? `<div class="mrewards"><h4>Premios para retirar</h4>${pend.map(r => `<div class="mr"><span>${esc(r.name)}<small>Mostrá este código en caja</small></span><b class="code" style="margin:0">${esc(r.code)}</b></div>`).join("")}</div>` : ""}
      <div class="mrewards"><h4>Canjear premios</h4>${sorted.map(w => `
        <div class="mr"><span>${esc(w.name)}<small>${fmt(w.pts)} puntos</small></span><button type="button" data-claim="${esc(w.id)}" ${c.points >= w.pts ? "" : "disabled"}>Canjear</button></div>`).join("")}</div>
      ${opts.history ? `<div class="hist"><h4>Últimos movimientos</h4>${(d.history || []).slice(0, 5).map(l => `<div><span>${esc(l.note || l.type)}</span><b class="${l.points < 0 ? "neg" : ""}">${l.points > 0 ? "+" : ""}${fmt(l.points)}</b></div>`).join("") || "<div><span>Todavía no hay movimientos</span><b></b></div>"}</div>` : ""}`;
  }

  function wire(box, memberCode){
    box.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
      const t = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "¡Copiado!"; }, () => { prompt("Copiá tu link:", t); });
    });
    box.querySelectorAll("[data-claim]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      try{
        const r = (await (memberCode ? F.claimByCode(memberCode, b.dataset.claim) : F.claim(getToken(), b.dataset.claim))).redemption;
        modal(`<h3>¡Premio listo!</h3><p class="hint">${esc(r.name)}</p><div class="bigcode">${esc(r.code)}</div><p class="hint">Mostrá este código en caja para retirarlo. Lo guardamos en “Mis puntos”.</p><button class="btn full" type="button" id="okClaim">Entendido</button>`);
        $("okClaim").onclick = () => { $("modal").hidden = true; if(memberCode) submitLookup(memberCode); else showMine(); };
      }catch(e){ alert(e.message); b.disabled = false; }
    });
  }

  // ---------- asistente guiado, sin IA/API ----------
  const chat = $("clubChat"), messages = $("chatMessages"), options = $("chatOptions"), chatForm = $("chatForm"), chatInput = $("chatInput");
  let flow = null, greeted = false;
  let LANG = (() => { try { const saved=localStorage.getItem("clubruedita_lang"); return ["es","en","pt"].includes(saved)?saved:"es"; } catch (_) { return "es"; } })();
  const TXT = {
    es: {
      assistant:"Asistente Club Ruedita", subtitle:"Consultas sobre el Club y tus puntos", hello:"¡Hola! Soy el asistente virtual de Club Ruedita. ¿Qué necesitás hacer?",
      points:"Consultar mis puntos", join:"Inscribirme en el Club", questions:"Tengo otras dudas", faq:"Preguntas frecuentes",
      code:"Escribí tu código del Club Ruedita y busco tus puntos.", codePlaceholder:"Ej.: ANA123",
      name:"¡Qué bueno que quieras sumarte! ¿Cuál es tu nombre?", namePlaceholder:"Tu nombre",
      phone:n=>`Gracias, ${n}. Escribí tu número completo incluyendo el código internacional, el código de área (DDD) y el número. Por ejemplo, Brasil: +55 + DDD + número.`, phonePlaceholder:"+55 11 99999-9999", invalidPhone:"Ingresá un número válido con el código internacional, por ejemplo +55 seguido del DDD y el número.", phoneError:"No se pudo cargar el selector de país. Actualizá la página e intentá nuevamente.",
      birthday:"¿Cuál es tu fecha de nacimiento? La usamos para saludarte en tu día y acreditar tu beneficio de cumpleaños.", skipBirthday:"",
      ref:"¿Tenés el código de un amigo que te invitó? También es opcional.", refPlaceholder:"Código de invitación", noRef:"No tengo código",
      consent:"Al unirte al Club Ruedita, aceptás recibir por WhatsApp comunicaciones sobre tu membresía, puntos, beneficios, cumpleaños y encuestas después de tus visitas. También usaremos tu nombre, celular y fecha de nacimiento para administrar tu cuenta y acreditar tu beneficio de cumpleaños. Si no estás de acuerdo, no completes la inscripción. Podés darte de baja respondiendo BAJA.",
      accept:"Acepto y quiero crear mi cuenta", deny:"No autorizo",
      denied:"Entendido. Sin esta autorización no podemos crear ni administrar tu membresía. No se guardó ningún registro.",
      waConsent:"¿Querés recibir por WhatsApp novedades, promociones y beneficios de La Ruedita? Es opcional y no cambia tu membresía. Podés darte de baja cuando quieras.",
      waYes:"Sí, acepto recibir mensajes", waNo:"No, prefiero no recibir",
      saving:"Un momento, estoy guardando tu membresía…", registered:n=>`¡Listo, ${n}! Tu inscripción al Club Ruedita quedó completada y guardada.`,
      welcomePoints:n=>`Tu código de socio es ${n}. Ya recibiste tus puntos de bienvenida.`,
      waAccepted:"También registramos que aceptaste recibir novedades, promociones y beneficios por WhatsApp. Podés darte de baja cuando quieras.",
      waDeclined:"Registramos que preferís no recibir mensajes promocionales por WhatsApp. Tu membresía y tus puntos funcionan igual.",
      thanks:"¡Gracias por sumarte! Guardá tu código de socio para consultar tus puntos cuando quieras.",
      otherIntro:"Para consultas más detalladas, nuestro equipo puede ayudarte directamente por WhatsApp.",
      whatsapp:"Contactar por WhatsApp", whatsappText:"Hola, quiero hacer una consulta sobre el Club La Ruedita. ¿Me pueden ayudar?",
      noAnswer:"No pude completar el registro. Intentá nuevamente.", notFound:"No encontré ese código. Revisalo y probá de nuevo.",
      lookupHello:(n,p)=>`¡Hola, ${n}! Tenés ${p} puntos.`, memberCode:"Tu código del club: ",
      retry:"Intentar nuevamente", otherCode:"Consultar otro código", home:"Volver al inicio", anotherQuestion:"Otras dudas",
      priceQ:"¿Cuánto cuesta?", earnQ:"¿Cómo sumo puntos?", redeemQ:"¿Cómo canjeo premios?", expiryQ:"¿Los puntos vencen?",
      privacyQ:"¿Qué hacen con mis datos?", priceA:"El Club Ruedita es gratuito. No hay costo de inscripción.",
      earnA:()=>rulesText(CF).earn+rulesText(CF).extra+" También sumás por traer amigos y en tu cumpleaños.",
      redeemA:"Entrá a “Mis puntos”, elegí el premio que quieras canjear y mostrá el código en caja para retirarlo.",
      expiryA:()=>`Tus puntos vencen después de ${Number(CF.expireMonths || 12)} meses, según las reglas actuales del Club.`,
      privacyA:"Usamos tu nombre, celular y fecha de nacimiento para administrar tu membresía, tus puntos y tu beneficio de cumpleaños. Al unirte, aceptás recibir comunicaciones del club por WhatsApp. Podés darte de baja respondiendo BAJA.",
      send:"Enviar", input:"Escribí tu respuesta", faqIntro:"Elegí una pregunta frecuente o seleccioná “Otras dudas” para comunicarte con nuestro equipo.",
      retryCode:"Probar otro código", notSaved:"Tus datos no se guardaron. Intentá de nuevo."
    },
    en: {
      assistant:"La Ruedita Club Assistant", subtitle:"Questions about the Club and your points", hello:"Hello! I'm the La Ruedita Club virtual assistant. What would you like to do?",
      points:"Check my points", join:"Join the Club", questions:"I have other questions", faq:"Frequently asked questions",
      code:"Enter your La Ruedita Club code and I'll look up your points.", codePlaceholder:"e.g. ANA123",
      name:"Great that you want to join! What's your name?", namePlaceholder:"Your name",
      phone:n=>`Thanks, ${n}. Enter your full phone number, including the international country code, area code and number. For example, Brazil: +55 + area code + number.`, phonePlaceholder:"+55 11 99999-9999", invalidPhone:"Enter a valid number including the international country code, such as +55 followed by the area code and number.", phoneError:"The country selector could not load. Refresh the page and try again.",
      birthday:"What's your date of birth? We use it to greet you and provide your birthday benefit.", skipBirthday:"",
      ref:"Do you have the code of the friend who invited you? This is optional.", refPlaceholder:"Invitation code", noRef:"I don't have a code",
      consent:"By joining La Ruedita Club, you agree to receive WhatsApp messages about your membership, points, benefits, birthday and post-visit surveys. We also use your name, phone number and date of birth to manage your account and birthday benefit. If you do not agree, do not complete registration. Reply BAJA to unsubscribe.",
      accept:"I agree and want to create my account", deny:"I do not agree",
      denied:"Understood. Without this permission, we can't create or manage your membership. No registration was saved.",
      waConsent:"Would you like to receive La Ruedita news, promotions and benefits on WhatsApp? This is optional and does not affect your membership. You can unsubscribe at any time.",
      waYes:"Yes, I agree to receive messages", waNo:"No, I prefer not to",
      saving:"One moment, we're saving your membership…", registered:n=>`You're all set, ${n}! Your La Ruedita Club registration is complete.`,
      welcomePoints:n=>`Your member code is ${n}. Your welcome points have been added.`,
      waAccepted:"We've recorded your consent to receive news, promotions and benefits on WhatsApp. You can unsubscribe at any time.",
      waDeclined:"We've recorded that you prefer not to receive promotional WhatsApp messages. Your membership and points work the same way.",
      thanks:"Thanks for joining! Keep your member code to check your points whenever you like.",
      otherIntro:"For more detailed questions, our team can help you directly on WhatsApp.",
      whatsapp:"Contact us on WhatsApp", whatsappText:"Hello, I have a question about the La Ruedita Club. Can you help me?",
      noAnswer:"We couldn't complete your registration. Please try again.", notFound:"We couldn't find that code. Please check it and try again.",
      lookupHello:(n,p)=>`Hello, ${n}! You have ${p} points.`, memberCode:"Your Club code: ",
      retry:"Try again", otherCode:"Check another code", home:"Back to the beginning", anotherQuestion:"Other questions",
      priceQ:"Is it free?", earnQ:"How do I earn points?", redeemQ:"How do I redeem rewards?", expiryQ:"Do points expire?",
      privacyQ:"How is my data used?", priceA:"Joining the La Ruedita Club is free. There is no registration fee.",
      earnA:()=>{const r=CF.earn;let x=`You earn ${r.points} point(s) for every $${fmt(r.perAmount)} spent.`;Object.entries(CF.multipliers||{}).forEach(([d,v])=>{if(v>1)x+=` The points multiplier is x${v} on ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}.`;});return x+" Bonus points may also be available for referrals and birthdays.";},
      redeemA:"Open “My points”, choose the reward you want and show the redemption code at the register.",
      expiryA:()=>`Points expire after ${Number(CF.expireMonths || 12)} months, according to the Club's current rules.`,
      privacyA:"We use your name, phone number and date of birth to manage your membership, points and birthday benefit. By joining, you agree to receive Club messages on WhatsApp. Reply BAJA to unsubscribe.",
      send:"Send", input:"Type your answer", faqIntro:"Choose a frequently asked question or select “Other questions” to contact our team.",
      retryCode:"Try another code", notSaved:"Your information was not saved. Please try again."
    }
  };
  TXT.pt = Object.assign({}, TXT.es, {
    assistant:"Assistente Club La Ruedita", subtitle:"Dúvidas sobre o Clube e seus pontos", hello:"Olá! Sou o assistente virtual do Club La Ruedita. O que você gostaria de fazer?",
    points:"Consultar meus pontos", join:"Participar do Clube", questions:"Tenho outras dúvidas", faq:"Perguntas frequentes",
    code:"Digite seu código do Club La Ruedita para consultar seus pontos.", codePlaceholder:"Ex.: ANA123", name:"Que bom que você quer participar! Qual é o seu nome?", namePlaceholder:"Seu nome",
    phone:n=>"Obrigado, "+n+". Digite seu telefone completo, incluindo código internacional, código de área e número. Exemplo Brasil: +55 + DDD + número.", phonePlaceholder:"+55 11 99999-9999", invalidPhone:"Digite um telefone válido com código internacional.",
    birthday:"Qual é sua data de nascimento? Usamos essa informação para oferecer seu benefício de aniversário.", ref:"Você tem o código de um amigo que convidou você? É opcional.", refPlaceholder:"Código de convite", noRef:"Não tenho código",
    consent:"Ao participar do Club La Ruedita, você concorda em receber pelo WhatsApp comunicações sobre sua associação, pontos, benefícios, aniversário e pesquisas após suas visitas. Também usaremos seu nome, telefone e data de nascimento para administrar sua conta. Para cancelar, responda BAJA.",
    accept:"Aceito e quero criar minha conta", deny:"Não autorizo", denied:"Entendido. Nenhum cadastro foi salvo.", waConsent:"Você gostaria de receber novidades, promoções e benefícios pelo WhatsApp? É opcional e você pode cancelar quando quiser.",
    waYes:"Sim, aceito receber mensagens", waNo:"Não, prefiro não receber", saving:"Um momento, estamos salvando sua associação…", registered:n=>"Tudo certo, "+n+"! Seu cadastro no Club La Ruedita foi concluído.",
    welcomePoints:n=>"Seu código de associado é "+n+". Seus pontos de boas-vindas já foram adicionados.", waAccepted:"Registramos seu consentimento para receber novidades e promoções pelo WhatsApp.", waDeclined:"Registramos que você prefere não receber mensagens promocionais. Sua associação e seus pontos funcionam normalmente.",
    thanks:"Obrigado por participar! Guarde seu código de associado para consultar seus pontos.", otherIntro:"Para dúvidas mais detalhadas, nossa equipe pode ajudar pelo WhatsApp.", whatsapp:"Falar pelo WhatsApp", whatsappText:"Olá, tenho uma dúvida sobre o Club La Ruedita. Podem me ajudar?",
    noAnswer:"Não foi possível concluir seu cadastro. Tente novamente.", notFound:"Não encontramos esse código. Confira e tente novamente.", lookupHello:(n,p)=>"Olá, "+n+"! Você tem "+p+" pontos.", memberCode:"Seu código do Clube: ",
    retry:"Tentar novamente", otherCode:"Consultar outro código", home:"Voltar ao início", anotherQuestion:"Outras dúvidas", priceQ:"Quanto custa?", earnQ:"Como ganho pontos?", redeemQ:"Como resgato prêmios?", expiryQ:"Os pontos vencem?",
    privacyQ:"Como meus dados são usados?", priceA:"Participar do Club La Ruedita é gratuito.", earnA:()=>"Você ganha pontos a cada compra e também pode ganhar pontos extras por indicações e no aniversário.",
    redeemA:"Acesse “Meus pontos”, escolha o prêmio e apresente o código no caixa.", expiryA:()=>"Seus pontos vencem após "+Number(CF.expireMonths||12)+" meses, conforme as regras atuais do Clube.",
    privacyA:"Usamos seu nome, telefone e data de nascimento para administrar sua associação, pontos e benefício de aniversário. Para cancelar mensagens, responda BAJA.", send:"Enviar", input:"Digite sua resposta", faqIntro:"Escolha uma pergunta frequente ou selecione “Outras dúvidas” para falar com nossa equipe.",
    retryCode:"Tentar outro código", notSaved:"Seus dados não foram salvos. Tente novamente.", continueHere:"Continuar por aqui", installApp:"Instalar o aplicativo"
  });
  const T = key => TXT[LANG][key];
  function addMessage(text, who="bot", html=false){
    const item=document.createElement("div"); item.className=`chat-bubble ${who==="user"?"user":"bot"}`;
    if(html)item.innerHTML=text;else item.textContent=text;
    messages.append(item);messages.scrollTop=messages.scrollHeight;return item;
  }
  function showOptions(items){
    options.replaceChildren();items.forEach(([label,fn])=>{const b=document.createElement("button");b.type="button";b.className="chat-choice";b.textContent=label;b.onclick=fn;options.append(b);});options.hidden=!items.length;
  }
  function ask(text,placeholder,extra=[],inputType="text"){
    addMessage(text);chatForm.hidden=false;chatInput.placeholder=placeholder;chatInput.value="";chatInput.type=inputType;chatInput.autocomplete="off";chatInput.focus();showOptions(extra);
  }
  function showMainOptions(){showOptions([[T("points"),startLookup],[T("join"),startJoin],[T("questions"),startFaq]]);}
  function welcome(){
    flow=null;messages.replaceChildren();greeted=true;addMessage(T("hello"));
    chatForm.hidden=true;
    showOptions([[T("continueHere"),showMainOptions],[T("installApp"),installClubApp]]);
  }
    function openWhatsApp(){
    const text=encodeURIComponent(T("whatsappText"));
    const url=`https://wa.me/${String(CF.whatsapp||"").replace(/\D/g,"")}?text=${text}`;
    addMessage(T("otherIntro"));
    showOptions([[T("whatsapp"),()=>window.open(url,"_blank","noopener,noreferrer")],[T("home"),welcome]]);
  }
  function startFaq(){
    flow={type:"faq"};chatForm.hidden=true;addMessage(T("faqIntro"));
    showOptions([
      [T("priceQ"),()=>answerFaq("price")],[T("earnQ"),()=>answerFaq("earn")],
      [T("redeemQ"),()=>answerFaq("redeem")],[T("expiryQ"),()=>answerFaq("expiry")],
      [T("privacyQ"),()=>answerFaq("privacy")],[T("anotherQuestion"),openWhatsApp],[T("home"),welcome]
    ]);
  }
  function answerFaq(topic){
    const answers={price:T("priceA"),earn:T("earnA")(),redeem:T("redeemA"),expiry:T("expiryA")(),privacy:T("privacyA")};
    addMessage(answers[topic]);showOptions([[T("anotherQuestion"),openWhatsApp],[T("faq"),startFaq],[T("home"),welcome]]);
  }
  function startJoin(){
    const inviteCode=new URLSearchParams(location.search).get("ref")||"";
    flow={type:"join",step:"name",data:{ref:inviteCode}};
    ask(inviteCode?(LANG==="en"?"A friend invited you to join La Ruedita Club. What is your name?":LANG==="pt"?"Um amigo convidou você para participar do Club La Ruedita. Qual é seu nome?":"¡Hola! Llegaste por la invitación de un amigo para sumarte al Club Ruedita. ¿Cuál es tu nombre?"):T("name"),T("namePlaceholder"));
  }
  function startLookup(){flow={type:"lookup",step:"code"};ask(T("code"),T("codePlaceholder"));}
  async function nextJoin(){
    const d=flow.data;
    if(flow.step==="name"){d.name=flow.value;flow.step="phone";ask(T("phone")(d.name.split(" ")[0]),T("phonePlaceholder"),[],"tel");}
    else if(flow.step==="phone"){
      const raw=String(flow.value||"").trim();
      const digits=raw.replace(/\D/g,"");
      if(!raw.startsWith("+") || digits.length<10 || digits.length>15){addMessage(T("invalidPhone"));ask(T("phone")(d.name.split(" ")[0]),T("phonePlaceholder"),[],"tel");return;}
      d.phone="+"+digits;
      flow.step="birthday";ask(T("birthday"),"YYYY-MM-DD");chatInput.type="date";
    }
    else if(flow.step==="birthday"){afterBirthday(flow.value);}
    else if(flow.step==="ref"){d.ref=flow.value.toUpperCase();askConsent();}
  }
  function afterBirthday(value){flow.data.birthday=value;if(flow.data.ref)askConsent();else{flow.step="ref";ask(T("ref"),T("refPlaceholder"),[[T("noRef"),()=>{flow.data.ref="";askConsent();}]]);}}
  function askConsent(){
    flow.step="consent";chatForm.hidden=true;addMessage(T("consent"));
    showOptions([[T("accept"),()=>submitJoin(true)],[T("deny"),()=>{flow=null;addMessage(T("denied"));showOptions([[T("home"),welcome],[T("join"),startJoin]]);} ]]);
  }
  function askWhatsAppConsent(){
    flow.step="whatsapp";chatForm.hidden=true;addMessage(T("waConsent"));
    showOptions([[T("waYes"),()=>submitJoin(true)],[T("waNo"),()=>submitJoin(false)]]);
  }
  async function submitJoin(waConsent){
    if(!flow||flow.step!=="consent"||waConsent!==true)return;
    flow.data.consent=true;flow.data.waConsent=waConsent;showOptions([]);addMessage(T("saving"));
    try{
      const r=await F.register(flow.data);setToken(r.token);let d;
      try{d=await F.me(r.token);}catch{
        messages.replaceChildren();addMessage(T("registered")(r.customer.name.split(" ")[0]));
        addMessage(T("welcomePoints")(r.customer.code));addMessage(waConsent?T("waAccepted"):T("waDeclined"));
        showOptions([[T("points"),startLookup],[T("home"),welcome]]);chatForm.hidden=true;flow=null;return;
      }
      messages.replaceChildren();addMessage(T("registered")(d.customer.name.split(" ")[0]));
      addMessage(memberCard(d,{welcome:true}),"bot",true);wire(messages);addMessage(waConsent?T("waAccepted"):T("waDeclined"));addMessage(T("thanks"));
      showOptions([[T("points"),startLookup],[T("home"),welcome]]);chatForm.hidden=true;flow=null;
    }catch(e){addMessage(e.message||T("noAnswer"));showOptions([[T("retry"),startJoin],[T("home"),welcome]]);chatForm.hidden=true;}
  }
  async function submitLookup(code){
    const memberCode=code.trim().toUpperCase();
    addMessage(LANG==="en"?"Looking up your points…":LANG==="pt"?"Consultando seus pontos…":"Estoy buscando tu saldo…");showOptions([]);chatForm.hidden=true;
    try{
      const d=await F.lookupCode(memberCode);
      messages.replaceChildren();
      addMessage(T("lookupHello")(d.customer.name,fmt(d.customer.points)));
      if(d.customer.code)addMessage(T("memberCode")+d.customer.code);
      addMessage(memberCard(d,{history:false}),"bot",true);
      wire(messages,d.customer.code);
      showOptions([[T("otherCode"),startLookup],[T("home"),welcome]]);
    }catch(e){
      addMessage(e.code==="customer-not-found"?T("notFound"):(e.message||T("notFound")));
      showOptions([[T("retryCode"),startLookup],[T("home"),welcome]]);
    }
    flow=null;
  }
  function submitAnswer(value){
    const v=value.trim();if(!v)return;addMessage(v,"user");chatForm.hidden=true;showOptions([]);
    if(!flow){welcome();return;}
    if(flow.type==="lookup"){submitLookup(v);return;}
    if(flow.type==="join"){flow.value=v;nextJoin();}
  }
  chatForm.addEventListener("submit",e=>{e.preventDefault();submitAnswer(chatInput.value);});
  $("chatClose").onclick=()=>setChat(false);
  const openChatButtons=["chatOpenTop","chatOpenAction"];
  openChatButtons.forEach(id=>{const b=$(id);if(b)b.onclick=()=>setChat(true);});
  function translatePage(){
    const en=LANG==="en";
    document.documentElement.lang=LANG==="pt"?"pt-BR":LANG;
    const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
    set("#chatOpenAction",en?"Talk to the assistant":LANG==="pt"?"Falar com o assistente":"Hablar con el asistente");
    set("#navClub",en?"Loyalty Club":"Club de clientes");
    const pairs=[
      [".nav-links a:nth-child(1)","How it works","Cómo funciona"],[".nav-links a:nth-child(2)","Rewards","Premios"],[".nav-links a:nth-child(3)","Invite friends","Invitá"],[".nav-links a:nth-child(4)","My points","Mis puntos"],
      [".hero-copy .eyebrow","Customer club · Free","Club de clientes · Gratis"],[".hero-copy h1","Every visit brings you closer to your next reward","Cada visita te acerca a tu próximo premio"],
      [".hero-copy .lead","Earn points when you visit, invite friends and redeem gifts. No app needed.","Sumá puntos cuando venís, invitá a tus amigos y canjeá regalos. Sin app, en 30 segundos."],
      [".hero-cta .btn:first-child","I want points","Quiero mis puntos"],[".hero-cta .btn-ghost","I'm already a member","Ya soy del club"],
      [".trust li:nth-child(1)","Free","Gratis"],[".trust li:nth-child(2)","No download required","Sin descargar nada"],[".trust li:nth-child(3)","Real rewards","Premios reales"],
      ["#como .eyebrow","How it works","Cómo funciona"],["#como h2","It's that simple","Así de simple"],["#como .sub","Three steps. That's all.","Tres pasos. Nada más."],
      ["#como .step:nth-child(1) h3","Sign up","Registrate"],["#como .step:nth-child(1) p","Enter your name and mobile number. Get welcome points.","Dejá tu nombre y número de celular. Ganás puntos de bienvenida."],
      ["#como .step:nth-child(2) h3","Earn points","Sumá puntos"],["#como .step:nth-child(3) h3","Redeem rewards","Canjeá premios"],["#como .step:nth-child(3) p","Choose your gift and show the code at the register.","Elegí tu regalo y mostrá el código en caja."],
      ["#premios .eyebrow","Rewards","Premios"],["#premios h2","Rewards worth enjoying","Regalos que se disfrutan"],["#premios .sub","The more you visit, the more you enjoy.","Cuanto más venís, más rico se pone."],
      ["#invita .eyebrow","Invite & earn","Invitá y ganá"],["#invita h2","Your friend visits. You both win.","Tu amigo come. Ustedes dos ganan."],["#invita .sub","Share your code. When your friend visits for the first time, you both earn points.","Compartí tu código. Cuando tu amigo nos visita por primera vez, puntos para cada uno."],
      ["#unirme .eyebrow","It's time","Es hora"],["#unirme h2","Join the Club","Unite al club"],["#unirme .sub","It takes less than a minute.","Tarda menos de un minuto."],
      ["#puntos p","Have questions or want to join? The assistant can help with your points, rewards and membership.","¿Tenés dudas o querés sumarte? El asistente puede ayudarte con tus puntos, tus premios y tu ingreso al Club Ruedita."],
      ["#faq .eyebrow","Questions","Dudas"],["#faq h2","Frequently asked questions","Preguntas frecuentes"],
      ["#faq details:nth-of-type(1) summary","Is it free?","¿Cuánto cuesta?"],["#faq details:nth-of-type(1) p","The Club is free.","Nada. El club es gratis."],
      ["#faq details:nth-of-type(2) summary","Do I need to download an app?","¿Tengo que descargar una app?"],["#faq details:nth-of-type(2) p","You can use the website or install the Club app on your phone.","Podés usar el sitio o instalar la aplicación del Club en tu celular."],
      ["#faq details:nth-of-type(4) summary","How do I redeem a reward?","¿Cómo canjeo un premio?"],["#faq details:nth-of-type(4) p","Go to “My points”, choose a reward and show the code at the register.","Entrá a “Mis puntos”, elegí el premio y mostrá el código en caja. Te lo entregamos al momento."],
      ["#faq details:nth-of-type(5) summary","Do points expire?","¿Los puntos vencen?"],["#faq details:nth-of-type(5) p",`Yes: after ${Number(CF.expireMonths||12)} months, according to the Club's rules.`,"Sí: pasados 12 meses sin visitas. Así no se pierden si venís seguido."],
      ["#faq details:nth-of-type(6) summary","How is my data used?","¿Qué hacen con mis datos?"],
      ["#footAddr",CF.address,CF.address],
      ["#cookiePreferences","Cookie preferences","Preferencias de cookies"]
    ];
        pairs.forEach(([sel,english,spanish])=>set(sel,en?english:spanish));
    if(LANG==="pt"){
      const ptPage={
        ".nav-links a:nth-child(1)":"Como funciona",".nav-links a:nth-child(2)":"Prêmios",".nav-links a:nth-child(3)":"Indique amigos",".nav-links a:nth-child(4)":"Meus pontos",
        ".hero-copy .eyebrow":"Clube de clientes · Grátis",".hero-copy h1":"Cada visita aproxima você do seu próximo prêmio",".hero-copy .lead":"Ganhe pontos quando vier, convide amigos e troque por presentes. Em 30 segundos.",
        ".hero-cta .btn:first-child":"Quero meus pontos",".hero-cta .btn-ghost":"Já faço parte do clube",".trust li:nth-child(1)":"Grátis",".trust li:nth-child(2)":"Sem precisar baixar nada",".trust li:nth-child(3)":"Prêmios de verdade",
        "#como .eyebrow":"Como funciona","#como h2":"É muito simples","#como .sub":"Três passos. Só isso.","#como .step:nth-child(1) h3":"Cadastre-se","#como .step:nth-child(1) p":"Informe seu nome, celular e data de nascimento. Ganhe pontos de boas-vindas e benefício de aniversário.","#como .step:nth-child(2) h3":"Ganhe pontos","#como .step:nth-child(3) h3":"Troque por prêmios","#como .step:nth-child(3) p":"Escolha seu presente e apresente o código no caixa.",
        "#premios .eyebrow":"Prêmios","#premios h2":"Presentes para aproveitar","#premios .sub":"Quanto mais você vem, mais você aproveita.","#invita .eyebrow":"Indique e ganhe","#invita h2":"Seu amigo vem. Os dois ganham.","#invita .sub":"Compartilhe seu código. Quando seu amigo nos visitar pela primeira vez, vocês dois ganham pontos.",
        "#unirme .eyebrow":"Está na hora","#unirme h2":"Faça parte do clube","#unirme .sub":"Leva menos de um minuto.","#puntos p":"Tem dúvidas ou quer participar? O assistente pode ajudar com seus pontos, prêmios e cadastro.","#chatOpenAction":"Falar com o assistente",
        "#faq .eyebrow":"Dúvidas","#faq h2":"Perguntas frequentes","#faq details:nth-of-type(1) summary":"Quanto custa?","#faq details:nth-of-type(1) p":"Nada. O clube é gratuito.","#faq details:nth-of-type(2) summary":"Preciso baixar um aplicativo?","#faq details:nth-of-type(2) p":"Você pode usar o site ou instalar o aplicativo do Clube no celular.","#faq details:nth-of-type(4) summary":"Como resgato um prêmio?","#faq details:nth-of-type(4) p":"Acesse “Meus pontos”, escolha o prêmio e apresente o código no caixa.","#faq details:nth-of-type(5) summary":"Os pontos vencem?","#faq details:nth-of-type(5) p":"Sim: após "+Number(CF.expireMonths||12)+" meses, conforme as regras do Clube.","#faq details:nth-of-type(6) summary":"Como meus dados são utilizados?","#cookiePreferences":"Preferências de cookies",
        "#cookieBanner b":"Sua privacidade importa","#cookieBanner p":"Usamos cookies necessários para o funcionamento do Clube. Com sua permissão, também poderemos usar cookies de análise e marketing.","#cookieReject":"Recusar opcionais","#cookieCustomize":"Personalizar","#cookieAccept":"Aceitar todos",
        "#pwaInstallBanner b":"Leve o Club La Ruedita no seu celular!","#pwaInstallBanner p":"Instale o app e tenha seus pontos, prêmios e promoções sempre à mão.","#pwaInstallBtn":"Instalar agora"
      };
      Object.entries(ptPage).forEach(([sel,value])=>set(sel,value));
      set("#navClub","Clube de fidelidade");
    }
    $("langToggle").value=LANG;$("chatLangToggle").value=LANG;
    set(".chat-head b",T("assistant"));set(".chat-head small",T("subtitle"));
    const close=$("chatClose");if(close)close.setAttribute("aria-label",en?"Close assistant":"Cerrar asistente");

  }
  function changeLanguage(event){
    LANG=event && event.target && event.target.value || "es";try{localStorage.setItem("clubruedita_lang",LANG);}catch(_){}
    translatePage();welcome();
  }
  $("langToggle").onchange=changeLanguage;$("chatLangToggle").onchange=changeLanguage;
  function setChat(open,skipWelcome=false){
    chat.hidden=!open;openChatButtons.forEach(id=>{const b=$(id);if(b)b.setAttribute("aria-expanded",String(open));});
    if(skipWelcome)greeted=true;if(open&&!greeted)welcome();if(open)chatInput.focus();
  }

  // ---------- instalación PWA ----------
  let deferredInstallPrompt=null;
  const installBanner=$("pwaInstallBanner");
  function isStandalone(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;}
  function installHelp(){const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);const message=ios?(LANG==="pt"?"Para instalar: toque em Compartilhar no Safari e escolha “Adicionar à Tela de Início”.":LANG==="en"?"To install: tap Share in Safari and choose “Add to Home Screen”.":"Para instalar: tocá en Compartir en Safari y elegí “Agregar a pantalla de inicio”."):(LANG==="pt"?"Para instalar: abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.":LANG==="en"?"To install: open the browser menu and choose “Install app” or “Add to Home Screen”.":"Para instalar: abrí el menú del navegador y elegí “Instalar aplicación” o “Agregar a pantalla de inicio”.");addMessage(message);showOptions([[T("continueHere"),showMainOptions],[LANG==="en"?"Back":LANG==="pt"?"Voltar":"Volver",welcome]]);}
  async function installClubApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(choice&&choice.outcome==="accepted"){if(installBanner)installBanner.hidden=true;addMessage("La instalación de la aplicación comenzó.");showMainOptions();return;}}installHelp();}
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;if(installBanner&&!isStandalone())installBanner.hidden=false;});
  window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;if(installBanner)installBanner.hidden=true;});
  if(installBanner){$("pwaInstallBtn").addEventListener("click",installClubApp);$("pwaInstallClose").addEventListener("click",()=>installBanner.hidden=true);if(!isStandalone())setTimeout(()=>{if(!deferredInstallPrompt)installBanner.hidden=false;},900);}
  if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("PWA service worker:",err)));}
  // ---------- sessão já existente ----------
  async function showMine(){
    const t = getToken(); if(!t) return false;
    try{
      const d = await F.me(t); messages.replaceChildren();
      addMessage(`¡Hola otra vez, ${esc(d.customer.name.split(" ")[0])}! Esta es tu tarjeta del club.`, "bot");
      addMessage(memberCard(d, { history: true }), "bot", true); wire(messages);
      showOptions([["Consultar otro código", startLookup], ["Volver al inicio", welcome]]); greeted = true; chatForm.hidden = true; return true;
    }catch(e){ if(e.code === "token") setToken(""); return false; }
  }


  // ---------- consentimiento de cookies ----------
  const COOKIE_KEY = "clubruedita_cookie_consent_v1";
  const cookieBanner = $("cookieBanner"), cookiePanel = $("cookiePanel");
  const cookieAnalytics = $("cookieAnalytics"), cookieMarketing = $("cookieMarketing");
  function readCookieConsent(){
    try { return JSON.parse(localStorage.getItem(COOKIE_KEY) || "null"); } catch (_) { return null; }
  }
  function saveCookieConsent(analytics, marketing){
    const consent = { necessary:true, analytics:!!analytics, marketing:!!marketing, updatedAt:new Date().toISOString() };
    try { localStorage.setItem(COOKIE_KEY, JSON.stringify(consent)); } catch (_) {}
    cookieBanner.hidden = true; cookiePanel.hidden = true;
    cookieAnalytics.checked = consent.analytics; cookieMarketing.checked = consent.marketing;
  }
  function openCookieSettings(){
    const saved = readCookieConsent();
    cookieAnalytics.checked = !!saved?.analytics;
    cookieMarketing.checked = !!saved?.marketing;
    cookiePanel.hidden = false;
  }
  function initCookieConsent(){
    const saved = readCookieConsent();
    if(saved){ cookieAnalytics.checked=!!saved.analytics; cookieMarketing.checked=!!saved.marketing; }
    else cookieBanner.hidden = false;
    $("cookieAccept").onclick = () => saveCookieConsent(true,true);
    $("cookieReject").onclick = () => saveCookieConsent(false,false);
    $("cookieCustomize").onclick = openCookieSettings;
    $("cookiePreferences").onclick = openCookieSettings;
    $("cookiePanelClose").onclick = () => { cookiePanel.hidden = true; };
    $("cookieSave").onclick = () => saveCookieConsent(cookieAnalytics.checked,cookieMarketing.checked);
    $("cookiePanelAccept").onclick = () => saveCookieConsent(true,true);
    cookiePanel.addEventListener("click", e => { if(e.target===cookiePanel) cookiePanel.hidden=true; });
  }

  // ---------- arranque ----------
  (async function(){
    initCookieConsent();
    CF = await F.init(); paint(); translatePage();
    const q = new URLSearchParams(location.search);
    // Cada visitante comienza por la bienvenida; nunca recuperamos automáticamente una cuenta anterior.
    const ref = q.get("ref");
    if(ref){ setChat(true, true); startJoin(); }
    else { setChat(true); }
  })();
})();
