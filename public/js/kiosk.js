(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const kt = window.kt, kerr = window.kerr;
  const fmt = n => Number(n).toLocaleString(window.kLocale());
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SS = "mkf_k_session_" + F.slug, KC = "mkf_k_kc_" + F.slug;
  const TOKEN_KEY = "club-la-ruedita-token-v1";          // mesmo lugar onde o app guarda a conta do cliente
  const APP_KEY = "club-la-ruedita-pwa-installed-v1";    // o app grava isto quando é aberto instalado
  const SECTIONS = ["load", "dead", "menu", "needqr", "register", "register-ok", "id", "otp", "visit", "visit-ok", "redeem", "coupon"];
  let session = "", kc = "", ident = "", goal = "", first = "", tick = 0, lastSend = 0, current = "load";
  let redeemData = null, couponData = null, regName = "", regCode = "", okData = null;
  const store = {
    get: k => { try{ return sessionStorage.getItem(k) || ""; }catch(e){ return ""; } },
    set: (k, v) => { try{ sessionStorage.setItem(k, v); }catch(e){} },
    del: k => { try{ sessionStorage.removeItem(k); }catch(e){} }
  };
  const show = name => { current = name; if(name !== "visit") stopScan(); SECTIONS.forEach(s => $("s-" + s).hidden = (s !== name)); window.scrollTo(0, 0); };
  const busy = (btn, on, key) => { btn.disabled = on; btn.textContent = on ? kt("busy") : kt(key); };
  const cleanCode = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const receiptFrom = raw => cleanCode(raw);
  // Celulares da Argentina precisam do 9 depois do 54 para o WhatsApp (549...).
  const normalizeWa = e164 => { const d = String(e164 || "").replace(/\D/g, ""); return (/^54\d{10}$/.test(d) && !d.startsWith("549")) ? "549" + d.slice(2) : d; };

  // Seletor de país com bandeiras e todos os países (arquivos locais; nomes no idioma escolhido)
  let iti = null, itiLang = "", itiBusy = false;
  async function initPhone(){
    const lang = window.kLang();
    if(itiBusy || (iti && itiLang === lang)) return;
    itiBusy = true;
    try{
      const keep = iti ? iti.getNumber() : "";
      if(iti){ iti.destroy(); iti = null; }
      const m = await import("/js/vendor/itl/js/i18n/" + lang + "/index.js");
      iti = window.intlTelInput($("rPhone"), {
        initialCountry: "ar",
        countryOrder: ["ar", "br", "py", "uy", "cl", "us", "es"],
        separateDialCode: true,
        nationalMode: true,
        dropdownContainer: document.body,
        i18n: Object.assign({}, m.countryTranslations, m.interfaceTranslations),
        loadUtils: () => import("/js/vendor/itl/js/utils.js")
      });
      itiLang = lang;
      if(keep) iti.setNumber(keep);
    }catch(e){ /* sem o seletor, o campo segue aceitando o número completo com + */ }
    itiBusy = false;
  }

  // kc (prova de identidade) dura 10 min: guardo a hora para não usar um vencido
  const kcGet = () => { const raw = store.get(KC); if(!raw) return ""; const [t, exp] = raw.split("|"); return Number(exp) > Date.now() ? t : ""; };
  const kcSet = t => store.set(KC, t + "|" + (Date.now() + 9 * 60 * 1000));

  // ---- o app já está instalado? então sugere ABRIR (nunca instalar) ----
  let appState = null;   // "standalone" | "has" | "no"
  async function appBar(){
    const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if(standalone){ try{ localStorage.setItem(APP_KEY, "1"); }catch(e){} appState = "standalone"; return; }   // já está dentro do app
    let has = false;
    try{ has = localStorage.getItem(APP_KEY) === "1"; }catch(e){}
    try{ if(!has && navigator.getInstalledRelatedApps){ has = (await navigator.getInstalledRelatedApps()).length > 0; } }catch(e){}
    appState = has ? "has" : "no";
    renderAppBar();
  }
  function renderAppBar(){
    const bar = $("appBar");
    if(!appState || appState === "standalone"){ bar.hidden = true; return; }
    bar.innerHTML = appState === "has"
      ? "<span style='font-size:24px'>📲</span><span><b>" + esc(kt("appHasTitle")) + "</b>" + esc(kt("appHasText")) + "</span>"
      : "<span style='font-size:24px'>📲</span><span><b>" + esc(kt("appNoTitle")) + "</b>" + esc(kt("appNoText")) + " <a href='/'>" + esc(kt("appHow")) + "</a></span>";
    bar.hidden = false;
  }

  async function boot(){
    window.kApply();
    appBar();
    const c = new URLSearchParams(location.search).get("c");
    session = store.get(SS);
    if(c){
      // tira o código do endereço: o QR vale poucos segundos e não deve ficar no histórico
      try{ history.replaceState(null, "", "/k"); }catch(e){}
      try{ const j = await F.kioskEnter(c); session = j.session; store.set(SS, session); store.del(KC); }
      catch(e){ session = ""; store.del(SS); $("deadMsg").textContent = e.status === 401 ? kt("deadMsg") : kerr(e); $("deadMsg").removeAttribute("data-i"); show("dead"); return; }
    }
    kc = kcGet();
    show("menu");
  }
  $("deadBack").onclick = () => show("menu");
  $("needBack").onclick = () => show("menu");

  // ---- crear cuenta ----
  $("goRegister").onclick = () => { $("rgMsg").textContent = ""; show("register"); initPhone(); $("rName").focus(); };
  $("rgBack").onclick = () => show("menu");
  $("regForm").addEventListener("submit", async e => {
    e.preventDefault();
    const m = $("rgMsg"); m.textContent = "";
    const name = $("rName").value.trim(), birth = $("rBirth").value;
    let phone = "";
    try{
      if(iti){ if(iti.promise) await iti.promise; if(iti.isValidNumber()) phone = normalizeWa(iti.getNumber()); }
      else { const d = $("rPhone").value.replace(/\D/g, ""); phone = d.length >= 10 ? d : ""; }
    }catch(x){ phone = ""; }
    if(name.length < 2){ m.textContent = kt("errName"); return; }
    if(!phone){ m.textContent = kt("errPhone"); return; }
    if(!birth){ m.textContent = kt("errBirth"); return; }
    if(!$("rConsent").checked){ m.textContent = kt("errConsent"); return; }
    busy($("rgBtn"), true, "rBtn");
    try{
      const j = await F.register({ name, phone, birthday: birth, consent: true, waConsent: true });
      try{ localStorage.setItem(TOKEN_KEY, j.token); }catch(x){}      // o app reconhece a conta sem pedir nada
      first = name.split(/\s+/)[0]; regName = first; regCode = j.customer.code;
      renderRegOk(); show("register-ok");
    }catch(err){ m.textContent = err.status === 429 ? kt("tooMany") : kerr(err); }
    busy($("rgBtn"), false, "rBtn");
  });
  function renderRegOk(){ $("rokTitle").textContent = regName ? kt("welcome", { name: regName }) : kt("welcomeGeneric"); $("rokCode").textContent = regCode || "—"; }
  $("rokVisit").onclick = () => start("visit");

  // ---- visita / premio: precisam do QR do tablet (presença no local) ----
  function start(g){
    if(!session){ show("needqr"); return; }
    goal = g; kc = kcGet();
    if(kc){ enter(); return; }
    $("idMsg").textContent = ""; show("id"); $("idIn").focus();
  }
  $("goVisit").onclick = () => start("visit");
  $("goRedeem").onclick = () => start("redeem");
  $("idBack").onclick = () => show("menu");
  $("otpBack").onclick = () => { $("otpMsg").textContent = ""; show("id"); };

  function sessionDied(){ store.del(SS); store.del(KC); session = ""; kc = ""; $("deadMsg").textContent = kt("deadSession"); $("deadMsg").removeAttribute("data-i"); show("dead"); }

  async function sendOtp(){
    try{ await F.kioskOtpRequest(session, ident); lastSend = Date.now(); return true; }
    catch(e){
      if(e.status === 401){ sessionDied(); return false; }
      $("idMsg").textContent = e.status === 429 ? kt("tooMany") : kerr(e); return false;
    }
  }
  $("idForm").addEventListener("submit", async e => {
    e.preventDefault();
    const v = $("idIn").value.trim();
    if(v.replace(/\D/g, "").length < 8 && v.replace(/[^A-Za-z0-9]/g, "").length < 4){ $("idMsg").textContent = kt("errId"); return; }
    ident = v; $("idMsg").textContent = ""; busy($("idBtn"), true, "idBtn");
    const ok = await sendOtp();
    busy($("idBtn"), false, "idBtn");
    if(ok){ $("otpIn").value = ""; $("otpMsg").textContent = ""; show("otp"); $("otpIn").focus(); }
  });
  $("otpResend").onclick = async () => {
    if(Date.now() - lastSend < 30000){ $("otpMsg").className = "msg err"; $("otpMsg").textContent = kt("waitResend"); return; }
    const ok = await sendOtp(); $("otpMsg").className = "msg " + (ok ? "ok" : "err"); $("otpMsg").textContent = ok ? kt("resent") : $("idMsg").textContent;
  };
  $("otpForm").addEventListener("submit", async e => {
    e.preventDefault();
    const code = $("otpIn").value.replace(/\D/g, "");
    if(code.length !== 6){ $("otpMsg").className = "msg err"; $("otpMsg").textContent = kt("errOtp6"); return; }
    busy($("otpBtn"), true, "otpBtn"); $("otpMsg").textContent = "";
    try{
      const j = await F.kioskOtpVerify(session, ident, code);
      kc = j.kc; kcSet(kc); first = j.firstName || "";
      $("otpIn").value = "";
      await enter();
    }catch(err){
      if(err.status === 401 && err.code === "qr_expired"){ sessionDied(); }
      else { $("otpMsg").className = "msg err"; $("otpMsg").textContent = kerr(err); }
    }
    busy($("otpBtn"), false, "otpBtn");
  });

  async function enter(){
    if(goal === "visit"){ renderVisitTitle(); $("vMsg").textContent = ""; show("visit"); $("vTicket").focus(); return; }
    await loadRedeem();
  }
  function renderVisitTitle(){ $("vHello").textContent = first ? kt("visitTitleName", { name: first }) : kt("visitTitle"); }

  // ---- visita: código do comprovante (traz o valor da conta) ----
  async function sendVisit(code){
    $("vMsg").textContent = ""; busy($("vBtn"), true, "visitBtn");
    try{
      const j = await F.kioskVisit(kc, code);
      store.del(KC);
      okData = { pts: j.pts, amount: j.amount, total: j.total };
      renderVisitOk(); show("visit-ok");
    }catch(err){
      if(err.code === "kc_expired"){ kcLost(); }
      else { $("vMsg").textContent = kerr(err); show("visit"); }
    }
    busy($("vBtn"), false, "visitBtn");
  }
  function renderVisitOk(){
    if(!okData) return;
    $("vOkPts").textContent = "+" + fmt(okData.pts) + " " + kt("pointsWord");
    $("vOkText").textContent = kt("forBill", { amount: fmt(okData.amount) });
    $("vOkTotal").textContent = kt("totalNow", { total: fmt(okData.total) });
  }
  $("visitForm").addEventListener("submit", e => {
    e.preventDefault();
    const code = receiptFrom($("vTicket").value);
    if(code.length < 6){ $("vMsg").textContent = kt("errVisitCode"); return; }
    sendVisit(code);
  });
  function kcLost(){ store.del(KC); kc = ""; $("idMsg").textContent = kt("kcLost"); show("id"); }

  // ---- câmera para o QR do comprovante ----
  let stream = null, raf = 0;
  function stopScan(){
    cancelAnimationFrame(raf);
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $("vVideo"); if(v) v.srcObject = null;
    const b = $("vScanBox"); if(b) b.hidden = true;
  }
  async function startScan(){
    $("vMsg").textContent = "";
    if(!navigator.mediaDevices || !window.jsQR){ $("vMsg").textContent = kt("noCamera"); return; }
    try{ stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }); }
    catch(e){ $("vMsg").textContent = kt("camDenied"); return; }
    const v = $("vVideo"), cv = $("vCanvas"), ctx = cv.getContext("2d", { willReadFrequently: true });
    v.srcObject = stream; $("vScanBox").hidden = false; await v.play().catch(() => {});
    const loop = () => {
      if(!stream) return;
      if(v.readyState >= 2 && v.videoWidth){
        const w = Math.min(640, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
        cv.width = w; cv.height = h; ctx.drawImage(v, 0, 0, w, h);
        const hit = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        const code = hit && hit.data ? receiptFrom(hit.data) : "";
        if(code.length >= 6 && code.length <= 16){ stopScan(); if(navigator.vibrate) navigator.vibrate(80); $("vTicket").value = code; sendVisit(code); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
  }
  $("vScan").onclick = startScan;
  $("vScanStop").onclick = stopScan;

  // ---- premios ----
  function renderRedeem(){
    if(!redeemData) return;
    const j = redeemData;
    $("rHello").textContent = first ? kt("redeemTitleName", { name: first }) : kt("redeemTitle");
    $("rPts").textContent = fmt(j.customer.points);
    $("rList").innerHTML = j.rewards.map(r => {
      const ok = j.customer.points >= r.pts;
      return `<div class="rw"><div><b>${esc(r.name)}</b><small>${ok ? esc(kt("pts", { n: fmt(r.pts) })) : esc(kt("missing", { n: fmt(r.pts - j.customer.points), total: fmt(r.pts) }))}</small></div><button type="button" data-id="${esc(r.id)}" ${ok ? "" : "disabled"}>${esc(kt("redeemBtn"))}</button></div>`;
    }).join("") || `<p class='sub'>${esc(kt("noRewards"))}</p>`;
    $("rList").querySelectorAll("button[data-id]").forEach(b => b.onclick = () => claim(b.dataset.id));
  }
  async function loadRedeem(){
    try{
      const j = await F.kioskMe(kc);
      first = j.customer.name || first;
      if(j.coupon){ showCoupon(j.coupon, first); return; }
      redeemData = j; $("rMsg").textContent = "";
      renderRedeem(); show("redeem");
    }catch(err){ if(err.code === "kc_expired") kcLost(); else { $("rMsg").textContent = kerr(err); show("redeem"); } }
  }
  async function claim(id){
    if(!confirm(kt("confirmClaim"))) return;
    document.querySelectorAll("#rList button").forEach(b => b.disabled = true); $("rMsg").textContent = "";
    try{ const j = await F.kioskClaim(kc, id); store.del(KC); showCoupon(j.coupon, first); }
    catch(err){ if(err.code === "kc_expired") kcLost(); else { $("rMsg").textContent = kerr(err); loadRedeem(); } }
  }

  function renderCouponTexts(){
    if(!couponData) return;
    $("cWho").textContent = couponData.name ? kt("couponFor", { name: couponData.name }) : "";
    tickCoupon();
  }
  function tickCoupon(){
    if(!couponData) return;
    const left = new Date(couponData.expiresAt).getTime() - Date.now();
    if(left <= 0){ $("cTime").textContent = kt("couponExpired"); $("ticket").classList.add("dead"); $("cNote").textContent = kt("couponExpiredNote"); $("cNote").removeAttribute("data-i"); clearInterval(tick); return; }
    const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
    $("cTime").textContent = kt("couponLeft", { min: m, sec: String(s).padStart(2, "0") });
  }
  function showCoupon(c, name){
    couponData = { name, expiresAt: c.expiresAt };
    $("cName").textContent = c.name; $("cCode").textContent = c.code;
    // o QR leva só o código do cupom: o caixa lê e o sistema confere se é verdadeiro
    const qr = window.qrcode(0, "M"); qr.addData(c.code); qr.make();
    $("cQr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    clearInterval(tick);
    renderCouponTexts(); tick = setInterval(tickCoupon, 1000);
    show("coupon");
  }

  // ---- idioma ES | PT ----
  document.querySelectorAll(".langbtn").forEach(b => b.addEventListener("click", () => window.kSetLang(b.dataset.lang)));
  window.__kOnLang = () => {
    renderAppBar(); renderRegOk(); renderVisitTitle(); renderVisitOk(); renderRedeem(); renderCouponTexts(); initPhone();
  };

  boot();
})();
