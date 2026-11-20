(function(){
  const F = window.Fid, $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString("es-AR");
  const TK = "mkf_caja_" + F.slug;   // mesma sessão da caja
  let tok = "";
  try{ tok = sessionStorage.getItem(TK) || ""; }catch(e){}

  function logout(msg){ try{ sessionStorage.removeItem(TK); }catch(e){} tok = ""; $("app").hidden = true; $("gate").hidden = false; $("loginMsg").textContent = msg || ""; }
  async function run(fn){ try{ return await fn(); }catch(e){ if(e.code === "unauthorized" || e.code === "forbidden"){ logout("La sesión venció. Ingresá nuevamente."); } throw e; } }
  function boot(){ $("gate").hidden = true; $("app").hidden = false; $("amount").focus(); }

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault(); const m = $("loginMsg"); m.textContent = "";
    try{ tok = await F.authCaja($("pEmail").value.trim(), $("pPass").value); try{ sessionStorage.setItem(TK, tok); }catch(x){} $("pPass").value = ""; boot(); }
    catch(err){ m.textContent = err.message; $("pPass").value = ""; }
  });
  $("out").onclick = () => logout("");
  if(tok) boot();

  $("amount").addEventListener("input", () => { const d = $("amount").value.replace(/\D/g, ""); $("amount").value = d ? fmt(Number(d)) : ""; });

  $("form").addEventListener("submit", async e => {
    e.preventDefault();
    const m = $("msg"), btn = $("btn"); m.className = "msg"; m.textContent = "";
    const amount = $("amount").value.replace(/\D/g, "");
    if(!amount){ m.className = "msg err"; m.textContent = "Escribí el total de la cuenta."; return; }
    btn.disabled = true;
    try{
      const r = (await run(() => F.receiptCreate(tok, amount))).receipt;
      draw(r); $("amount").value = ""; $("print").hidden = false;
    }catch(err){ m.className = "msg err"; m.textContent = err.message; }
    btn.disabled = false;
  });

  function draw(r){
    // O QR é um link: se o cliente escanear com a câmera do celular, abre a página de registrar visita já com o código.
    const url = location.origin + "/k?r=" + r.code;
    const qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
    const code = r.code.slice(0, 4) + "-" + r.code.slice(4);
    const when = new Date(r.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    $("out-receipt").innerHTML = `<div class="receipt">
      <h3>LA RUEDITA</h3><div class="c">Comprobante de prueba · ${when}</div><hr>
      <div class="tot"><span>TOTAL</span><span>$ ${fmt(r.amount)}</span></div><hr>
      <div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div>
      <div class="code">${code}</div>
      <div class="hint">Escaneá el QR o ingresá el código en el Club para sumar tus puntos.<br>Vale una sola vez.</div></div>`;
    $("out-receipt").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("print").onclick = () => window.print();
})();
