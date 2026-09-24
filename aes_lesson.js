/* Aynı sabit örneğin açıklama adımları. AES ara durumları aes_core.py'den gelir. */
'use strict';
window.AES_LESSON = (() => {
  const demo = window.AES_DEMO;
  const hex = n => n.toString(16).padStart(2, '0');
  const bits = n => n.toString(2).padStart(8, '0');
  const bytes = values => values.map(hex).join(' ');
  function mul(a, b) {
    let result = 0;
    for (let i=0;i<8;i++) {if(b&1)result^=a; a=((a<<1)^((a&128)?0x11b:0))&255;b>>=1;}
    return result;
  }
  const rotate = (x,n) => ((x<<n)|(x>>(8-n)))&255;
  function inverse(x) {if(!x)return 0;let result=1;for(let i=0;i<254;i++)result=mul(result,x);return result;}
  const sbox = Array.from({length:256},(_,x)=>{const y=inverse(x);return y^rotate(y,1)^rotate(y,2)^rotate(y,3)^rotate(y,4)^0x63;});
  const invbox = Array.from({length:256},(_,x)=>sbox.indexOf(x));
  const encoded = Array.from(new TextEncoder().encode(demo.text));
  const key = Array.from(new TextEncoder().encode(demo.key));
  const padded = demo.enc[0].after;
  const keys = demo.enc.filter(s=>s.key).map(s=>s.key);
  const frame = (chapter,title,explanation,extra={}) => ({chapter,title,explanation,...extra});
  const encodingRows = (text) => [...text].map((char,i)=>[String(i),char,`U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`,String(char.codePointAt(0)),Array.from(new TextEncoder().encode(char)).map(bits).join(' '),bytes(Array.from(new TextEncoder().encode(char)))]);
  const enc = [];
  enc.push(frame('1 · Harften bayta','“merhaba”yı baytlara çevir',
    'Her harfin bir karakter kodu vardır. “merhaba”daki her harf UTF-8’de bir baytla gösterilir: toplam 7 bayt.',
    {cards:[['Açık metin','merhaba'],['Karakter sayısı','7'],['UTF-8 bayt sayısı','7']],
     details:'“m”nin karakter kodu 109’dur.\n109’un ikilik yazımı: 01101101.\n109’un hex yazımı: 6d.\n\nSonraki adımlarda her harfi bu şekilde dönüştüreceğiz.',
     code:'text = "merhaba"\nraw = text.encode("utf-8")\nprint(len(text), len(raw))  # 7 7'}));
  enc.push(frame('1 · Harften bayta','Bit, bayt, onluk ve hex ne demek?',
    'Bit 0 veya 1’dir. Bir bayt 8 bittir: 00000000–11111111, yani 0–255. Aynı baytı onluk, ikilik veya onaltılık (hex) yazabiliriz.',
    {cards:[['Onluk','109'],['İkilik','01101101'],['Hex','6d']],
     details:'Onluk sistemde basamaklar 0–9’dur. Hex’te 16 basamak vardır:\n0 1 2 3 4 5 6 7 8 9 a b c d e f\na=10, b=11, c=12, d=13, e=14, f=15.\n\n109 ÷ 16 = 6, kalan 13 → 6 ve d → 6d.\n6d = 6×16 + 13 = 109.\n6 = 0110, d = 1101 → 0110 1101.\n\nİkilik basamak ağırlıkları: 128 64 32 16 8 4 2 1\n01101101 = 64 + 32 + 8 + 4 + 1 = 109.\n\nİki hex basamağı bir bayttır. 0x öneki hex yazımını belirtir.',
     code:'print(ord("m"))         # 109\nprint(format(109, "08b")) # 01101101\nprint(format(109, "02x")) # 6d'}));
  [...demo.text].forEach((char,i)=>{
    const value=encoded[i], high=Math.floor(value/16), low=value%16;
    enc.push(frame('1 · Harften bayta',`${i+1}/7 · “${char}” nasıl ${hex(value)} oldu?`,
      `“${char}” karakterinin Unicode kod noktası U+${value.toString(16).toUpperCase().padStart(4,'0')}. Onluk değeri ${value}. ASCII aralığında olduğu için UTF-8 bunu tek baytla kodlar.`,
      {cards:[['Harf → onluk',`${char} → ${value}`],['8 bit',bits(value)],['Hex',hex(value)]],table:{headers:['Sıra (0’dan)','Harf','Unicode','Onluk','UTF-8 bitleri','Hex'],rows:encodingRows(demo.text),active:i},
       details:`${value} ÷ 16 = ${high}, kalan ${low}.\nİlk hex basamağı: ${high.toString(16)}. İkinci hex basamağı: ${low.toString(16)}${low>9?` (${low})`:''}.\n${high}×16 + ${low} = ${value} → ${hex(value)}.\n\n${bits(value).slice(0,4)} ${bits(value).slice(4)} → ${hex(value)[0]} ${hex(value)[1]}.\nŞu ana kadar: ${bytes(encoded.slice(0,i+1))}.`,
       code:`char = ${JSON.stringify(char)}\nprint(ord(char))             # ${value}\nprint(char.encode("utf-8").hex()) # ${hex(value)}`}));
  });
  enc.push(frame('2 · 16 bayta tamamla','AES neden 16 bayt bekliyor?',
    'AES, veriyi 16 baytlık bloklar halinde işler. Elimizdeki 7 baytı bir bloğa tamamlamak için 9 bayt dolgu ekleriz.',
    {cards:[['Veri','7 bayt'],['Blok','16 bayt'],['Eksik','16 − 7 = 9 bayt']],
     details:'PKCS#7 kuralı: n = 16 − (veri_baytı_sayısı mod 16).\nBu örnekte n = 16 − 7 = 9.\nSona n kez n değerli bayt eklenir. Onluk 9 = hex 09 = ikilik 00001001.\n\nSon bayt, çözme sonunda kaç dolgu baytı kaldırılacağını belirtir. Bu örnekte son dokuz baytın hepsi 09 olmalıdır.',
     code:'n = 16 - len(raw) % 16\npadded = raw + bytes([n]) * n'}));
  enc.push(frame('2 · 16 bayta tamamla','Yedi veri baytı + dokuz dolgu baytı',
    'İlk 7 bayt “merhaba”dan gelir. Son 9 baytın her birine 09 yazılır.',
    {table:{headers:['Bayt sırası','Nereden geldi?','Onluk','Hex','Bitler'],rows:padded.map((v,i)=>[String(i),i<7?`“${demo.text[i]}”`:'PKCS#7 dolgusu',String(v),hex(v),bits(v)])},details:`AES’e girecek tek blok:\n${bytes(padded)}\n\n7 + 9 = 16 bayt = 128 bit.`,code:'print(padded.hex(" "))\nassert len(padded) == 16'}));
  for(let c=0;c<4;c++) {
    const after=padded.map((v,i)=>i<(c+1)*4?v:null);
    enc.push(frame('3 · State matrisini kur',`${c+1}/4 · Baytları ${c}. sütuna yerleştir`,
      'State, AES’in üzerinde çalıştığı 4×4 baytlık tablonun adıdır. Satır ve sütun numaraları 0’dan başlar. Veri önce yukarıdan aşağıya, sonra sağdaki sütuna ilerleyerek yerleşir.',
      {beforeLabel:`${c}. sütun eklenmeden önce`,afterLabel:`${c}. sütun eklendikten sonra`,before:padded.map((v,i)=>i<c*4?v:null),after,key:null,details:`Kural: state[satır, sütun] = blok[4 × sütun + satır].\n\n${Array.from({length:4},(_,r)=>`blok[${4*c+r}] = ${hex(padded[4*c+r])} → satır ${r}, sütun ${c}`).join('\n')}\n\nBayt sırası sütun sütun ilerler: önce 0–3, sonra 4–7, 8–11 ve 12–15.`,code:'for column in range(4):\n    for row in range(4):\n        state[row][column] = padded[4*column + row]'}));
  }
  enc.push(frame('4 · Anahtarı hazırla','Anahtarın yazısı da baytlara dönüşür',
    'Seçilen anahtar 0123456789abcdef: 16 ASCII karakteri, 16 bayt, 128 bit. Bu örnekte anahtarı doğrudan UTF-8/ASCII baytları olarak kullanıyoruz.',
    {table:{headers:['Sıra','Karakter','Unicode','Onluk','Bitler','Hex'],rows:encodingRows(demo.key)},details:`Anahtar baytları:\n${bytes(key)}\n\nAnahtardaki “0” karakteri → onluk 48 → hex 30.\n“a” karakteri → onluk 97 → hex 61.\nHer karakterin baytı aşağıdaki gibi anahtara eklenir.`,code:'key = b"0123456789abcdef"\nprint(len(key))  # 16\nprint(key.hex(" "))'}));
  enc.push(frame('4 · Anahtarı hazırla','K0’dan K10’a: neden 11 anahtar var?',
    'AES-128 önce K0 ile XOR yapar, ardından 10 tur çalışır. Her turun sonunda farklı bir tur anahtarı kullanılır. Hepsi aynı başlangıç anahtarından hesaplanır.',
    {singleMatrix:true,afterLabel:"Başlangıç anahtarı · K0",before:key,after:key,details:'Anahtar dört kelimeye ayrılır; her kelime dört bayttır.\nW0 = 30 31 32 33\nW1 = 34 35 36 37\nW2 = 38 39 61 62\nW3 = 63 64 65 66\n\nToplam 44 kelime üretilir: W0…W43. Dörder kelime birleştirilince 11 adet 16 baytlık tur anahtarı elde edilir.\n\nHer yeni dört kelimelik grubun ilkinde: son kelimeyi al → RotWord → SubWord → Rcon XOR → dört kelime önceki değerle XOR. Diğer üç kelimede: önceki yeni kelime XOR dört kelime önceki değer.',code:'keys = expand_key(key)\nassert len(keys) == 11'}));
  function keyDetails(round) {
    const prev=keys[round-1],current=keys[round];
    const last=prev.slice(12),rot=[...last.slice(1),last[0]],sub=rot.map(x=>sbox[x]);
    let rcon=1;for(let j=1;j<round;j++)rcon=mul(rcon,2);
    const g=sub.slice();g[0]^=rcon;
    return `K${round-1} son kelime: ${bytes(last)}\n1. RotWord: bir bayt sola döndür → ${bytes(rot)}\n2. SubWord: dört bayta S-box uygula → ${bytes(sub)}\n3. Rcon: ${hex(rcon)} 00 00 00 ile XOR → ${bytes(g)}\n   Rcon yalnızca ilk baytı etkiler.\n\n`+Array.from({length:4},(_,j)=>{
      const left=prev.slice(j*4,j*4+4),right=j===0?g:current.slice((j-1)*4,j*4);
      return `W${4*round+j} = ${bytes(left)} XOR ${bytes(right)}\n    = ${bytes(current.slice(j*4,j*4+4))}`;
    }).join('\n')+`\n\nK${round} = ${bytes(current)}\nRcon dizisi: 01 02 04 08 10 20 40 80 1b 36 (hex). Her adım GF(2⁸) içinde 02 ile çarpılır.\nSubWord için kullanılan S-box, veriye uygulanan SubBytes ile aynı tablodur.`;
  }
  for(let r=1;r<=10;r++)enc.push(frame('5 · Tur anahtarlarını üret',`K${r} nasıl hesaplanır?`,
    `K${r-1} içindeki dört kelimeden K${r} elde ediliyor. XOR işlemleri bayt bayt yapılır.`,
    {beforeLabel:`Kaynak anahtar · K${r-1}`,afterLabel:`Üretilen anahtar · K${r}`,before:keys[r-1],after:keys[r],key:null,details:keyDetails(r),code:'temp = previous_word[1:] + previous_word[:1]\ntemp = [SBOX[x] for x in temp]\ntemp[0] ^= rcon\nnew_word = [a ^ b for a, b in zip(word_four_back, temp)]'}));
  function operationFrame(s) {
    return frame('6 · AES turlarını izle',`Tur ${s.round} · ${s.name}`, '',{...s,operation:true});
  }
  enc.push(...demo.enc.slice(1).map(operationFrame));
  enc.push(frame('7 · Sonucu oku','Matristen şifreli baytlara',
    '10. turda MixColumns uygulanmaz. Son AddRoundKey çıkışı şifreli bloktur. Matrisi tekrar sütun sütun okuyarak 16 baytlık diziyi elde ederiz.',
    {singleMatrix:true,afterLabel:"Şifreli blok · son tur çıktısı",before:demo.enc.at(-1).after,after:demo.enc.at(-1).after,details:`Şifreli baytlar: ${bytes(demo.enc.at(-1).after)}\nHex yazımı: ${demo.cipher}\n\n16 bayt, iki basamaklı hex yazımıyla 32 karakter olarak gösterilir.`,code:'ciphertext = bytes(final_state)\nprint(ciphertext.hex())'}));
  const dec=[frame('1 · Şifreli baytları al','Hex yazısından 16 şifreli bayta',
    'Hex gösterimindeki her iki karakter bir bayta çevrilir. Bu 16 bayt, çözmenin giriş bloğudur.',
    {singleMatrix:true,afterLabel:"Şifreli blok · çözmenin girdisi",before:demo.dec[0].after,after:demo.dec[0].after,details:`${demo.cipher}\n↓ her iki hex basamağı bir bayt\n${bytes(demo.dec[0].after)}\n\nK0…K10 aynı başlangıç anahtarından yeniden hesaplanır. İlk XOR K10 iledir. Tur anahtarları K10’dan K0’a doğru kullanılır.`,code:`ciphertext = bytes.fromhex("${demo.cipher}")\nkeys = expand_key(b"0123456789abcdef")`})];
  dec.push(...demo.dec.slice(1).map(s=>({...operationFrame(s),chapter:'2 · AES ters turları'})));
  dec.push(frame('3 · Dolguyu doğrula ve kaldır','Son bayt 09 bize ne söylüyor?',
    'AES çözme bitti; elde edilen blok hâlâ dolgulu. Son bayt hex 09 = onluk 9. Bu nedenle son 9 baytın tamamı 09 olmalı.',
    {beforeLabel:"Dolgulu veri · 16 bayt",afterLabel:"Dolgu kaldırıldı · 7 veri baytı",before:padded,after:padded.map((x,i)=>i<7?x:null),details:`Geri gelen: ${bytes(padded)}\nSon bayt: 09 → n=9\n1 ≤ n ≤ 16: doğru.\nSon 9 bayt: ${bytes(padded.slice(-9))}\nHepsi 09: doğru → son 9 baytı kaldır.\nKalan: ${bytes(encoded)}`,code:'n = recovered[-1]\nassert 1 <= n <= 16\nassert recovered[-n:] == bytes([n]) * n\nraw = recovered[:-n]'}));
  [...demo.text].forEach((char,i)=>dec.push(frame('4 · Bayttan harfe dön',`${i+1}/7 · ${hex(encoded[i])} yeniden “${char}” oluyor`,
    `Hex ${hex(encoded[i])} = onluk ${encoded[i]}. Bu tek bayt geçerli ASCII/UTF-8 kodlamasıdır. Unicode karşılığı “${char}”.`,
    {table:{headers:['Sıra','Harf','Unicode','Onluk','Bitler','Hex'],rows:encodingRows(demo.text),active:i},details:`${hex(encoded[i])} → ${bits(encoded[i])} → U+${encoded[i].toString(16).toUpperCase().padStart(4,'0')} → “${char}”\nŞu ana kadar çözülen metin: ${demo.text.slice(0,i+1)}`,code:'text = raw.decode("utf-8")\nprint(text) # merhaba'})));
  dec.push(frame('5 · Sonuç','Tekrar merhaba!', 'Aynı anahtarla AES’in ters dönüşümleri uygulandı, PKCS#7 dolgusu doğrulanıp kaldırıldı ve kalan baytlar UTF-8 ile metne çevrildi.',{cards:[['Başlangıç','merhaba'],['Şifreli hex',demo.cipher],['Çözülen','merhaba']],details:'Kodlama: harf ↔ UTF-8 baytları.\nGösterim: bayt ↔ hex / ikilik / onluk yazım.\nAES: anahtarla 16 baytlık bloğu geri çevrilebilir biçimde dönüştürme.\nPKCS#7: blok sınırına tamamlama ve sonradan kaldırma.',code:'assert decrypted == "merhaba"'}));
  return {enc,dec,hex,bits,bytes,mul,inverse,rotate,sbox,invbox,keys,keyDetails};
})();
