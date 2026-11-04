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
if(failed) process.exit(1);
