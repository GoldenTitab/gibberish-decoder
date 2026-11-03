require('../src/dictionaries.js');
const D=require('../src/decoder.js');
const s={fixNumbers:true,fixZwnj:true,spellEn:true,spellFa:true};
const cases=[
['sghl','سلام'],['sghl ]di','سلام چیه'],['ld o,hil','می‌خواهم'],[';jhf ih','کتاب‌ها'],['sghl 123?','سلام ۱۲۳؟'],['اثممخ','hello'],['sghl I am fine','سلام I am fine'],['hello, how are you?','hello, how are you?'],['سلام خوبی؟','سلام خوبی؟'],['می روم','می‌روم'],['کتاب ها','کتاب‌ها'],['wrold','wrold'],['helo','helo'],['من می روم','من می‌روم'],['امروز هوا خوب است','امروز هوا خوب است'],['لطفا کمک کن','لطفا کمک کن'],['I love Flutter and Dart','I love Flutter and Dart'],['سلامم','سلامم'],['sghl and','سلام and'],['and','and']
];
let failed=0;
for(const [input,expected] of cases){const got=D.analyze(input,s).correctedText; const ok=got===expected; console.log(ok?'PASS':'FAIL',JSON.stringify(input),'->',JSON.stringify(got),'expected',JSON.stringify(expected)); if(!ok)failed++;}
const amb=D.analyze('helo',s); if(!(amb.issues.length && amb.issues[0].alternatives.length>1)) {console.log('FAIL ambiguous candidates');failed++;} else console.log('PASS ambiguous candidates');
const w=D.analyze('wrold',s); if(!w.issues.some(i=>i.alternatives.indexOf('world')!==-1)){console.log('FAIL wrold suggestion');failed++;} else console.log('PASS wrold suggestion');
const nb=D.analyze('this and that',s); if(nb.issues.length){console.log('FAIL "and" among English flagged');failed++;} else console.log('PASS "and" among English');
if(failed) process.exit(1);
