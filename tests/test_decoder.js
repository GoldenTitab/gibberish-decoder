require('../src/dictionaries.js');
const D=require('../src/decoder.js');
const s={fixNumbers:true,fixZwnj:true};
const cases=[
['sghl','سلام'],['sghl ]di','سلام چیه'],['ld o,hil','می‌خواهم'],[';jhf ih','کتاب‌ها'],['sghl 123?','سلام ۱۲۳؟'],['اثممخ','hello'],['sghl I am fine','سلام I am fine'],['hello, how are you?','hello, how are you?'],['سلام خوبی؟','سلام خوبی؟'],['می روم','می‌روم'],['کتاب ها','کتاب‌ها'],['wrold','wrold'],['helo','helo'],['من می روم','من می‌روم'],['نمی خواهم','نمی‌خواهم'],['کتاب های خوب','کتاب‌های خوب'],['کتاب هایی','کتاب‌هایی'],['امروز هوا خوب است','امروز هوا خوب است'],['لطفا کمک کن','لطفا کمک کن'],['I love Flutter and Dart','I love Flutter and Dart'],['سلامم','سلامم'],['sghl and','سلام and'],['and','and']
];
let failed=0;
for(const [input,expected] of cases){const got=D.analyze(input,s).correctedText; const ok=got===expected; console.log(ok?'PASS':'FAIL',JSON.stringify(input),'->',JSON.stringify(got),'expected',JSON.stringify(expected)); if(!ok)failed++;}
const noZwnj=D.analyze('می روم',{fixNumbers:true,fixZwnj:false}); if(noZwnj.correctedText!=='می روم'){console.log('FAIL ZWNJ toggle off');failed++;} else console.log('PASS ZWNJ toggle off');
const noNumbers=D.analyze('sghl 123',{fixNumbers:false,fixZwnj:true}); if(noNumbers.correctedText!=='سلام 123'){console.log('FAIL number toggle off');failed++;} else console.log('PASS number toggle off');
const faArabicDigits=D.convertFaToEn('۱۲۳ ١٢٣'); if(faArabicDigits!=='123 123'){console.log('FAIL Persian/Arabic digit conversion');failed++;} else console.log('PASS Persian/Arabic digit conversion');
const enDigits=D.convertEnToFa('123'); if(enDigits!=='۱۲۳'){console.log('FAIL English digit conversion');failed++;} else console.log('PASS English digit conversion');
const faTypo=D.analyze('امرووز',s); if(faTypo.correctedText!=='امرووز'){console.log('FAIL Persian spelling must remain untouched');failed++;} else console.log('PASS Persian spelling untouched');
const enTypo=D.analyze('recieve',s); if(enTypo.correctedText!=='recieve'){console.log('FAIL English spelling must remain untouched');failed++;} else console.log('PASS English spelling untouched');
const amb=D.analyze('helo',s); if(amb.correctedText!=='helo' || amb.issues.length){console.log('FAIL spelling must not be analyzed');failed++;} else console.log('PASS spelling is not analyzed');
const w=D.analyze('wrold',s); if(w.correctedText!=='wrold' || w.issues.length){console.log('FAIL no spelling analysis for wrold');failed++;} else console.log('PASS no spelling analysis');
const nb=D.analyze('this and that',s); if(nb.issues.length){console.log('FAIL "and" among English flagged');failed++;} else console.log('PASS "and" among English');

// ---- Regression: floating-button "Fix all" must match the quick-test result
// for a fully wrong-layout Persian sentence (unknown words, lone "," = و, likely words).
{
  const fa=['سلام من امروز می خواهم درباره پروژه اکستنشن کروم صحبت کنم','لطفا فایل پیوست را بررسی کنید و نتیجه را بگویید','دکمه شناور باید همه کلمات را درست تبدیل کند','من و تو رفتیم به خونه و غذا خوردیم'];
  const norm=t=>t.replace(/\u200C/g,' ');
  for(const f of fa){
    const gib=D.convertFaToEn(f,{fixNumbers:false});
    const got=D.analyze(gib,s).correctedText;
    if(norm(got)!==norm(f)){console.log('FAIL float vs popup',JSON.stringify(f),'->',JSON.stringify(got));failed++;} else console.log('PASS float vs popup',f);
  }
  // English must never be touched by the context pass
  for(const k of ['sghl Flutter','sghl lk Dart','please check github.com/foo and file.txt','we should use npm install']){
    const got=D.analyze(k,s).correctedText;
    const exp=k.replace('sghl','سلام').replace('lk','من');
    if(got!==exp){console.log('FAIL context pass touched English',JSON.stringify(k),'->',JSON.stringify(got));failed++;} else console.log('PASS english kept',k);
  }
  // English-looking unknown word is offered as a choice, never applied silently
  const amb=D.analyze(D.convertFaToEn('ببخشید میتونید یه کمک کوچیک به من بکنید',{fixNumbers:false}),s);
  if(!amb.issues.some(i=>i.type==='ambiguous'&&i.alternatives[1]==='ببخشید')||amb.correctedText.includes('ببخشید')){console.log('FAIL ambiguous offer');failed++;} else console.log('PASS ambiguous offer');
}

// ---- convertAuto: floating button == quick test for any wrong-layout Persian sentence
{
  const fa=['دکمه شناور باید همه کلمات را درست تبدیل کند','ببخشید میتونید یه کمک کوچیک به من بکنید','فردا صبح جلسه داریم و باید گزارش آماده باشه','کد رو توی گیت هاب آپلود کردم و تست ها پاس شدن','دکمه شناور','کروم و فایرفاکس','شماره من ۰۹۱۲۳۴۵۶۷۸۹ است؟'];
  for(const f of fa){
    const gib=D.convertFaToEn(f,{fixNumbers:false});
    const r=D.convertAuto(gib,s);
    if(r.direction!=='fa'||r.text!==D.convertEnToFa(gib,s)||r.text.replace(/\u200C/g,' ')!==f.replace(/\u200C/g,' ')){console.log('FAIL convertAuto',JSON.stringify(f),'->',r.direction,JSON.stringify(r.text));failed++;} else console.log('PASS convertAuto',f);
  }
  for(const k of ['hello, how are you?','I love Flutter and Dart','please check github.com/foo and file.txt','we should use npm install and pnpm dev','سلام خوبی؟ امروز چطوری','run git status then git commit']){
    const r=D.convertAuto(k,s);
    if(r.text!==k){console.log('FAIL convertAuto changed',JSON.stringify(k),'->',JSON.stringify(r.text));failed++;} else console.log('PASS convertAuto untouched',k);
  }
  const en=D.convertAuto('اثممخ صخقمی',s);
  if(en.direction!=='en'||en.text!=='hello world'){console.log('FAIL convertAuto en',JSON.stringify(en));failed++;} else console.log('PASS convertAuto en');
}
if(failed) process.exit(1);
