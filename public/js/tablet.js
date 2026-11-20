(function(){
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
})();
