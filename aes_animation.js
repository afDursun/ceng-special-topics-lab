'use strict';
const $ = id => document.getElementById(id);
const L = window.AES_LESSON;
const {hex,bits,bytes,mul} = L;
let position=0,selected=0,timer=null;
const frames=()=>L[$('direction').value];
const definitions={
  AddRoundKey:['Bayt bayt XOR','State ile tur anahtarı aynı konumlarda XOR yapılır. Bitler aynıysa 0, farklıysa 1 çıkar. Elde taşınmaz. Aynı anahtarla tekrar XOR, başlangıç baytını geri getirir.'],
  SubBytes:['Doğrusal olmayan değiştirme','Her bayt S-box tablosunda bir adres olur; o adreste yazan değer yeni bayttır. S-box tüm turlarda aynıdır ve anahtara bağlı değildir. Baytların konumu değişmez.'],
  InvSubBytes:['S-box eşlemesini tersine çevir','İleri S-box hangi girişten bu değeri ürettiyse o giriş bulunur. Ters tablo da 256 girişlidir; her değer tam bir kez bulunduğu için işlem geri çevrilebilir.'],
  ShiftRows:['Satırları sola döndür','0. satır sabit; 1., 2., 3. satırlar sırasıyla 1, 2, 3 hücre sola döner. Soldan çıkan bayt sağ uca sarılır. Baytların kendisi değişmez.'],
  InvShiftRows:['Satırları sağa döndür','Şifrelemedeki satır kaydırmasını geri al: 0, 1, 2, 3 satırlarını sırasıyla 0, 1, 2, 3 hücre sağa döndür. Sağdan çıkan bayt sola sarılır.'],
  MixColumns:['Sütundaki dört baytı karıştır','Her sütundaki dört bayt, sabit bir matrisle karıştırılır. Toplama XOR’dur.'],
  InvMixColumns:['Sütun karıştırmasını geri al','Ters matrisle aynı sütunun önceki değerleri geri getirilir.']
};
function multiplicationDetails(value,coefficient) {
  let powers=[value];for(let i=1;i<4;i++)powers.push(mul(powers[i-1],2));
  const lines=[`${hex(coefficient)} · ${hex(value)} hesabı:`];
  if(coefficient===1)return lines[0]+` 01 ile çarpım → ${hex(value)}`;
  for(let i=1;i<=Math.floor(Math.log2(coefficient));i++){
    const v=powers[i-1],shifted=(v<<1)&255;
    lines.push(`  ${hex(v)} × 02: ${bits(v)} sola kaydır → alt 8 bit ${bits(shifted)} (${hex(shifted)})`);
    lines.push(v&128?`  En üst bit 1’di: ${hex(shifted)} XOR 1b = ${hex(powers[i])}`:`  En üst bit 0’dı: indirgeme yok → ${hex(powers[i])}`);
  }
  const chosen=powers.filter((_,i)=>coefficient&(1<<i));
  lines.push(`  ${hex(coefficient)} = ${powers.map((_,i)=>1<<i).filter(v=>coefficient&v).map(hex).join(' XOR ')}`);
  lines.push(`  Sonuç: ${chosen.map(hex).join(' XOR ')} = ${hex(mul(value,coefficient))}`);
  return lines.join('\n');
}
function inverseDetails(x) {
  if(x===0)return '00 için çarpımsal ters yoktur; AES burada 00 kullanır.';
  let power=x, product=1;
  const lines=['Ters nasıl bulundu? Sıfır olmayan x için x^255 = 01; bu nedenle x^254, x’in çarpımsal tersidir.', '254 = 2 + 4 + 8 + 16 + 32 + 64 + 128. Çarpımlar GF(2⁸) içindedir:'];
  for(let exponent=2;exponent<=128;exponent*=2){
    const previous=power;power=mul(power,power);
    const before=product;product=mul(product,power);
    lines.push(`x^${exponent}: ${hex(previous)} · ${hex(previous)} = ${hex(power)}; biriken çarpım: ${hex(before)} · ${hex(power)} = ${hex(product)}`);
  }
  lines.push(`x^254 = ${hex(product)}. Kontrol: ${hex(x)} · ${hex(product)} = ${hex(mul(x,product))}.`);
  return lines.join('\n');
}
function operationDetails(s) {
  const a=s.before,b=s.after,i=selected,r=i%4,c=Math.floor(i/4);
  const heading=`Seçili sonuç: satır ${r}, sütun ${c} · dizide bayt ${i}\n`;
  if(s.name==='AddRoundKey') {
    const key=s.key[i];
    return {sources:[i],calculation:heading+`Veri:   ${hex(a[i])} = ${bits(a[i])}\nK${s.round}:     ${hex(key)} = ${bits(key)}\nXOR:    ${hex(b[i])} = ${bits(b[i])}\n\nBit konumu:     7 6 5 4 3 2 1 0\nVeri bitleri:   ${bits(a[i]).split('').join(' ')}\nAnahtar:       ${bits(key).split('').join(' ')}\nSonuç:         ${bits(b[i]).split('').join(' ')}\n\nTersini kontrol et: ${hex(b[i])} XOR ${hex(key)} = ${hex(b[i]^key)}`,
    details:`XOR doğruluk tablosu:\n0 XOR 0 = 0\n0 XOR 1 = 1\n1 XOR 0 = 1\n1 XOR 1 = 0\n\nPython’da XOR, ^ ile yazılır.\n\nK${s.round} = ${bytes(s.key)}\nHer bir veri baytı yalnızca aynı konumdaki anahtar baytıyla XOR edilir. Şifrelemede başlangıçta K0, sonra K1…K10 kullanılır. Çözmede K10…K0 kullanılır.`,
    code:'state = [data_byte ^ key_byte\n         for data_byte, key_byte in zip(state, round_key)]'};
  }
  if(s.name.includes('SubBytes')) {
    const inverse=s.name.startsWith('Inv'),input=a[i],output=b[i],forwardInput=inverse?output:input,y=L.inverse(forwardInput);
    const rotations=[1,2,3,4].map(n=>L.rotate(y,n));
    return {sources:[i],calculation:heading+`${inverse?'Ters S-box':'S-box'} girişi: ${hex(input)}\nÜst hex basamağı → satır ${hex(input)[0]} (onluk ${input>>4})\nAlt hex basamağı → sütun ${hex(input)[1]} (onluk ${input&15})\nTablonun kesişimi: ${hex(output)}\n\n${inverse?'INV_SBOX':'SBOX'}[0x${hex(input)}] = 0x${hex(output)}\n${inverse?`Kontrol: SBOX[${hex(output)}] = ${hex(input)}`:`Kontrol: INV_SBOX[${hex(output)}] = ${hex(input)}`}`,
    details:`S-box, AES’in sabit değiştirme tablosudur.\n\nTablo nasıl üretilir?${inverse?' Aşağıda ters eşlemenin ileri yöndeki üretimi var.':''}\n1. ${hex(forwardInput)} baytının GF(2⁸) çarpımsal tersi alınır → ${hex(y)}.\n${forwardInput===0?'   00 için özel olarak 00 seçilir.':`   Kontrol: ${hex(forwardInput)} · ${hex(y)} = ${hex(mul(forwardInput,y))}.` }\n${inverseDetails(forwardInput)}\n\n2. Bu bayt ve 1, 2, 3, 4 bit sola dairesel döndürülmüş halleri XOR edilir; sabit 63 eklenir (XOR).\n   y      = ${bits(y)} (${hex(y)})\n${rotations.map((v,j)=>`   rol${j+1}(y)= ${bits(v)} (${hex(v)})`).join('\n')}\n   sabit  = 01100011 (63)\n   ${[y,...rotations,0x63].map(hex).join(' XOR ')} = ${hex(L.sbox[forwardInput])}\n\nDairesel bit döndürmede soldan çıkan bit sağa gelir.`,
    code:inverse?'state = [INV_SBOX[value] for value in state]':'state = [SBOX[value] for value in state]'};
  }
  if(s.name.includes('ShiftRows')) {
    const inverse=s.name.startsWith('Inv'),source=(c+(inverse?-r:r)+4)%4;
    return {sources:[4*source+r],calculation:heading+`Hedef satır ${r}, sütun ${c}\nKaynak sütun: (${c} ${inverse?'−':'+'} ${r} + 4) mod 4 = ${source}\nKaynak bayt: state[${r}, ${source}] = ${hex(a[4*source+r])}\nYeni konum:  state[${r}, ${c}] = ${hex(b[i])}\n\nSatırın önceki hali: ${bytes([0,1,2,3].map(col=>a[4*col+r]))}\nSatırın yeni hali:   ${bytes([0,1,2,3].map(col=>b[4*col+r]))}`,
    details:`Dairesel kaydırma; hiçbir bayt atılmaz veya eklenmez.\n${[0,1,2,3].map(row=>`Satır ${row}: ${bytes([0,1,2,3].map(col=>a[4*col+row]))}\n         ${row} hücre ${inverse?'sağa':'sola'} → ${bytes([0,1,2,3].map(col=>b[4*col+row]))}`).join('\n')}\n\n“mod 4” işlemi sütun numarasını 0–3 aralığına sarar. Kaydırma, sonraki MixColumns için sütunlardaki baytları değiştirir.`,
    code:`# Düz dizide indeks = 4 * sütun + satır\nnew_state = [state[4*((c ${inverse?'-':'+'} r) % 4) + r]\n             for c in range(4) for r in range(4)]`};
  }
  const inverse=s.name.startsWith('Inv'),base=inverse?[14,11,13,9]:[2,3,1,1];
  const coefficients=Array.from({length:4},(_,j)=>base[(j-r+4)%4]);
  const col=a.slice(c*4,c*4+4),products=coefficients.map((v,j)=>mul(v,col[j]));
  let cumulative=0;
  return {sources:[0,1,2,3].map(j=>c*4+j),calculation:heading+`Giriş sütunu (yukarıdan aşağı): ${bytes(col)}\nMatrisin ${r}. satırı: ${bytes(coefficients)}\n\n${coefficients.map((v,j)=>`(${hex(v)} · ${hex(col[j])})`).join(' XOR ')}\n= ${products.map(hex).join(' XOR ')}\n\n${products.map(v=>{const before=cumulative;cumulative^=v;return `${hex(before)} XOR ${hex(v)} = ${hex(cumulative)}`;}).join('\n')}\nÇıktı: ${hex(b[i])}\n\n${coefficients.map((v,j)=>multiplicationDetails(col[j],v)).join('\n\n')}`,
  details:`Sabit ${inverse?'ters ':''}matris:\n${[0,1,2,3].map(row=>bytes([0,1,2,3].map(j=>base[(j-row+4)%4]))).join('\n')}`,
  code:'result = 0\nfor coefficient, byte in zip(matrix_row, column):\n    result ^= gf_mul(coefficient, byte)'};
}
function draw(id,values,old,clickable,sources=[]) {
  $(id).replaceChildren();
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const i=4*c+r,v=values[i],node=document.createElement(clickable?'button':'span');
    node.className='aes-byte'+(old&&old[i]!==v?' changed':'')+(clickable&&selected===i?' selected':'')+(sources.includes(i)?' source-byte':'');
    node.textContent=v===null?'—':hex(v);node.title=`Satır ${r}, sütun ${c}, bayt ${i}`;
    if(clickable){node.setAttribute('aria-label',`${node.title}: ${node.textContent}`);node.setAttribute('aria-pressed',selected===i);node.onclick=()=>{stop();selected=i;render();};}
    $(id).append(node);
  }
}
function renderTable(table) {
  $('table-wrap').hidden=!table;$('lesson-table').replaceChildren();if(!table)return;
  const head=document.createElement('thead'),row=document.createElement('tr');
  table.headers.forEach(label=>{const th=document.createElement('th');th.textContent=label;th.scope='col';row.append(th);});head.append(row);
  const body=document.createElement('tbody');table.rows.forEach((values,i)=>{const tr=document.createElement('tr');if(i===table.active){tr.className='active-row';tr.setAttribute('aria-current','step');}values.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);});
  $('lesson-table').append(head,body);
}
function renderSbox(s) {
  const show=s.operation&&s.name.includes('SubBytes');$('sbox-panel').hidden=!show;if(!show)return;
  const inverse=s.name.startsWith('Inv'),table=inverse?L.invbox:L.sbox,input=s.before[selected];
  $('sbox-note').textContent=`${inverse?'Ters S-box':'S-box'}: satır ${hex(input)[0]}, sütun ${hex(input)[1]} → ${hex(table[input])}. Başlıklar hex’tir.`;
  const target=$('sbox-table');target.replaceChildren();
  const header=document.createElement('tr');for(const text of ['↘',...'0123456789abcdef']){const th=document.createElement('th');th.textContent=text;th.scope='col';header.append(th);}target.append(header);
  for(let r=0;r<16;r++){const row=document.createElement('tr'),label=document.createElement('th');label.textContent=r.toString(16);label.scope='row';row.append(label);for(let c=0;c<16;c++){const td=document.createElement('td');td.textContent=hex(table[r*16+c]);if(r*16+c===input)td.className='active-row';row.append(td);}target.append(row);}
}
function render() {
  const list=frames(),s=list[position],op=s.operation?operationDetails(s):null;
  $('step').max=list.length-1;$('step').value=position;$('step').setAttribute('aria-valuetext',`${position+1}: ${s.title}`);
  $('chapter').value=s.chapter;$('counter').textContent=`${s.chapter} · Adım ${position+1} / ${list.length}`;
  $('title').textContent=s.title;$('explanation').textContent=s.operation?definitions[s.name][1]:s.explanation;
  $('cards').replaceChildren();for(const [label,value] of s.cards||[]){const card=document.createElement('div'),tag=document.createElement('span'),strong=document.createElement('strong');card.className='lesson-card';tag.textContent=label;strong.textContent=value;card.append(tag,strong);$('cards').append(card);}
  renderTable(s.table);
  $('matrices').hidden=!s.after;$('matrix-hint').hidden=!s.after;
  $('before-panel').hidden=Boolean(s.singleMatrix);
  $('before-label').textContent=s.beforeLabel || `${s.name} girdisi`;
  $('after-label').textContent=s.afterLabel || `${s.name} çıktısı`;
  $('matrices').classList.toggle('single-matrix',Boolean(s.singleMatrix));
  $('matrices').classList.toggle('two-matrices',!s.singleMatrix&&!s.key);
  $('matrix-hint').textContent=s.operation?'Bir çıktı baytına tıkla: hesabını ve kaynak baytlarını gör. Kırmızı: değişen değer. Mavi çerçeve: seçilen çıktı. Mavi zemin: kaynak.':s.singleMatrix?'Bir bayta tıkla: konumunu, onluk ve ikilik değerini gör.':'İkinci matristen bir bayt seçerek değerini incele. Kırmızı hücreler değişen konumları gösterir.';
  if(s.after){draw('before',s.before,null,false,op?.sources||[]);draw('after',s.after,s.before,true);$('key-panel').hidden=!s.key;if(s.key){draw('round-key',s.key,null,false,[selected]);$('key-note').textContent=`K${s.round??0} · 16 bayt`;}}
  $('calculation-panel').hidden=!s.after;
  $('calculation').textContent=op?op.calculation:s.after?`Seçilen konum: satır ${selected%4}, sütun ${Math.floor(selected/4)}; bayt sırası ${selected}.\n${s.after[selected]===null?'Bu konum henüz doldurulmadı veya dolgu kaldırıldı.':`Hex ${hex(s.after[selected])} = onluk ${s.after[selected]} = ikilik ${bits(s.after[selected])}.`}`:'';
  $('details-title').textContent=s.operation?definitions[s.name][0]:'Adımın ayrıntısı';
  $('details').textContent=op?op.details:s.details;$('code').textContent=op?op.code:s.code;
  renderSbox(s);$('key-details-panel').hidden=!s.operation||!s.key;
  if(s.key&&s.operation)$('key-details').textContent=s.round===0?'K0, başlangıç anahtarının ASCII/UTF-8 baytlarıdır.\n'+bytes(s.key):L.keyDetails(s.round);
  $('linear').hidden=!s.after;$('linear').textContent=s.after?'Sütun sırasıyla: '+s.after.map(v=>v===null?'—':hex(v)).join(' '):'';
  $('prev').disabled=position===0;$('next').disabled=position===list.length-1;
  $('result').hidden=position!==list.length-1;
  $('result').textContent=position===list.length-1?($('direction').value==='enc'?`Şifreleme tamamlandı: ${window.AES_DEMO.cipher}. Çöz yönüyle devam edebilirsin.`:'Çözme tamamlandı: merhaba.'):s.operation?`Bu turdaki 16 sonuç baytından herhangi birine tıklayarak hesabını inceleyebilirsin.`:'Sonraki adımla devam et.';
}
function chapters(){const seen=new Set();$('chapter').replaceChildren();for(const s of frames()){if(seen.has(s.chapter))continue;seen.add(s.chapter);const option=document.createElement('option');option.value=s.chapter;option.textContent=s.chapter;$('chapter').append(option);}}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Oynat';}
$('play').onclick=()=>{if(timer){stop();return;}if(position===frames().length-1)position=0;render();$('play').textContent='Duraklat';timer=setInterval(()=>{position++;render();if(position===frames().length-1)stop();},Number($('speed').value));};
$('prev').onclick=()=>{stop();position=Math.max(0,position-1);render();};
$('next').onclick=()=>{stop();position=Math.min(frames().length-1,position+1);render();};
$('reset').onclick=()=>{stop();position=0;selected=0;render();};
$('direction').onchange=()=>{stop();position=0;selected=0;chapters();render();};
$('chapter').onchange=()=>{stop();position=frames().findIndex(s=>s.chapter===$('chapter').value);render();};
$('step').oninput=()=>{stop();position=Number($('step').value);render();};
$('speed').onchange=stop;
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
chapters();render();
