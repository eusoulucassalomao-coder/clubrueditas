(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString("es-AR");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SS = "mkf_k_session_" + F.slug, KC = "mkf_k_kc_" + F.slug;
  const SECTIONS = ["load", "dead", "menu", "id", "otp", "visit", "visit-ok", "redeem", "coupon"];
  let session = "", kc = "", ident = "", goal = "", first = "", tick = 0, lastSend = 0;
  const store = {
    get: k => { try{ return sessionStorage.getItem(k) || ""; }catch(e){ return ""; } },
    set: (k, v) => { try{ sessionStorage.setItem(k, v); }catch(e){} },
    del: k => { try{ sessionStorage.removeItem(k); }catch(e){} }
  };
  const show = name => { SECTIONS.forEach(s => $("s-" + s).hidden = (s !== name)); window.scrollTo(0, 0); };
  const busy = (btn, on, label) => { btn.disabled = on; if(label) btn.textContent = on ? "Un momento…" : label; };

  // kc (prova de identidade) dura 10 min: guardo a hora para não usar um vencido
  const kcGet = () => { const raw = store.get(KC); if(!raw) return ""; const [t, exp] = raw.split("|"); return Number(exp) > Date.now() ? t : ""; };
  const kcSet = t => store.set(KC, t + "|" + (Date.now() + 9 * 60 * 1000));

  async function boot(){
    const q = new URLSearchParams(location.search), c = q.get("c");
    session = store.get(SS);
    if(c){
      // tira o código do endereço: o QR vale poucos segundos e não deve ficar no histórico
      try{ history.replaceState(null, "", "/k"); }catch(e){}
      try{ const j = await F.kioskEnter(c); session = j.session; store.set(SS, session); store.del(KC); }
      catch(e){ session = ""; store.del(SS); $("deadMsg").textContent = e.status === 401 ? "Ese QR venció. Escaneá de nuevo el que está en la caja." : e.message; show("dead"); return; }
    }
    if(!session){ show("dead"); return; }
    kc = kcGet();
    show("menu");
  }

  function start(g){
    goal = g; kc = kcGet();
    if(kc){ enter(); return; }
    $("idTitle").textContent = g === "visit" ? "Confirmemos que sos vos" : "Confirmemos que sos vos";
    $("idMsg").textContent = ""; show("id"); $("idIn").focus();
  }
  $("goVisit").onclick = () => start("visit");
  $("goRedeem").onclick = () => start("redeem");
  $("idBack").onclick = () => show("menu");
  $("otpBack").onclick = () => { $("otpMsg").textContent = ""; show("id"); };

  function sessionDied(){ store.del(SS); store.del(KC); session = ""; kc = ""; $("deadMsg").textContent = "Pasó un rato. Escaneá de nuevo el QR de la caja."; show("dead"); }

  async function sendOtp(){
    try{ await F.kioskOtpRequest(session, ident); lastSend = Date.now(); return true; }
    catch(e){
      if(e.status === 401){ sessionDied(); return false; }
      $("idMsg").textContent = e.status === 429 ? "Demasiados intentos. Esperá un minuto." : e.message; return false;
    }
  }
  $("idForm").addEventListener("submit", async e => {
    e.preventDefault();
    const v = $("idIn").value.trim();
    if(v.replace(/\D/g, "").length < 8 && v.replace(/[^A-Za-z0-9]/g, "").length < 4){ $("idMsg").textContent = "Escribí tu WhatsApp con código de área, o tu código de socio."; return; }
    ident = v; $("idMsg").textContent = ""; busy($("idBtn"), true);
    const ok = await sendOtp();
    busy($("idBtn"), false, "Enviarme el código por WhatsApp");
    if(ok){ $("otpIn").value = ""; $("otpMsg").textContent = ""; show("otp"); $("otpIn").focus(); }
  });
  $("otpResend").onclick = async () => {
    if(Date.now() - lastSend < 30000){ $("otpMsg").className = "msg err"; $("otpMsg").textContent = "Esperá unos segundos para pedir otro código."; return; }
    const ok = await sendOtp(); $("otpMsg").className = "msg " + (ok ? "ok" : "err"); $("otpMsg").textContent = ok ? "Te enviamos un código nuevo." : $("idMsg").textContent;
  };
  $("otpForm").addEventListener("submit", async e => {
    e.preventDefault();
    const code = $("otpIn").value.replace(/\D/g, "");
    if(code.length !== 6){ $("otpMsg").className = "msg err"; $("otpMsg").textContent = "El código tiene 6 dígitos."; return; }
    busy($("otpBtn"), true); $("otpMsg").textContent = "";
    try{
      const j = await F.kioskOtpVerify(session, ident, code);
      kc = j.kc; kcSet(kc); first = j.firstName || "";
      $("otpIn").value = "";
      await enter();
    }catch(err){
      if(err.status === 401 && err.code === "qr_expired"){ sessionDied(); }
      else { $("otpMsg").className = "msg err"; $("otpMsg").textContent = err.message; }
    }
    busy($("otpBtn"), false, "Confirmar");
  });

  async function enter(){
    if(goal === "visit"){ $("vHello").textContent = first ? "Registrá tu visita, " + first : "Registrá tu visita"; $("vMsg").textContent = ""; show("visit"); $("vTicket").focus(); return; }
    await loadRedeem();
  }

  // ---- visita ----
  $("vAmount").addEventListener("input", () => { const d = $("vAmount").value.replace(/\D/g, ""); $("vAmount").value = d ? fmt(Number(d)) : ""; });
  $("visitForm").addEventListener("submit", async e => {
    e.preventDefault();
    const ticket = $("vTicket").value.trim(), amount = $("vAmount").value.replace(/\D/g, "");
    if(ticket.replace(/[^A-Za-z0-9]/g, "").length < 3){ $("vMsg").textContent = "Revisá el número del ticket."; return; }
    if(!amount){ $("vMsg").textContent = "Escribí el total de la cuenta."; return; }
    busy($("vBtn"), true); $("vMsg").textContent = "";
    try{ await F.kioskVisit(kc, ticket, amount); store.del(KC); show("visit-ok"); }
    catch(err){ if(err.code === "kc_expired"){ kcLost(); } else $("vMsg").textContent = err.message; }
    busy($("vBtn"), false, "Enviar a la caja");
  });
  function kcLost(){ store.del(KC); kc = ""; $("idMsg").textContent = "Tu verificación venció. Confirmá de nuevo."; show("id"); }

  // ---- premios ----
  async function loadRedeem(){
    try{
      const j = await F.kioskMe(kc);
      first = j.customer.name || first;
      if(j.coupon){ showCoupon(j.coupon, first); return; }
      $("rHello").textContent = first ? first + ", canjeá tu premio" : "Canjeá tu premio";
      $("rPts").textContent = fmt(j.customer.points); $("rMsg").textContent = "";
      $("rList").innerHTML = j.rewards.map(r => {
        const ok = j.customer.points >= r.pts;
        return `<div class="rw"><div><b>${esc(r.name)}</b><small>${ok ? fmt(r.pts) + " puntos" : "Te faltan " + fmt(r.pts - j.customer.points) + " · " + fmt(r.pts) + " pts"}</small></div><button type="button" data-id="${esc(r.id)}" ${ok ? "" : "disabled"}>Canjear</button></div>`;
      }).join("") || "<p class='sub'>Todavía no hay premios cargados.</p>";
      $("rList").querySelectorAll("button[data-id]").forEach(b => b.onclick = () => claim(b.dataset.id, b));
      show("redeem");
    }catch(err){ if(err.code === "kc_expired") kcLost(); else { $("rMsg").textContent = err.message; show("redeem"); } }
  }
  async function claim(id, btn){
    if(!confirm("¿Canjear este premio ahora? Se descuentan los puntos y el cupón vale por poco tiempo.")) return;
    document.querySelectorAll("#rList button").forEach(b => b.disabled = true); $("rMsg").textContent = "";
    try{ const j = await F.kioskClaim(kc, id); store.del(KC); showCoupon(j.coupon, first); }
    catch(err){ if(err.code === "kc_expired") kcLost(); else { $("rMsg").textContent = err.message; loadRedeem(); } }
  }

  function showCoupon(c, name){
    $("cName").textContent = c.name; $("cCode").textContent = c.code; $("cWho").textContent = name ? "Para " + name : "";
    // o QR leva só o código do cupom: o caixa lê e o sistema confere se é verdadeiro
    const qr = window.qrcode(0, "M"); qr.addData(c.code); qr.make();
    $("cQr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    const end = new Date(c.expiresAt).getTime();
    clearInterval(tick);
    const upd = () => {
      const left = end - Date.now();
      if(left <= 0){ $("cTime").textContent = "Vencido"; $("ticket").classList.add("dead"); $("cNote").textContent = "Este cupón venció. Tus puntos vuelven a tu cuenta."; clearInterval(tick); return; }
      const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
      $("cTime").textContent = "Vale por " + m + ":" + String(s).padStart(2, "0") + " min";
    };
    upd(); tick = setInterval(upd, 1000);
    show("coupon");
  }

  boot();
})();
