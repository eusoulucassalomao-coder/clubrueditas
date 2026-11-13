(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString("es-AR");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  const base = location.href.split(/[?#]/)[0];
  const TK = "mkf_t_" + F.slug;
  let CF = F.conf();

  const waLink = () => `https://wa.me/${CF.whatsapp}?text=${encodeURIComponent("Hola! Quiero mis puntos 🎁")}`;
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
    $("lnkWa").href = "https://wa.me/" + cf.whatsapp;
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
    const text = `Te invito al ${CF.club} de ${CF.name}: sumás puntos y canjeás premios. Registrate con mi código ${c.code} y ganamos los dos: ${link}`;
    return { link, wa: "https://wa.me/?text=" + encodeURIComponent(text) };
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
      ${c.confirmed ? "" : `<div class="wa-cta"><a class="btn wa full" target="_blank" rel="noopener" href="${esc(waLink())}">Abrir WhatsApp y confirmar</a><p class="hint" style="font-size:12px;margin-top:8px">Se abre un mensaje ya escrito: solo tocá enviar. Te respondemos al instante con tus puntos y avisos.</p></div>`}
      ${opts.welcome ? `<p class="hint">Te sumamos <b>${fmt(cf.bonus.welcome)} puntos</b> de bienvenida. Mostrá tu WhatsApp en caja y empezás a sumar.</p>` : ""}
      <p class="hint" style="margin-top:14px">Tu código para invitar</p><span class="code">${esc(c.code)}</span>
      <div class="share"><a class="btn" target="_blank" rel="noopener" href="${esc(sh.wa)}">Invitar por WhatsApp</a><button class="btn btn-ghost" type="button" data-copy="${esc(sh.link)}">Copiar link</button></div>
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
    addMessage(`¡Hola! Soy el asistente del ${CF.club}. Puedo ayudarte a unirte o revisar tus puntos.`);
    showOptions([["Quiero unirme", startJoin], ["Consultar mis puntos", startLookup]]); chatForm.hidden = true;
  }
  function startJoin(){
    flow = { type: "join", step: "name", data: { ref: new URLSearchParams(location.search).get("ref") || "" } };
    ask("¡Qué bueno! ¿Cuál es tu nombre?", "Tu nombre");
  }
  function startLookup(){ flow = { type: "lookup", step: "code" }; ask("Escribí tu código del Club Ruedita y busco tus puntos.", "Ej.: ANA123"); }
  function nextJoin(){
    const d = flow.data;
    if(flow.step === "name") { d.name = flow.value; flow.step = "phone"; ask(`Gracias, ${d.name.split(" ")[0]}. ¿Cuál es tu WhatsApp?`, "Ej.: 376 4123456"); }
    else if(flow.step === "phone") { d.phone = flow.value; flow.step = "birthday"; ask("¿Cuál es tu fecha de cumpleaños? Es opcional.", "Podés saltear esta pregunta", [["Prefiero no decir", () => afterBirthday("")]]); chatInput.type = "date"; }
    else if(flow.step === "birthday") { afterBirthday(flow.value); }
    else if(flow.step === "ref") { d.ref = flow.value.toUpperCase(); askConsent(); }
  }
  function afterBirthday(value){ flow.data.birthday = value; if(flow.data.ref){ askConsent(); } else { flow.step = "ref"; askRef(); } }
  function askRef(){ ask("¿Tenés el código de un amigo que te invitó? También es opcional.", "Código de invitación", [["No tengo código", () => { flow.data.ref = ""; flow.step = "consent"; askConsent(); }]]); }
  function askConsent(){ flow.step = "consent"; ask("¿Aceptás recibir por WhatsApp avisos de puntos y novedades? Es opcional.", "Elegí una opción", [["Sí, acepto", () => submitJoin(true)], ["No, gracias", () => submitJoin(false)]]); chatForm.hidden = true; }
  async function submitJoin(consent){
    showOptions([]); flow.data.consent = consent; addMessage(consent ? "Sí, acepto" : "No, gracias", "user"); addMessage("Un momento, estoy creando tu membresía…");
    try{
      const r = await F.register(flow.data); setToken(r.token); const d = await F.me(r.token);
      messages.replaceChildren(); addMessage(`¡Listo, ${esc(d.customer.name.split(" ")[0])}! Ya sos parte del club.`, "bot");
      addMessage(memberCard(d, { welcome: true }), "bot", true); wire(messages);
      showOptions([["Volver al inicio", welcome]]); chatForm.hidden = true; flow = null;
    }catch(e){ addMessage(e.message || "No pude completar el registro. Intentá de nuevo."); showOptions([["Intentar de nuevo", startJoin], ["Volver al inicio", welcome]]); chatForm.hidden = true; }
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
    flow.value = v;
    if(flow.step === "ref" && flow.data.ref && !v) flow.value = flow.data.ref;
    nextJoin();
  }
  chatForm.addEventListener("submit", e => { e.preventDefault(); submitAnswer(chatInput.value); });
  $("chatClose").onclick = () => setChat(false);
  $("chatFab").onclick = $("chatOpenTop").onclick = $("chatOpenAction").onclick = () => setChat(!chat.hidden);
  function setChat(open){ chat.hidden = !open; [$("chatFab"), $("chatOpenTop")].forEach(b => b.setAttribute("aria-expanded", String(open))); if(open && !greeted) welcome(); if(open) chatInput.focus(); }

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
    const q = new URLSearchParams(location.search), t = q.get("t");
    if(t){ setToken(t); history.replaceState(null, "", location.pathname + "#puntos"); }
    const ok = await showMine();
    if(ok && t) setChat(true);
    const ref = q.get("ref");
    if(ref){ setTimeout(() => { setChat(true); startJoin(); }, 300); }
  })();
})();
