(function(){
  const $=id=>document.getElementById(id),F=window.Fid;
  const params=new URLSearchParams(location.search);
  $("memberCode").value=(params.get("code")||"").toUpperCase();
  $("googleReview").href=window.CFG.reviewUrl;
  (async()=>{try{const cf=await F.init();$("reward").textContent="Recompensa: "+Number(cf.bonus.review||100).toLocaleString("es-AR")+" puntos por participar.";}catch(e){}})();
  $("reviewForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const code=$("memberCode").value.trim().toUpperCase();
    const stars=document.querySelector('input[name="stars"]:checked');
    const status=$("status"),button=$("sendReview");
    if(!stars){status.textContent="Elegí una puntuación de 1 a 5 estrellas.";return;}
    button.disabled=true;status.textContent="Enviando...";
    try{
      const result=await F.submitReview({code,stars:Number(stars.value),comment:$("comment").value,improvement:$("improvement").value});
      $("reviewForm").style.display="none";$("done").style.display="block";
      $("earned").textContent="Sumaste "+Number(result.points).toLocaleString("es-AR")+" puntos. Tu saldo ahora es de "+Number(result.total).toLocaleString("es-AR")+" puntos.";
    }catch(err){status.textContent=err.message||"No se pudo enviar. Intentá nuevamente.";button.disabled=false;}
  });
})();