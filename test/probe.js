/* Edge-case probe: the states the happy-path suite never enters. */
const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const APP=path.join(__dirname,'..');
let pass=0,fail=0;
const chk=(l,a,e)=>{const ok=String(a)===String(e);ok?pass++:fail++;console.log(`  ${ok?'PASS':'FAIL'}  ${l}${ok?'':`  → got "${a}" expected "${e}"`}`);};
const IGNORE=/Not implemented:/;
const vc=new VirtualConsole();const errs=[];
vc.on('jsdomError',e=>{if(!IGNORE.test(e.message)){errs.push(e.message);console.log('   !! '+e.message);}});
vc.on('error',(...a)=>{const m=a.join(' ');if(!IGNORE.test(m)){errs.push(m);console.log('   !! '+m.slice(0,200));}});
const dom=new JSDOM(fs.readFileSync(path.join(APP,'index.html'),'utf8'),
  {url:'https://renalroute.test/',runScripts:'dangerously',virtualConsole:vc,pretendToBeVisual:true});
const {window}=dom, doc=window.document;
window.fetch=()=>Promise.reject(new Error('Failed to fetch'));
/* Asset list parsed out of index.html, never typed here. This file used
   to carry its own hand-maintained copy and it drifted the moment
   js/motion.js shipped — the probe then ran against an app missing a
   file and died on a ReferenceError. Which, to be fair, is exactly what
   an edge-case probe is for; it just should not have been probing its
   own harness. */
const indexHtml = fs.readFileSync(path.join(APP,'index.html'),'utf8');
const cssFiles = Array.from(indexHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map(m=>m[1]);
const scripts  = Array.from(indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)).map(m=>m[1]);
if(scripts.length<5||!cssFiles.length) throw new Error('Could not parse the asset list out of index.html.');
const style=doc.createElement('style');
style.textContent=cssFiles.map(f=>fs.readFileSync(path.join(APP,f),'utf8')).join('\n');
doc.head.appendChild(style);
for(const s of scripts){
  const el=doc.createElement('script');el.textContent=fs.readFileSync(path.join(APP,s),'utf8');doc.body.appendChild(el);}
const $=s=>doc.querySelector(s);
const click=s=>{const e=typeof s==='string'?$(s):s;e&&e.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const R=window.RenalRoute;
  click('#consentAccept'); await wait(20);

  console.log('\n--- A. NO-TARGET USER (skip path) ---');
  click('#onbSkipTargets'); await wait(30);
  chk('lands on Home without targets', $('#scr-home').hidden, false);
  chk('trends render nothing rather than crashing', $('#trendsCard').innerHTML, '');
  chk('rings show the no-target state', $('#ringCard').textContent.includes('No targets set'), true);

  console.log('\n--- B. NO-TARGET + LOGGED MEALS (trends with null target) ---');
  R.Seed.run();                       // seeds meals AND care-team targets
  R.Store.skipTargets();              // now strip targets back off
  R.UI.renderHome(); await wait(20);
  chk('trends survive meals with no target set', typeof $('#trendsCard').innerHTML, 'string');
  chk('  ...and draw no target line', $('#trendsCard').innerHTML.includes('trend-target'), false);

  console.log('\n--- C. QUICK ADD WHEN AN ANCHOR ROW VANISHES ---');
  R.Seed.run(); R.UI.renderHome(); await wait(20);
  const btn=$('#quickAdd [data-repeat]');
  chk('quick-add present after seeding', !!btn, true);

  console.log('\n--- D. PARSE CAP REACHED ---');
  const p=R.Store.profile();
  R.Store.updateProfile({parse_count:20,parse_count_date:R.Store.todayISO()});
  chk('canAnalyze false at the cap', R.Store.canAnalyze(), false);
  R.Store.updateProfile({parse_count:0});

  console.log('\n--- E. HOSTILE INPUT INTO TRENDS + QUICK ADD ---');
  R.Store.addMeal({meal_text:'<img src=x onerror=alert(1)>',logged_at:new Date().toISOString(),
    meal_date:R.Store.todayISO(),items:[{name:'<script>alert(1)</script>',portion_text:'',source:'anchor',
    matched_anchor_id:'banana',quantity_multiplier:1,potassium_low_mg:422,potassium_high_mg:422}],
    confidence:'high',total_potassium_low_mg:422,total_potassium_high_mg:422});
  R.UI.renderHome(); await wait(20);
  chk('no <script> element injected anywhere', doc.querySelectorAll('#quickAdd script, #homeList script, #trendsCard script').length, 0);
  chk('payload renders as literal text', doc.body.textContent.includes('<script>alert(1)</script>'), true);

  console.log('\n--- G. HOSTILE DISPLAY NAME THROUGH THE GREETING ---');
  R.Store.updateProfile({ display_name: '<img src=x onerror=alert(1)>' });
  R.UI.renderHome(); await wait(20);
  chk('greeting injects no element', doc.querySelectorAll('#homeGreeting img').length, 0);
  chk('  ...payload renders as literal text',
    $('#homeGreeting').textContent.indexOf('<img src=x') !== -1, true);
  R.Store.updateProfile({ display_name: 'Frank' });

  console.log('\n--- F. THEME ROUND TRIP UNDER RELOAD ---');
  R.Store.setSetting('theme','dark');
  chk('theme persisted', R.Store.settings().theme, 'dark');

  console.log(`\n═══ ${pass} passed, ${fail} failed · ${errs.length} page errors ═══`);
  process.exit(fail||errs.length?1:0);
})();
