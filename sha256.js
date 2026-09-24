'use strict';
const cells=[...document.querySelectorAll('.cell')],editors=new WeakMap();
const statusEl=document.getElementById('status');
let python=null,busy=false,count=0;
function status(text,error=false){statusEl.textContent=text;statusEl.className='status '+(error?'error':'ready');}
function lock(value){busy=value;document.querySelectorAll('.run,#run-all').forEach(b=>b.disabled=value||!python);}
async function runBatch(targets){
  if(!python||busy)return;lock(true);
  try{
    for(const cell of targets){
      const source=editors.has(cell)?editors.get(cell).getValue():cell.querySelector('textarea').value;
      python.globals.set('__lab_code__',source);
      await python.runPythonAsync(`
import io, sys, traceback
__lab_buffer__ = io.StringIO()
__lab_stdout__, __lab_stderr__ = sys.stdout, sys.stderr
sys.stdout = sys.stderr = __lab_buffer__
__lab_error__ = None
try:
    exec(__lab_code__, globals())
except Exception:
    __lab_error__ = traceback.format_exc()
finally:
    sys.stdout, sys.stderr = __lab_stdout__, __lab_stderr__
__lab_output__ = __lab_buffer__.getvalue()
`);
      const error=python.runPython('__lab_error__'),output=python.runPython('__lab_output__');
      const out=cell.querySelector('.out'),pre=document.createElement('pre');
      pre.className='out-text';pre.textContent=(output||'')+(error||'');out.replaceChildren(pre);out.hidden=!pre.textContent;out.classList.toggle('err',Boolean(error));
      cell.querySelector('.prompt').textContent=`In [${++count}]`;
      if(error){status('Hücrede hata var. Düzeltip bu hücreden devam et.',true);return;}
    }
    status('Çalıştırma tamamlandı.');
  }catch(error){status('Çalıştırma hatası: '+error.message,true);}finally{lock(false);}
}
async function main(){
  // Temel derste yalnızca sonuç, bayt dönüşümü ve değişiklik etkisi gösterilir.
  for(const cell of cells.splice(2,5)){
    const heading=cell.previousElementSibling?.previousElementSibling;
    const description=cell.previousElementSibling;
    heading?.remove();description?.remove();cell.remove();
  }
  document.querySelector('details')?.remove();
  const lastHeading=[...document.querySelectorAll('h2')].find(heading=>heading.textContent.startsWith('8.'));
  if(lastHeading)lastHeading.textContent='3. Küçük değişiklik, farklı özet';
  document.querySelector('.lead').textContent='“merhaba” metninin özetini üret ve küçük bir değişikliğin sonucu nasıl değiştirdiğini gör.';
  const download=[...document.querySelectorAll('a')].find(link=>link.textContent.includes('Jupyter'));
  if(download)download.href='notebooks/SHA256_Sade.ipynb';
  cells.forEach(cell=>{
    const area=cell.querySelector('textarea');
    if(window.CodeMirror)editors.set(cell,CodeMirror.fromTextArea(area,{mode:'python',lineNumbers:false,indentUnit:4,tabSize:4,lineWrapping:true,viewportMargin:Infinity,extraKeys:{'Shift-Enter':()=>runBatch([cell])}}));
    else area.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.shiftKey){event.preventDefault();runBatch([cell]);}});
    cell.querySelector('.run').onclick=()=>runBatch([cell]);
  });
  document.getElementById('run-all').onclick=()=>runBatch(cells);
  try{
    python=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'});
    await python.runPythonAsync(document.getElementById('sha-core').textContent);
    status('Hazır. Hücreleri sırayla çalıştır.');lock(false);
  }catch(error){python=null;status('Python yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenile.',true);lock(true);}
}
main();
