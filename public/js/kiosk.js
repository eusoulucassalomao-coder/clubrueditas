(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString("es-AR");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SS = "mkf_k_session_" + F.slug, KC = "mkf_k_kc_" + F.slug;
  const TOKEN_KEY = "club-la-ruedita-token-v1";          // mesmo lugar onde o app guarda a conta do cliente
  const APP_KEY = "club-la-ruedita-pwa-installed-v1";    // o app grava isto quando é aberto instalado
  const SECTIONS = ["load", "dead", "menu", "needqr", "register", "register-ok", "id", "otp", "visit", "visit-ok", "redeem", "coupon"];
  let session = "", kc = "", ident = "", goal = "", first = "", tick = 0, lastSend = 0;
  const store = {
    get: k => { try{ return sessionStorage.getItem(k) || ""; }catch(e){ return ""; } },
    set: (k, v) => { try{ sessionStorage.setItem(k, v); }catch(e){} },
    del: k => { try{ sessionStorage.removeItem(k); }catch(e){} }
  };
  const show = name => { if(name !== "visit") stopScan(); SECTIONS.forEach(s => $("s-" + s).hidden = (s !== name)); window.scrollTo(0, 0); };
  const busy = (btn, on, label) => { btn.disabled = on; if(label) btn.textContent = on ? "Un momento…" : label; };
  const cleanCode = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const receiptFrom = raw => cleanCode(raw);

  // kc (prova de identidade) dura 10 min: guardo a hora para não usar um vencido
  const kcGet = () => { const raw = store.get(KC); if(!raw) return ""; const [t, exp] = raw.split("|"); return Number(exp) > Date.now() ? t : ""; };
  const kcSet = t => store.set(KC, t + "|" + (Date.now() + 9 * 60 * 1000));

  // ---- o app já está instalado? então sugere ABRIR (nunca instalar) ----
  async function appBar(){
    const bar = $("appBar");
    const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if(standalone){ try{ localStorage.setItem(APP_KEY, "1"); }catch(e){} return; }   // já está dentro do app
    let has = false;
    try{ has = localStorage.getItem(APP_KEY) === "1"; }catch(e){}
    try{ if(!has && navigator.getInstalledRelatedApps){ has = (await navigator.getInstalledRelatedApps()).length > 0; } }catch(e){}
    bar.innerHTML = has
      ? "<span style='font-size:24px'>📲</span><span><b>Ya tenés la app instalada</b>Abrila desde el ícono de La Ruedita para ver tus puntos y tu historial.</span>"
      : "<span style='font-size:24px'>📲</span><span><b>Llevá el Club en tu celular</b>Instalá la app para ver tus puntos. <a href='/'>Ver cómo</a></span>";
    bar.hidden = false;
  }

  async function boot(){
    appBar();
    const c = new URLSearchParams(location.search).get("c");
    session = store.get(SS);
    if(c){
      // tira o código do endereço: o QR vale poucos segundos e não deve ficar no histórico
      try{ history.replaceState(null, "", "/k"); }catch(e){}
      try{ const j = await F.kioskEnter(c); session = j.session; store.set(SS, session); store.del(KC); }
      catch(e){ session = ""; store.del(SS); $("deadMsg").textContent = e.status === 401 ? "Escaneá de nuevo el código QR que está en la caja del local." : e.message; show("dead"); return; }
    }
    kc = kcGet();
    show("menu");
  }
  $("deadBack").onclick = () => show("menu");
  $("needBack").onclick = () => show("menu");

  // ---- crear cuenta ----
  $("goRegister").onclick = () => { $("rgMsg").textContent = ""; show("register"); $("rName").focus(); };
  $("rgBack").onclick = () => show("menu");
  $("regForm").addEventListener("submit", async e => {
    e.preventDefault();
    const m = $("rgMsg"); m.textContent = "";
    const name = $("rName").value.trim(), national = $("rPhone").value.replace(/\D/g, "").replace(/^0+/, ""), birth = $("rBirth").value;
    if(name.length < 2){ m.textContent = "Escribí tu nombre."; return; }
    if(national.length < 8 || national.length > 11){ m.textContent = "Revisá tu número de WhatsApp (sin el 0 ni el 15)."; return; }
    if(!birth){ m.textContent = "Ingresá tu fecha de nacimiento."; return; }
    if(!$("rConsent").checked){ m.textContent = "Para unirte necesitás aceptar los mensajes y el uso de tus datos."; return; }
    busy($("rgBtn"), true);
    try{
      const j = await F.register({ name, phone: $("rCountry").value + national, birthday: birth, consent: true, waConsent: true });
      try{ localStorage.setItem(TOKEN_KEY, j.token); }catch(x){}      // el app reconoce la cuenta sin pedir nada
      first = name.split(/\s+/)[0];
      $("rokTitle").textContent = "¡Bienvenido/a, " + first + "!";
      $("rokCode").textContent = j.customer.code;
      show("register-ok");
    }catch(err){ m.textContent = err.status === 429 ? "Demasiados intentos. Esperá un minuto." : err.message; }
    busy($("rgBtn"), false, "Crear mi cuenta");
  });
  $("rokVisit").onclick = () => start("visit");

  // ---- visita / premio: precisan el QR del tablet (presencia en el local) ----
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
    if(goal === "visit"){
      $("vHello").textContent = first ? "Registrá tu visita, " + first : "Registrá tu visita"; $("vMsg").textContent = "";
      show("visit"); $("vTicket").focus(); return;
    }
    await loadRedeem();
  }

  // ---- visita: código del comprobante (trae el valor de la cuenta) ----
  async function sendVisit(code){
    $("vMsg").textContent = ""; busy($("vBtn"), true);
    try{
      const j = await F.kioskVisit(kc, code);
      store.del(KC);
      $("vOkPts").textContent = "+" + fmt(j.pts) + " puntos";
      $("vOkText").textContent = "por tu cuenta de $ " + fmt(j.amount);
      $("vOkTotal").textContent = "Ahora tenés " + fmt(j.total) + " puntos en total. ¡Gracias por venir!";
      show("visit-ok");
    }catch(err){
      if(err.code === "kc_expired"){ kcLost(); }
      else { $("vMsg").textContent = err.message; show("visit"); }
    }
    busy($("vBtn"), false, "Registrar visita");
  }
  $("visitForm").addEventListener("submit", e => {
    e.preventDefault();
    const code = receiptFrom($("vTicket").value);
    if(code.length < 6){ $("vMsg").textContent = "Revisá el código del pago."; return; }
    sendVisit(code);
  });
  function kcLost(){ store.del(KC); kc = ""; $("idMsg").textContent = "Tu verificación venció. Confirmá de nuevo."; show("id"); }

  // ---- cámara para el QR del comprobante ----
  let stream = null, raf = 0;
  function stopScan(){
    cancelAnimationFrame(raf);
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $("vVideo"); if(v) v.srcObject = null;
    const b = $("vScanBox"); if(b) b.hidden = true;
  }
  async function startScan(){
    $("vMsg").textContent = "";
    if(!navigator.mediaDevices || !window.jsQR){ $("vMsg").textContent = "Este navegador no permite usar la cámara. Escribí el código."; return; }
    try{ stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }); }
    catch(e){ $("vMsg").textContent = "No pudimos abrir la cámara. Permití el acceso o escribí el código."; return; }
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
