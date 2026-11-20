(function(){
  // Se o aparelho guardou uma página antiga (sem o botão do cupom), limpa o que ficou guardado e recarrega uma vez.
  if(!document.getElementById("couponBtn")){
    let healed = false; try{ healed = sessionStorage.getItem("tabletHealed") === "1"; sessionStorage.setItem("tabletHealed", "1"); }catch(e){}
    if(!healed){
      (async () => {
        try{ if(navigator.serviceWorker){ const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } if(window.caches){ const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } }catch(e){}
        location.reload();
      })();
    }
    return;
  }
  const F = window.Fid, $ = id => document.getElementById(id);
  const TK = "mkf_tablet_" + F.slug;
  let tok = "", timer = 0, offset = 0, slotMs = 15000, fails = 0, raf = 0, endsAt = 0;
  try{ tok = localStorage.getItem(TK) || ""; }catch(e){}

  function logout(msg){
    try{ localStorage.removeItem(TK); }catch(e){}
    tok = ""; clearTimeout(timer); cancelAnimationFrame(raf);
    $("stage").hidden = true; $("gate").hidden = false; $("loginMsg").textContent = msg || "";
  }

  // desenha o QR com o endereço da página do cliente
  function draw(code){
    const url = location.origin + "/k?c=" + encodeURIComponent(code);
    const qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  function animateBar(){
    cancelAnimationFrame(raf);
    const tick = () => {
      const left = Math.max(0, endsAt - (Date.now() + offset));
      $("bar").style.transform = "scaleX(" + Math.min(1, left / slotMs) + ")";
      if(left > 0) raf = requestAnimationFrame(tick);
    };
    tick();
  }

  async function refresh(){
    clearTimeout(timer);
    try{
      const j = await F.kioskQr(tok);
      fails = 0; $("warn").hidden = true;
      slotMs = j.slotMs || 15000; offset = (j.serverNow || Date.now()) - Date.now();
      draw(j.c);
      endsAt = (Math.floor((Date.now() + offset) / slotMs) + 1) * slotMs;
      animateBar();
      // pede o próximo logo depois da virada do relógio do servidor
      timer = setTimeout(refresh, Math.max(500, endsAt - (Date.now() + offset) + 300));
    }catch(e){
      if(e.code === "unauthorized" || e.status === 401){ logout("La sesión venció. Ingresá nuevamente."); return; }
      fails++; if(fails >= 2) $("warn").hidden = false;
      timer = setTimeout(refresh, 4000);
    }
  }

  function start(){
    $("gate").hidden = true; $("stage").hidden = false;
    // mantém a tela acesa quando o navegador deixa
    try{ if(navigator.wakeLock) navigator.wakeLock.request("screen").catch(function(){}); }catch(e){}
    refresh();
  }

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault(); const m = $("loginMsg"); m.textContent = "";
    try{
      tok = await F.auth("tablet", $("tEmail").value.trim(), $("tPass").value);
      try{ localStorage.setItem(TK, tok); }catch(x){}
      $("tPass").value = ""; start();
    }catch(err){ m.textContent = err.message; $("tPass").value = ""; }
  });
  $("off").onclick = () => logout("");
  document.addEventListener("visibilitychange", () => { if(!document.hidden && tok) refresh(); });
  if(tok) start();

  // ---- cupom do cliente: a câmera do tablet lê o QR, o cliente confirma ----
  const kt = window.kt, $v = id => document.getElementById(id);
  let stream = null, scanRaf = 0, idle = 0, closeTimer = 0, busyCheck = false, current = null, lastCode = "";
  const hide = (id, on) => { $v(id).hidden = on; };
  function stopCam(){
    cancelAnimationFrame(scanRaf); clearTimeout(idle);
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $v("cVideo"); if(v) v.srcObject = null;
  }
  function closeOv(){
    stopCam(); clearTimeout(closeTimer); current = null; busyCheck = false;
    hide("ov", true); $v("ovMsg").textContent = "";
  }
  function showCard(kind, title, sub, name, who){
    stopCam(); hide("ovScan", true); hide("ovResult", false);
    $v("ovResult").className = "rcard " + (kind === "ok" ? "ok" : "bad");
    $v("ovResult").innerHTML = "<div class='big'>" + title + "</div>" + (name ? "<div class='rw'>" + esc(name) + "</div>" : "") + (who ? "<div class='who'>" + esc(kt("tForName", { name: who })) + "</div>" : "") + (sub ? "<div class='who'>" + esc(sub) + "</div>" : "");
    $v("ovCancel").textContent = kt("tBack");
  }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function renderCurrent(){
    if(!current) return;
    const c = current;
    if(c.status === "valid"){ showCard("ok", "✓ " + esc(kt("tValid")), "", c.name, c.customer); hide("ovConfirm", false); $v("ovConfirm").textContent = kt("tConfirm"); }
    else if(c.status === "done"){ showCard("ok", "✓ " + esc(kt("tDone")), kt("tDoneSub"), c.name, c.customer); hide("ovConfirm", true); }
    else if(c.status === "used"){ showCard("bad", "✕ " + esc(kt("tUsed")), kt("tUsedSub"), c.name, c.customer); hide("ovConfirm", true); }
    else if(c.status === "expired"){ showCard("bad", "✕ " + esc(kt("tExpired")), kt("tExpiredSub"), c.name, c.customer); hide("ovConfirm", true); }
    else { showCard("bad", "✕ " + esc(kt("tNotFound")), kt("tNotFoundSub")); hide("ovConfirm", true); }
  }
  async function checkCode(code){
    if(busyCheck) return; busyCheck = true; lastCode = code;
    $v("ovMsg").textContent = kt("tChecking");
    try{
      current = await F.kioskCouponCheck(tok, code);
      $v("ovMsg").textContent = ""; renderCurrent();
      // se ninguém confirmar, volta sozinho para o QR
      clearTimeout(closeTimer); closeTimer = setTimeout(closeOv, 40000);
    }catch(e){
      if(e.status === 401){ closeOv(); logout("La sesión venció. Ingresá nuevamente."); return; }
      $v("ovMsg").textContent = e.message; busyCheck = false;
    }
  }
  async function openScan(){
    current = null; busyCheck = false;
    hide("ovScan", false); hide("ovResult", true); hide("ovConfirm", true); $v("ovCancel").textContent = kt("tCancel"); $v("ovMsg").textContent = "";
    hide("ov", false); window.kApply();
    try{ stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); }
    catch(e){ try{ stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }catch(x){ $v("ovMsg").textContent = kt("tNoCam"); return; } }
    const v = $v("cVideo"), cv = $v("cCanvas"), ctx = cv.getContext("2d", { willReadFrequently: true });
    v.srcObject = stream; await v.play().catch(() => {});
    clearTimeout(idle); idle = setTimeout(closeOv, 90000);   // sem uso: fecha a câmera
    const loop = () => {
      if(!stream) return;
      if(!busyCheck && v.readyState >= 2 && v.videoWidth){
        const w = Math.min(640, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
        cv.width = w; cv.height = h; ctx.drawImage(v, 0, 0, w, h);
        const hit = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        const val = hit && hit.data ? String(hit.data).trim().toUpperCase() : "";
        if(/^P[0-9]{5,6}$/.test(val)){ if(navigator.vibrate) navigator.vibrate(80); checkCode(val); }
      }
      scanRaf = requestAnimationFrame(loop);
    };
    loop();
  }
  $v("couponBtn").onclick = openScan;
  $v("ovCancel").onclick = closeOv;
  $v("ovConfirm").onclick = async () => {
    if(!current || current.status !== "valid") return;
    const btn = $v("ovConfirm"); btn.disabled = true;
    try{
      current = await F.kioskCouponUse(tok, lastCode);
      renderCurrent();
      clearTimeout(closeTimer); closeTimer = setTimeout(closeOv, 15000);
    }catch(e){ $v("ovMsg").textContent = e.message; }
    btn.disabled = false;
  };
  document.querySelectorAll("#ov .langbtn").forEach(b => b.addEventListener("click", () => { window.kSetLang(b.dataset.lang); }));
  window.__kOnLang = () => { if(!$v("ov").hidden){ if(current) renderCurrent(); else $v("ovCancel").textContent = kt("tCancel"); } };
  window.kApply();
})();
