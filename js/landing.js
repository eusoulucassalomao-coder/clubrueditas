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
    $("faqEarn").textContent = r.earn + r.extra + " También sumás por traer amigos, en tu cumpleaños y por dejar tu reseña.";
    document.querySelectorAll(".rp").forEach(e => e.textContent = fmt(cf.bonus.referral));
    $("refPts").textContent = fmt(cf.bonus.referral);

    $("rewards").innerHTML = cf.rewards.slice().sort((a, b) => a.pts - b.pts).map(w => `
      <article class="rw rv"><div class="rw-img"><img src="${esc(w.img)}" alt="${esc(w.name)}" loading="lazy"><span class="rw-pts">${fmt(w.pts)} pts</span></div>
      <div class="rw-body"><h3>${esc(w.name)}</h3><p>${esc(w.note || "")}</p></div></article>`).join("");

    const ex = [[`+${fmt(cf.bonus.welcome)}`, "al registrarte"], [`+${fmt(cf.bonus.birthday)}`, "en tu cumpleaños"], [`+${fmt(cf.bonus.review)}`, "por tu reseña en Google"]];
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

  function wire(box){
    box.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
      const t = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "¡Copiado!"; }, () => { prompt("Copiá tu link:", t); });
    });
    box.querySelectorAll("[data-claim]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      try{
        const r = (await F.claim(getToken(), b.dataset.claim)).redemption;
        modal(`<h3>¡Premio listo!</h3><p class="hint">${esc(r.name)}</p><div class="bigcode">${esc(r.code)}</div><p class="hint">Mostrá este código en caja para retirarlo. Lo guardamos en “Mis puntos”.</p><button class="btn full" type="button" id="okClaim">Entendido</button>`);
        $("okClaim").onclick = () => { $("modal").hidden = true; showMine(); };
      }catch(e){ alert(e.message); b.disabled = false; }
    });
  }

  // ---------- asistente conversacional ----------
  const chat = $("clubChat"), messages = $("chatMessages"), options = $("chatOptions"), chatForm = $("chatForm"), chatInput = $("chatInput");
  let flow = null, greeted = false;
  function addMessage(text, who = "bot", html = false){
    const item = document.createElement("div"); item.className = `chat-bubble ${who === "user" ? "user" : "bot"}`;
    if(html) item.innerHTML = text; else item.textContent = text;
    messages.append(item); messages.scrollTop = messages.scrollHeight; return item;
  }
  function showOptions(items){
    options.replaceChildren();
    items.forEach(([label, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chat-choice"; b.textContent = label; b.onclick = fn; options.append(b); });
    options.hidden = !items.length;
  }
  function ask(text, placeholder, extra = []){
    addMessage(text); chatForm.hidden = false; options.hidden = false;
    chatInput.placeholder = placeholder; chatInput.value = ""; chatInput.type = "text"; chatInput.autocomplete = "off"; chatInput.focus();
    showOptions(extra);
  }
  function welcome(){
    flow = null; messages.replaceChildren(); greeted = true;
    addMessage(`¡Hola! ¿Cómo estás? Soy el asistente virtual de ${CF.club}. Para ayudarte mejor, contame: ¿ya sos parte del club o querés conocerlo y sumarte?`);
    showOptions([["Ya soy del club", startLookup], ["Quiero unirme", startJoin], ["Tengo una duda", startFaq]]); chatForm.hidden = true;
  }
  function startFaq(){
    flow = { type: "assistant", step: "question" };
    ask("Claro. Podés escribir tu duda con tus propias palabras. Te voy a responder sobre el Club Ruedita, sus puntos, premios, invitaciones y beneficios.", "Escribí tu consulta");
    showOptions([
      ["¿Cuánto cuesta?", () => answerFaq("price")],
      ["¿Cómo sumo puntos?", () => answerFaq("earn")],
      ["¿Cómo canjeo premios?", () => answerFaq("redeem")],
      ["¿Los puntos vencen?", () => answerFaq("expiry")],
      ["¿Qué hacen con mis datos?", () => answerFaq("privacy")],
      ["Volver al inicio", welcome]
    ]);
  }
  async function askAssistant(question){
    const context = {
      club: CF.club, earn: CF.earn, multipliers: CF.multipliers, bonus: CF.bonus,
      rewards: (CF.rewards || []).map(r => ({ name:r.name, points:r.pts, note:r.note || "" })),
      inactiveDays: CF.inactiveDays
    };
    addMessage("Estoy revisando tu consulta…");
    try{
      const response = await fetch("/api/assistant", {
        method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({ question, context })
      });
      const data = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(data.message || "No pude responder ahora.");
      addMessage(data.answer || "No encontré una respuesta para esa consulta.");
    }catch(error){
      const q = question.toLowerCase();
      let answer = "";
      if(/punto|sum(ar|o)|acumul/.test(q)) answer = rulesText(CF).earn + rulesText(CF).extra + " También hay bonificaciones por cumpleaños, reseñas e invitaciones, según las reglas vigentes del Club.";
      else if(/premio|canje|cambiar|retir/.test(q)) answer = "Podés consultar los premios y sus puntos en la sección “Premios”. Si ya sos socio, ingresá con tu código para ver tu saldo y los canjes disponibles.";
      else if(/costo|precio|gratis|pagar/.test(q)) answer = "La inscripción al Club Ruedita es gratuita.";
      else if(/venc|caduc/.test(q)) answer = "Los puntos tienen un plazo de vigencia definido por las reglas del Club. Si querés, puedo ayudarte a consultar tu saldo.";
      else if(/dato|privacidad|whatsapp|mensaje|promo/.test(q)) answer = "Tus datos se utilizan para administrar tu membresía. Los mensajes promocionales por WhatsApp son opcionales y requieren tu autorización. Podés solicitar dejar de recibirlos.";
      else answer = "No tengo información suficiente para responder eso con seguridad. Puedo ayudarte con inscripción, puntos, premios, invitaciones, cumpleaños y comunicaciones del Club.";
      addMessage(answer);
      if(error.message) addMessage("El asistente automático no está disponible temporalmente; te doy la información básica del Club.");
    }
    flow = { type:"assistant", step:"question" };
    chatForm.hidden = false; chatInput.type = "text"; chatInput.placeholder = "Escribí otra consulta"; chatInput.value = "";
    showOptions([["Consultar mis puntos", startLookup], ["Volver al inicio", welcome]]);
  }
  function answerFaq(topic){
    const answers = {
      price: "El Club Ruedita es gratuito. No hay costo de inscripción.",
      earn: rulesText(CF).earn + rulesText(CF).extra + " También sumás por traer amigos, en tu cumpleaños y por dejar tu reseña.",
      redeem: "Entrá a “Mis puntos”, elegí el premio que quieras canjear y mostrá el código en caja para retirarlo.",
      expiry: "Tus puntos vencen después de 12 meses sin visitas. Si venís con regularidad, los conservás.",
      privacy: "Usamos tus datos para administrar tu membresía y tus puntos. Si aceptás recibir mensajes por WhatsApp, también podremos enviarte novedades, promociones y beneficios del club. Podés elegir no recibirlos y cambiar tu decisión más adelante."
    };
    addMessage(answers[topic] || "No encontré esa respuesta. Elegí otra consulta o volvé al inicio.");
    showOptions([["Otra pregunta", startFaq], ["Consultar mis puntos", startLookup], ["Volver al inicio", welcome]]);
  }
  function startJoin(){
    const inviteCode = new URLSearchParams(location.search).get("ref") || "";
    flow = { type: "join", step: "name", data: { ref: inviteCode } };
    if(inviteCode){
      ask("¡Hola! Llegaste por la invitación de un amigo para sumarte al Club Ruedita. Para continuar con tu invitación, ¿cuál es tu nombre?", "Escribí tu nombre");
    } else {
      ask("¡Qué bueno! ¿Cuál es tu nombre?", "Tu nombre");
    }
  }
  function startLookup(){ flow = { type: "lookup", step: "code" }; ask("Escribí tu código del Club Ruedita y busco tus puntos.", "Ej.: ANA123"); }
  function nextJoin(){
    const d = flow.data;
    if(flow.step === "name") { d.name = flow.value; flow.step = "phone"; ask(`Gracias, ${d.name.split(" ")[0]}. ¿Cuál es tu número de celular?`, "Ej.: 376 4123456"); }
    else if(flow.step === "phone") { d.phone = flow.value; flow.step = "birthday"; ask("¿Cuál es tu fecha de cumpleaños? Es opcional.", "Podés saltear esta pregunta", [["Prefiero no decir", () => afterBirthday("")]]); chatInput.type = "date"; }
    else if(flow.step === "birthday") { afterBirthday(flow.value); }
    else if(flow.step === "ref") { d.ref = flow.value.toUpperCase(); submitJoin(); }
  }
  function afterBirthday(value){ flow.data.birthday = value; if(flow.data.ref){ askConsent(); } else { flow.step = "ref"; askRef(); } }
  function askRef(){
    ask("¿Tenés el código de un amigo que te invitó? También es opcional.", "Código de invitación",
      [["No tengo código", () => { flow.data.ref = ""; askConsent(); }]]);
  }
  function askConsent(){
    flow.step = "consent"; chatForm.hidden = true;
    addMessage("Antes de terminar, necesitamos tu autorización para administrar tu membresía. Usaremos tu nombre, celular y, si lo compartiste, tu cumpleaños para identificarte, guardar tus puntos y gestionar tus beneficios.");
    showOptions([
      ["Acepto y quiero crear mi cuenta", () => askWhatsAppConsent()],
      ["No autorizo", () => {
        flow = null;
        addMessage("Entendido. Sin esta autorización no podemos crear ni administrar tu membresía. No se guardó ningún registro.");
        showOptions([["Volver al inicio", welcome], ["Empezar de nuevo", startJoin]]);
      }]
    ]);
  }
  function askWhatsAppConsent(){
    flow.step = "whatsapp"; chatForm.hidden = true;
    addMessage("¿Querés recibir por WhatsApp novedades, promociones y beneficios de La Ruedita? Es opcional y no cambia tu membresía. Podés darte de baja cuando quieras.");
    showOptions([
      ["Sí, acepto recibir mensajes", () => submitJoin(true)],
      ["No, prefiero no recibir", () => submitJoin(false)]
    ]);
  }
  async function submitJoin(waConsent){
    if(!flow || flow.step !== "whatsapp" || typeof waConsent !== "boolean") return;
    flow.data.consent = true;
    flow.data.waConsent = waConsent;
    showOptions([]); addMessage("Un momento, estoy guardando tu membresía…");
    try{
      const r = await F.register(flow.data);
      setToken(r.token);
      let d;
      try { d = await F.me(r.token); }
      catch {
        messages.replaceChildren();
        addMessage(`¡Listo, ${esc(r.customer.name.split(" ")[0])}! Tu inscripción quedó guardada correctamente.`, "bot");
        addMessage(`Tu código de socio es ${esc(r.customer.code)}. Ya recibiste ${fmt(r.customer.points)} puntos de bienvenida. Podés usar ese código para consultar tu saldo.`, "bot");
        addMessage(waConsent ? "También registramos que aceptaste recibir novedades, promociones y beneficios por WhatsApp. Podés darte de baja cuando quieras." : "Registramos que preferís no recibir mensajes promocionales por WhatsApp. Tu membresía y tus puntos funcionan igual.", "bot");
        showOptions([["Consultar mis puntos", () => startLookup()], ["Volver al inicio", welcome]]);
        chatForm.hidden = true; flow = null; return;
      }
      messages.replaceChildren();
      addMessage(`¡Listo, ${esc(d.customer.name.split(" ")[0])}! Tu inscripción al Club Ruedita quedó completada y guardada.`, "bot");
      addMessage(memberCard(d, { welcome: true }), "bot", true); wire(messages);
      addMessage(waConsent ? "También registramos que aceptaste recibir novedades, promociones y beneficios por WhatsApp. Podés darte de baja cuando quieras." : "Registramos que preferís no recibir mensajes promocionales por WhatsApp. Tu membresía y tus puntos funcionan igual.", "bot");
      addMessage("¡Gracias por sumarte! Guardá tu código de socio para consultar tus puntos cuando quieras.", "bot");
      showOptions([["Consultar mis puntos", () => { startLookup(); }], ["Volver al inicio", welcome]]); chatForm.hidden = true; flow = null;
    }catch(e){
      addMessage(e.message || "No pude completar el registro. Tus datos no se guardaron. Intentá de nuevo.");
      showOptions([["Intentar de nuevo", startJoin], ["Volver al inicio", welcome]]); chatForm.hidden = true;
    }
  }
  async function submitLookup(code){
    addMessage("Estoy buscando tu saldo…"); showOptions([]); chatForm.hidden = true;
    try{
      const d = await F.lookupCode(code.trim().toUpperCase());
      messages.replaceChildren(); addMessage(`¡Hola, ${esc(d.customer.name)}! Tenés ${fmt(d.customer.points)} puntos.`, "bot");
      if(d.customer.code) addMessage(`Tu código del club: ${esc(d.customer.code)}`, "bot");
      showOptions([["Consultar otro código", startLookup], ["Volver al inicio", welcome]]);
    }catch(e){
      addMessage(e.code === "bad-action" ? "La consulta por código necesita una actualización del servidor del club antes de quedar activa." : (e.code === "customer-not-found" ? "No encontré ese código. Revisalo y probá de nuevo." : e.message));
      showOptions([["Tentar novamente", startLookup], ["Volver al inicio", welcome]]);
    }
    flow = null;
  }
  async function submitAnswer(value){
    const v = value.trim(); if(!v || !flow) return;
    addMessage(v, "user"); chatForm.hidden = true; showOptions([]);
    if(flow.type === "lookup"){ await submitLookup(v); return; }
    if(flow.type === "assistant"){ await askAssistant(v); return; }
    flow.value = v;
    if(flow.step === "ref" && flow.data.ref && !v) flow.value = flow.data.ref;
    nextJoin();
  }
  chatForm.addEventListener("submit", e => { e.preventDefault(); submitAnswer(chatInput.value); });
  $("chatClose").onclick = () => setChat(false);
  const openChatButtons = ["clubChatLauncher", "chatOpenTop", "chatOpenAction"];
  openChatButtons.forEach(id => { const button = $(id); if(button) button.onclick = () => setChat(true); });
  function setChat(open){
    chat.hidden = !open;
    openChatButtons.forEach(id => { const button = $(id); if(button) button.setAttribute("aria-expanded", String(open)); });
    if(open && !greeted) welcome();
    if(open) chatInput.focus();
  }

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

  // ---------- arranque ----------
  (async function(){
    CF = await F.init(); paint();
    const q = new URLSearchParams(location.search);
    // Cada visitante comienza por la bienvenida; nunca recuperamos automáticamente una cuenta anterior.
    const ref = q.get("ref");
    setChat(true);
    if(ref){ startJoin(); }
  })();
})();
