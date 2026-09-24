'use strict';
const $=id=>document.getElementById(id),D=window.RSA_SMALL;
let position=0,timer=null;
const mod=(a,n)=>((a%n)+n)%n;
function powerFrames(base,exponent,modulus,label,chapter){
  let result=1;return [...exponent.toString(2)].map((bit,index)=>{
    const before=result,square=before*before,squareR=mod(square,modulus),product=bit==='1'?squareR*base:null;
    result=product===null?squareR:mod(product,modulus);
    return {chapter,title:`${label} · üs biti ${index+1}/${exponent.toString(2).length}`,explanation:`${base}^${exponent} mod ${modulus}; bit ${bit}.`,bits:exponent.toString(2),bitIndex:index,details:`Önceki sonuç: ${before}\nKarele: ${before}² = ${square}\n${square} mod ${modulus} = ${squareR}\n${bit==='1'?`Bit 1 → tabanla çarp: ${squareR} × ${base} = ${product}\n${product} mod ${modulus} = ${result}`:'Bit 0 → ek çarpma yok.'}\n\nYeni sonuç: ${result}`,cards:[['Taban',base],['Bit',bit],['Sonuç',result]]};
  });
}
function build(direction){
  const frames=[];
  if(direction==='enc'){
    frames.push({chapter:'1 · Harfleri kodla',title:'Türk alfabesi indeksleri',explanation:'n=33 küçük olduğu için her harfi 0–28 arasında bir sayıyla gösteriyoruz.',details:`${D.alphabet}\n\na=0, b=1, c=2, …, z=28\n\nmerhaba → ${D.values.join(', ')}`,cards:[['Metin',D.text],['Sayılar',D.values.join(' · ')]]});
    D.text.split('').forEach((ch,i)=>frames.push({chapter:'1 · Harfleri kodla',title:`${i+1}/7 · ${ch} → ${D.values[i]}`,explanation:`“${ch}”, Türk alfabesinin 0 tabanlı dizisinde ${D.values[i]}. sıradadır.`,details:`Alfabe[${D.values[i]}] = “${ch}”`,table:{headers:['Sıra','Harf','Sayı'],rows:D.text.split('').map((c,j)=>[j+1,c,D.values[j]]),active:i}}));
    frames.push({chapter:'2 · Anahtarları üret',title:'p=3 ve q=11',explanation:'İki farklı asal sayı seçilir.',details:'3 yalnızca 1 ve 3’e bölünür.\n11 yalnızca 1 ve 11’e bölünür.',cards:[['p',3],['q',11]]});
    frames.push({chapter:'2 · Anahtarları üret',title:'n = p × q = 33',explanation:'Mesaj sayıları 0 ≤ m < 33 olmalı.',details:'n = 3 × 11 = 33\n\nTürk alfabesi indeksleri 0–28 olduğu için bu aralığa sığar.',cards:[['n',33]]});
    frames.push({chapter:'2 · Anahtarları üret',title:'φ(n) = 20',explanation:'φ(n) = (p−1)(q−1).',details:'φ(n) = (3−1) × (11−1)\n     = 2 × 10\n     = 20',cards:[['φ(n)',20]]});
    frames.push({chapter:'2 · Anahtarları üret',title:'e=3, d=7',explanation:'e ile 20 aralarında asaldır. d, 3×d mod 20 = 1 koşulunu sağlar.',details:'3 × 7 = 21\n21 mod 20 = 1\n\nAçık anahtar: (n,e) = (33,3)\nÖzel anahtar: (n,d) = (33,7)',cards:[['Açık anahtar','(33, 3)'],['Özel anahtar','(33, 7)']]});
    D.text.split('').forEach((ch,i)=>frames.push(...powerFrames(D.values[i],3,33,`${ch}: ${D.values[i]}³ mod 33`,'3 · Harfleri şifrele').map((f,j)=>({...f,byte:i,table:{headers:['Harf','m','m³','c = m³ mod 33'],rows:D.text.split('').map((c,k)=>[c,D.values[k],D.values[k]**3,D.cipher[k]]),active:i},final:j===1?`${ch} → ${D.values[i]} → ${D.cipher[i]}`:''}))));
    frames.push({chapter:'4 · Sonuç',title:'Şifreli sayılar',explanation:'Her harfin karşılığında bir şifreli sayı var.',details:`merhaba → ${D.values.join(', ')}\nşifreli → ${D.cipher.join(', ')}`,cards:[['Şifreli dizi',D.cipher.join(' · ')]]});
  } else {
    frames.push({chapter:'1 · Özel anahtarla çöz',title:'Çözme: m = c⁷ mod 33',explanation:'Şifreli sayılar özel üs d=7 ile çözülür.',details:`Şifreli dizi: ${D.cipher.join(', ')}\nÖzel anahtar: (33,7)`,cards:[['d',7],['n',33]]});
    D.text.split('').forEach((ch,i)=>frames.push(...powerFrames(D.cipher[i],7,33,`${D.cipher[i]}⁷ mod 33`,'2 · Sayıları çöz').map((f,j)=>({...f,byte:i,table:{headers:['Şifreli c','c⁷ mod 33','Harf'],rows:D.cipher.map((c,k)=>[c,D.values[k],D.text[k]]),active:i},final:j===2?`${D.cipher[i]} → ${D.values[i]} → ${ch}`:''}))));
    frames.push({chapter:'3 · Sonuç',title:'Tekrar “merhaba”',explanation:'Çözülen indeksleri Türk alfabesinde okuyunca metin geri gelir.',details:`${D.cipher.join(', ')}\n↓ özel anahtarla çöz\n${D.values.join(', ')}\n↓ alfabeden harfe çevir\nmerhaba`,cards:[['Çözülen','merhaba']]});
  }
  return frames;
}
let frames=build('enc');
function chapters(){ $('chapter').replaceChildren();for(const ch of new Set(frames.map(f=>f.chapter))){const o=document.createElement('option');o.value=o.textContent=ch;$('chapter').append(o);} }
function table(data){$('table-wrap').hidden=!data;$('data-table').replaceChildren();if(!data)return;const h=document.createElement('tr');data.headers.forEach(v=>{const e=document.createElement('th');e.textContent=v;h.append(e)});$('data-table').append(h);data.rows.forEach((row,i)=>{const tr=document.createElement('tr');if(i===data.active)tr.className='active-row';row.forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});$('data-table').append(tr)});}
function render(){const f=frames[position];$('step').max=frames.length-1;$('step').value=position;$('counter').textContent=`${f.chapter} · Adım ${position+1}/${frames.length}`;$('chapter').value=f.chapter;$('title').textContent=f.title;$('explanation').textContent=f.explanation;$('details').textContent=f.details+(f.final?`\n\n${f.final}`:'');$('code').textContent=f.bits?'result = pow(taban, üs, 33)':'# Hesap notebook hücresinde çalıştırılabilir.';$('cards').replaceChildren();for(const [a,b] of f.cards||[]){const d=document.createElement('div');d.className='rsa-card';d.innerHTML=`<span></span><strong></strong>`;d.children[0].textContent=a;d.children[1].textContent=b;$('cards').append(d)}$('power-panel').hidden=!f.bits;$('bits').replaceChildren();if(f.bits){$('formula').textContent=f.title;[...f.bits].forEach((b,i)=>{const s=document.createElement('span');s.className='rsa-bit '+(i===f.bitIndex?'active':i<f.bitIndex?'done':'');s.textContent=b;$('bits').append(s)})}$('byte-panel').hidden=true;table(f.table);$('prev').disabled=position===0;$('next').disabled=position===frames.length-1;$('result').hidden=position!==frames.length-1;$('result').textContent=$('direction').value==='enc'?'Şifreleme tamamlandı.':'Çözme tamamlandı: merhaba.';}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Oynat'}
$('next').onclick=()=>{stop();position=Math.min(position+1,frames.length-1);render()};$('prev').onclick=()=>{stop();position=Math.max(position-1,0);render()};$('reset').onclick=()=>{stop();position=0;render()};$('step').oninput=()=>{stop();position=+$('step').value;render()};$('chapter').onchange=()=>{stop();position=frames.findIndex(f=>f.chapter===$('chapter').value);render()};$('direction').onchange=()=>{stop();position=0;frames=build($('direction').value);chapters();render()};$('play').onclick=()=>{if(timer){stop();return}if(position===frames.length-1)position=0;$('play').textContent='Duraklat';timer=setInterval(()=>{position++;render();if(position===frames.length-1)stop()},+$('speed').value)};
chapters();render();
