/** DOM-adapter execution checks; not browser layout or user testing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const json=n=>JSON.parse(readFileSync(new URL('review/'+n,root),'utf8'));
const html=readFileSync(new URL('index.html',root),'utf8');
const blueprint=json('dom_blueprint.json'),bundle=JSON.parse(html.split('window.NBAContractLabPreview=',2)[1].split(';\n',1)[0]);
const expected=json('expected_model_prices.json'),byid=new Map(expected.map(r=>[r.id,r]));
const script=html.match(/<script id="nba-contract-lab-app">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
function load(autoSelect=true,withoutSalaryReferences=false){
 const downloads=[],blobs=new Map(),elements=new Map();let document;
 class Element{
  constructor(tag,attrs={},text=''){
   this.tagName=tag.toUpperCase();this.attrs={...attrs};this.id=attrs.id??'';this._text=text;this._html='';this._value=String(attrs.value??'');
   this.checked=Object.hasOwn(attrs,'checked');this.hidden=Object.hasOwn(attrs,'hidden');this.disabled=Object.hasOwn(attrs,'disabled');this.listeners={};
   this.dataset=Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5),v]));
   const classes=new Set((attrs.class??'').split(/\s+/).filter(Boolean));
   this.classList={contains:c=>classes.has(c),toggle:(c,on)=>{const add=on??!classes.has(c);if(add)classes.add(c);else classes.delete(c);return add;}};
  }
  set value(v){this._value=String(v)}get value(){return this._value}
  set textContent(v){this._text=String(v);this._html=''}get textContent(){return this._text}
  set innerHTML(v){this._html=String(v);this._text=this._html.replace(/<[^>]*>/g,'');if(this.tagName==='SELECT'){const first=this._html.match(/<option[^>]*value="([^"]*)"/);this.value=first?.[1]??'';}}
  get innerHTML(){return this._html}
  setAttribute(k,v){this.attrs[k]=String(v)}removeAttribute(k){delete this.attrs[k]}getAttribute(k){return this.attrs[k]??null}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  fire(type,extra={}){const e={target:this,key:null,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};for(const fn of this.listeners[type]??[])fn(e);return e;}
  focus(){document.activeElement=this}
  click(){if(this.tagName==='A')downloads.push({filename:this.download,url:this.href,blob:blobs.get(this.href)});this.fire('click')}
 }
 for(const item of blueprint)elements.set(item.id,new Element(item.tag,item.attrs,item.text));
 document={activeElement:null,getElementById:id=>elements.get(id)??null,
  querySelectorAll:selector=>selector==='#nav-tabs button'?[elements.get('tab-btn-1'),elements.get('tab-btn-2')]:selector==='.tab-pane'?[elements.get('tab-projections'),elements.get('tab-metrics')]:[],
  createElement:tag=>new Element(tag)};
 class MockURL extends URL{static createObjectURL(blob){const key='blob:integration-test/'+blobs.size;blobs.set(key,blob);return key}static revokeObjectURL(){}}
 const context={window:{},document,console,Blob,URL:MockURL,setTimeout,clearTimeout};
 vm.runInNewContext(script,context,{filename:'delivered-prototype.js',timeout:15000});
 const api=context.window.NBAContractLab;
 assert.ok(api,elements.get('load-error')?.textContent);
 if(withoutSalaryReferences)delete context.window.NBAContractLabUI.currentSalaryReferences;
 if(autoSelect)api.selectCase('roster-anthonyblack');
 return {document,elements,api,downloads,el:id=>elements.get(id),input:(id,value)=>{const e=elements.get(id);e.value=value;e.fire('input')},select:(id,value)=>{const e=elements.get(id);e.value=value;e.fire('change')}};
}

test('The only product view is projected 2027-28 value, with an optional salary reference',()=>{
 const x=load(false);assert.equal(x.el('cap-input').value,'176');assert.equal(x.el('hero-value-label').textContent,'Projected First-Year Market Value');assert.equal(x.el('hero-share-label').textContent,'% of Cap');assert.equal(x.el('projection-layout').hidden,true);
 assert.equal(x.el('valuation-mode'),undefined);assert.equal(x.el('current-contract-note'),undefined);assert.equal(x.el('load-error').hidden,true);
 const context=JSON.parse(html.split('window.NBAContractLabUI=',2)[1].split(';\n',1)[0]);assert.equal(context.currentContracts,undefined);assert.equal(context.currentContractDisplaysRequired,false);
});
test('A supported under-contract player can build a hypothetical schedule',()=>{
 const x=load();x.api.selectCase('roster-jimmybutler');const s=x.api.getState();assert.equal(s.activeCase.firstSeason,'2027-28');assert.equal(x.el('projection-layout').hidden,false);assert.ok(s.schedule.totalValue>0);assert.equal(x.el('hero-total-label').textContent,'Total Contract Value');assert.equal(x.el('hero-aav-label').textContent,'Average Annual Value (AAV)');
});
test('Contract term and raises change totals without changing first-year market value',()=>{
 const x=load(),base=x.api.getState().prediction.baselineSalary;
 x.input('years','3');assert.equal(x.api.getState().schedule.years,3);assert.equal(x.api.getState().prediction.baselineSalary,base);
 x.input('salary-change','8');assert.equal(x.api.getState().prediction.baselineSalary,base);assert.equal(x.api.getState().schedule.annual.length,3);
});
test('The entered cap scales value while cap growth affects later schedule percentages',()=>{
 const x=load(),share=x.api.getState().prediction.predictedCapShare;x.input('cap-input','180');
 assert.equal(x.api.getState().prediction.baselineSalary,Math.floor(share*180e6+.5));
 const bases=x.api.getState().schedule.annual.map(r=>r.base),oldCap=x.api.getState().schedule.annual[1].cap;
 x.input('slider-cap','10');assert.deepEqual(x.api.getState().schedule.annual.map(r=>r.base),bases);assert.notEqual(x.api.getState().schedule.annual[1].cap,oldCap);
});
test('Missing prior salary remains explicitly imputed, without requiring a current deal',()=>{
 const x=load(false),row=bundle.rosterSnapshot.rows.find(r=>r.readiness==='prepared'&&!bundle.profiles[r.playerKey].priorSalaryObserved);assert.ok(row);
 x.api.selectCase(row.id);assert.ok(x.api.getState().prediction.baselineSalary>0);assert.ok(x.api.getState().prediction.imputedFeatures.includes('market:prior_base_cap_share'));assert.match(x.el('forecast-caution').textContent,/Prior salary is unknown/);
});
test('All437 profiles initialize; all343 supported values match retained 2027-28 prices',()=>{
 const x=load(false);let quoted=0,referenced=0;const refs=JSON.parse(html.split('window.NBAContractLabUI=',2)[1].split(';\n',1)[0]).currentSalaryReferences;
 for(const row of bundle.rosterSnapshot.rows){
  x.api.selectCase(row.id);assert.equal(x.el('input-error').hidden,true,row.player+': '+x.el('input-error').textContent);
  const ref=refs[row.playerKey];assert.equal(x.el('current-salary').textContent,ref?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(ref.baseSalary):'—',row.player+' reference');if(ref)referenced++;
  assert.equal(x.el('hero-value-label').textContent,'Projected First-Year Market Value');assert.equal(x.el('hero-share-label').textContent,'% of Cap');
  if(row.readiness==='prepared'){quoted++;assert.equal(x.api.getState().prediction.baselineSalary,byid.get(row.id).futureCapSalary,row.player);assert.ok(x.api.getState().schedule.totalValue>0);}
  else {assert.equal(x.el('hero-yr1').textContent,'—');assert.equal(x.el('export-scenario').disabled,true);}
 }
 assert.equal(quoted,343);assert.equal(referenced,280);
});
test('Elite coverage holds do not substitute signed extensions for model values',()=>{
 const x=load(false);for(const pid of ['shaigilgeousalexander','nikolajokic']){
  x.api.selectCase('roster-'+pid);assert.equal(x.el('hero-yr1').textContent,'—');assert.equal(x.api.getState().schedule,null);assert.equal(x.el('export-scenario').disabled,true);
 }
 x.api.selectCase('roster-shaigilgeousalexander');assert.equal(x.el('contract-reference-value').textContent,'$61,600,000');x.input('cap-input','180');assert.equal(x.el('contract-reference-value').textContent,'$63,000,000');assert.equal(x.el('hero-yr1').textContent,'—');
});
test('Niang keeps older statistics without inventing a new market estimate',()=>{
 const x=load(false);x.api.selectCase('roster-georgesniang');assert.equal(x.el('hero-yr1').textContent,'—');assert.match(x.el('selection-status-title').textContent,/2025–26 performance/);
 x.api.openTab('tab-metrics');assert.equal(x.el('tab-metrics').hidden,false);assert.match(x.el('regular-history').innerHTML,/2024-25/);
});
test('Each observed statistical group supplies twelve cards; model inputs remain inspectable',()=>{
 const x=load();x.api.selectCase('roster-lukadoncic');x.api.openTab('tab-metrics');
 for(const id of ['regular-cards','advanced-cards','playoff-cards'])assert.equal((x.el(id).innerHTML.match(/class="lab-stat-card"/g)||[]).length,12,id);
 assert.equal((x.el('feature-inputs').innerHTML.match(/<tr>/g)||[]).length,26);
 assert.equal((x.el('regular-history').innerHTML.match(/<td /g)||[]).length,44);
 assert.ok(!html.includes('id="regular-history-column-11"'));
});
test('All30 team filters and keyboard tab handlers still work',()=>{
 const x=load(false);for(const team of new Set(bundle.rosterSnapshot.rows.map(r=>r.team))){x.select('team-filter',team);const ids=[...x.el('player-search-select').innerHTML.matchAll(/<option value="(roster-[^"]+)"/g)].map(m=>m[1]);assert.deepEqual(ids.sort(),bundle.rosterSnapshot.rows.filter(r=>r.team===team).map(r=>r.id).sort());}
 x.el('tab-btn-1').fire('keydown',{key:'ArrowRight'});assert.equal(x.document.activeElement.id,'tab-btn-2');assert.equal(x.el('tab-btn-2').getAttribute('aria-selected'),'true');
});
test('Scenario export states the hypothetical scope, fixed snapshot and interface version',async()=>{
 const x=load();x.el('export-scenario').click();const d=JSON.parse(await x.downloads[0].blob.text());assert.equal(d.interfaceRevision,'P4.31');assert.equal(d.model.revision,'P4.25');assert.equal(d.target.firstSeason,'2027-28');assert.match(d.valueView.label,/Projected First-Year Market Value/);assert.equal(d.valueView.ageHeldAtSnapshot,true);assert.match(d.valuationScope,/no actual next-contract/);
});
test('Invalid contract controls clear totals and block an export',()=>{
 const x=load();x.input('years','0');assert.equal(x.el('input-error').hidden,false);assert.equal(x.el('hero-yr1').textContent,'—');assert.equal(x.el('export-scenario').disabled,true);x.input('years','4');assert.equal(x.el('input-error').hidden,true);assert.ok(x.api.getState().schedule.totalValue>0);
});


test('The optional salary card shows 2026-27 base, excluding AAV and cap-hit substitutes',()=>{
 const x=load(false);x.api.selectCase('roster-mikalbridges');assert.equal(x.el('current-salary').textContent,'$33,482,145');assert.match(x.el('current-salary').getAttribute('href'),/mikal-bridges/);
 const before=x.api.getState().prediction.baselineSalary;x.input('cap-input','180');assert.notEqual(x.api.getState().prediction.baselineSalary,before);assert.equal(x.el('current-salary').textContent,'$33,482,145');
 x.api.selectCase('roster-georgesniang');assert.equal(x.el('hero-yr1').textContent,'—');assert.equal(x.el('current-salary').textContent,'$3,876,528');
});
test('Missing optional salary references never prevent a supported hypothetical contract',()=>{
 const x=load(false,true);x.api.selectCase('roster-mikalbridges');assert.equal(x.el('current-salary').textContent,'—');assert.equal(x.el('current-salary').getAttribute('href'),null);assert.equal(x.api.getState().prediction.baselineSalary,byid.get('roster-mikalbridges').futureCapSalary);assert.ok(x.api.getState().schedule.totalValue>0);assert.equal(x.el('export-scenario').disabled,false);
});
