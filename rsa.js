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
  cells.forEach(cell=>{
    const area=cell.querySelector('textarea');
    if(window.CodeMirror)editors.set(cell,CodeMirror.fromTextArea(area,{mode:'python',lineNumbers:false,indentUnit:4,tabSize:4,lineWrapping:true,viewportMargin:Infinity,extraKeys:{'Shift-Enter':()=>runBatch([cell])}}));
    else area.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.shiftKey){event.preventDefault();runBatch([cell]);}});
    cell.querySelector('.run').onclick=()=>runBatch([cell]);
  });
  document.getElementById('run-all').onclick=()=>runBatch(cells);
  try{
    python=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'});
    await python.runPythonAsync(document.getElementById('rsa-core').textContent);
    status('Hazır. Hücreleri sırayla çalıştır.');lock(false);
  }catch(error){python=null;status('Python yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenile.',true);lock(true);}
}
main();
