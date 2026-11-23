const data=window.NBAContractLabData,report=window.NBAContractLabReport,bundle=window.NBAContractLabPreview;
const $=id=>document.getElementById(id);
const dollars=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'—';
const millions=(n,d=2)=>Number.isFinite(n)?`$${(n/1e6).toFixed(d)}M`:'—';
const percent=(n,d=1)=>Number.isFinite(n)?`${(n*100).toFixed(d)}%`:'—';
const decimal=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const signed=n=>Number.isFinite(n)?`${n>0?'+':''}${n.toFixed(1)}`:'—';
const displayDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s??'')?`${s.slice(5,7)}-${s.slice(8,10)}-${s.slice(0,4)}`:s;
const titleCase=s=>String(s??'').replace(/\b[a-z]/g,c=>c.toUpperCase());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=id=>$(id).value.trim()===''?NaN:Number($(id).value);
const normalizeTeam=t=>({PHO:'PHX',BRK:'BKN',CHO:'CHA'}[t]??t);
const teams={ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHA:'Charlotte Hornets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GSW:'Golden State Warriors',HOU:'Houston Rockets',IND:'Indiana Pacers',LAC:'LA Clippers',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',MIN:'Minnesota Timberwolves',NOP:'New Orleans Pelicans',NYK:'New York Knicks',OKC:'Oklahoma City Thunder',ORL:'Orlando Magic',PHX:'Phoenix Suns',PHI:'Philadelphia 76ers',POR:'Portland Trail Blazers',SAC:'Sacramento Kings',SAS:'San Antonio Spurs',TOR:'Toronto Raptors',UTA:'Utah Jazz',WAS:'Washington Wizards'};
const groupLabels={scoring:'Scoring & usage',efficiency:'Shooting efficiency',shootingProfile:'Shot selection & volume',playmaking:'Playmaking & turnovers',defenseAndRebounding:'Defense & rebounding',impact:'Overall impact',roleAndAvailability:'Role & availability',development:'Development trends',age:'Age at valuation'};
const ui=window.NBAContractLabUI;
const valuationMode='samePlayer2027';
let activeCase=null,activeRoster=null,prediction=null,schedule=null,activeTab='tab-projections',currentDiagnostics=[],newContractDiagnostics=[];

function ageAtValuation(c){
 if(c.dob)return (Date.parse(c.valuationDate??c.asOfDate)-Date.parse(c.dob))/86400000/365.2425;
 return Number.isFinite(c.sourceAge)?c.sourceAge+Number(c.firstSeason.slice(0,4))-2026:null;
}
function controls(){return {recencyDecay:0.65,playoffWeight:0,k:5};}
function predictCase(c,cap){return predictPreview(bundle,c.playerId,cap);}
function financialSourceMessage(p){
 if(p.maximumScopePriorReview?.priorSalaryObserved)return '';
 if(p.maximumScopePriorReview?.reasons?.length){const descriptions={guarantee_exceeds_base:'the displayed guarantee exceeds BASE',not_one_effective_prior_period:'multiple salary periods require review',cap_base_allocation_unresolved:'cap hit and salary allocation require reconciliation'};return 'Source context remains unresolved: '+p.maximumScopePriorReview.reasons.map(x=>descriptions[x]??'the financial period needs review').join('; ')+'. ';}
 if(p.priorSalaryReview?.status!=='quarantined_keep_unknown')return '';
 const messages={unexplained_guarantee_above_base:'the displayed guarantee exceeds BASE',unreconciled_cap_base_incentive_difference:'cap hit, BASE and likely incentives need reconciliation',unreconciled_trade_payment_allocation:'the listed trade payment and cap-hit allocation need reconciliation'};
 return 'Financial source review: '+(messages[p.priorSalaryReview.reasons[0]]??'the financial figures need reconciliation')+'; prior salary remains unknown pending explanation. ';
}
function coverageNote(){
 const p=bundle.profiles[activeCase.playerId],r=prediction?.status==='experimental'?prediction:p.rawResearchPrediction;
 const prior=p.priorSalaryObserved?'Reviewed 2025–26 prior scheduled base is available.':'Prior salary is unknown; a flagged training-median share fills that input.';
 return prior+' '+financialSourceMessage(p)+(r?.outsideTrainingRange.length?'Training-range warnings: '+r.outsideTrainingRange.join(', ')+'. ':'');
}
function activeValueView(){return {...bundle.marketValueViews.samePlayer2027,label:'2027–28 Projected First-Year Market Value'};}

function updateValueContext(){
 const cap=numeric('cap-input')*1e6;
 $('valuation-context').textContent='Projected First-Year Market Value is a hypothetical 2027–28 annual value under the entered cap; the default $176M cap is an assumption. Performance ends with 2025–26, and pricing age/information stay fixed at the supplied November 8, 2026 snapshot. No future development, actual next-contract timing, free agency or extension eligibility is forecast. Full CBA legality and a prorated current-season offer are not established.';
 $('cap-growth-explanation').textContent='Total Contract Value and AAV describe the editable hypothetical schedule, regardless of the player’s current deal. Salary change sets proposed raises; later cap growth changes schedule cap percentages. Current 2026–27 Salary is a separate recorded scheduled-base reference, excluding incentives. It is optional, does not change this projection, and is distinct from the reviewed 2025–26 prior-salary input used by the historical model.';
 renderViewChrome();
}


function selectableCases(){
 return rosterRowsForTeam(data.rosterSnapshot,$('team-filter').value);
}
function updateRosterReview(){
 const team=$('team-filter').value;
 const message=data.rosterSnapshot.reviewTeams[team]??activeRoster?.rosterStatusReview??'';
 $('roster-review').textContent=message;$('roster-review').hidden=!message;
}
function clearSelection(){
 activeCase=null;activeRoster=null;prediction=null;schedule=null;currentDiagnostics=[];newContractDiagnostics=[];
 $('player-profile').hidden=false;$('player-name').textContent='Select A Player';
 for(const id of ['player-pos','player-team','player-age','player-status-badge'])$(id).textContent='';
 for(const id of ['player-pos-dot','player-team-dot','player-age-dot'])$(id).hidden=true;
 for(const id of ['hero-yr1','hero-total','hero-aav','hero-cappct','ledger-years','ledger-total-base','ledger-avg-pct','ledger-aav-foot'])$(id).textContent='—';
 for(const id of ['ledger-body','regular-cards','advanced-cards','playoff-cards','regular-history','playoff-history','feature-inputs','replay-rows','new-contract-rows','source-rows','salary-tier-rows'])$(id).innerHTML='';
 for(const id of ['method-detail','feature-note','diagnostic-summary','check-summary','source-summary'])$(id).textContent='';
 $('contract-reference').hidden=true;$('contract-reference-value').textContent='';$('contract-reference-note').textContent='';$('contract-reference-source').removeAttribute('href');
 for(const id of ['years','salary-change','slider-cap','option'])$(id).disabled=false;
 $('forecast-caution').textContent='';$('prior-source-link').hidden=true;$('prior-source-link').removeAttribute('href');
 $('selection-status').hidden=false;$('selection-status-title').textContent='Choose a roster player';
 $('selection-status-body').textContent='Select a team or player to explore market value and contract scenarios.';
 $('announcement').textContent='';updateRosterReview();
 const view=activeValueView();$('cap-input').value=view.defaultCap/1e6;$('top-cap-label').textContent=view.season+' CAP';$('top-cap').textContent=millions(view.defaultCap,3);updateValueContext();
 $('input-error').hidden=true;$('export-scenario').disabled=true;
 openTab(activeTab);
}
function populatePlayers(preferred){
 const cases=selectableCases();
 const teamGroups=Object.entries(teams).sort((a,b)=>a[1].localeCompare(b[1]));
 $('player-search-select').innerHTML='<option value="">Select Player</option>'+teamGroups.map(([team,name])=>{
  const group=cases.filter(c=>c.team===team).sort((a,b)=>a.player.localeCompare(b.player));
  return group.length?`<optgroup label="${esc(name)}">${group.map(c=>`<option value="${esc(c.id)}">${esc(c.player)} (${c.team})</option>`).join('')}</optgroup>`:'';
 }).join('');
 $('team-empty').hidden=cases.length>0;$('player-search-select').disabled=!cases.length;
 if(preferred&&cases.some(c=>c.id===preferred)){$('player-search-select').value=preferred;selectCase(preferred);}
 else{$('player-search-select').value='';clearSelection();}
}
function selectCase(id,reset=false){
 if(!id){clearSelection();return;}
 const entry=data.rosterSnapshot.rows.find(r=>r.id===id);
 if(!entry)throw new Error('Select a player in the supplied roster.');
 clearSelection();activeRoster=entry;
 if($('team-filter').value!=='all'&&$('team-filter').value!==entry.team){$('team-filter').value=entry.team;populatePlayers(id);return;}
 $('player-search-select').value=id;updateRosterReview();
 const selected=data.cases.find(c=>c.id===entry.caseId&&c.mode!=='historical'),profile=bundle.profiles[entry.playerKey];
 activeCase={...(selected??{id:entry.id,player:entry.player,playerId:entry.playerKey,family:entry.family,currentTeam:entry.team,
  dob:profile?.dobSource?.value,asOfDate:'2026-11-08',valuationDate:'2026-11-08',defaultYears:4,defaultRaise:5,defaultOption:'none',mode:'context_only'}),
  firstSeason:activeValueView().season,defaultCap:activeValueView().defaultCap};
 $('team-empty').hidden=true;$('player-profile').hidden=false;$('player-search-select').disabled=false;
 $('cap-input').value=activeCase.defaultCap/1e6;$('years').value=activeCase.defaultYears;
 $('salary-change').value=activeCase.defaultRaise;$('slider-cap').value=5;
 $('history-decay').value=65;$('playoff-weight').value=20;$('use-playoffs').checked=false;$('option').value=activeCase.defaultOption;
 openTab(activeTab);renderAll();
}

function openTab(id){
 if(!['tab-projections','tab-metrics'].includes(id))return;
 activeTab=id;
 $('summary-workspace').classList.toggle('metrics-view',id==='tab-metrics');
 for(const pane of document.querySelectorAll('.tab-pane')){pane.classList.toggle('hidden',pane.id!==id||!activeCase);pane.hidden=pane.id!==id||!activeCase;}
 for(const button of document.querySelectorAll('#nav-tabs button')){
  const selected=button.dataset.tab===id;
  button.classList.toggle('bg-primary-container',selected);button.classList.toggle('text-on-primary-container',selected);
  button.classList.toggle('text-on-surface-variant',!selected);button.setAttribute('aria-selected',String(selected));
  button.setAttribute('tabindex',selected?'0':'-1');
  if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 if(id==='tab-metrics'&&activeCase)renderEvaluation();
}
function renderProfile(){
 $('player-name').textContent=activeRoster.player;
 $('player-pos').textContent=activeRoster.position??activeCase.family??'';
 $('player-pos-dot').hidden=!$('player-pos').textContent;
 const team=teams[activeRoster.team]??activeRoster.teamName??'';
 $('player-team').textContent=team;$('player-team').hidden=!team;$('player-team-dot').hidden=!team;
 const age=ageAtValuation(activeCase);$('player-age').textContent=Number.isFinite(age)?`Age ${decimal(age)}`:'';
 $('player-age-dot').hidden=!Number.isFinite(age);
 $('player-status-badge').textContent=activeRoster.readiness==='prepared'?'Experimental estimate':'Estimate unavailable';
}

function renderContractReference(cap){
 const r=bundle.profiles[activeCase.playerId]?.signedContractReference;
 $('contract-reference').hidden=!r;if(!r)return;
 $('contract-reference-title').textContent='Signed Extension Reference · Not A Model Prediction';
 const referenceCap=valuationMode==='samePlayer2027'?cap:r.capAssumption;
 $('contract-reference-value').textContent=dollars(Math.floor(referenceCap*r.contractShare+.5));
 $('contract-reference-note').textContent=`${r.firstSeason} signed extension reference: ${(100*r.contractShare).toFixed(0)}% of ${dollars(referenceCap)}, an assumed 2027–28 cap. ${valuationMode==='current'?'This separate future-year reference does not use the edited current-season cap. ':''}The final 2027–28 cap is unknown. The provider displays ${dollars(r.sourceFirstYearBase)} under a different projection. This reference is not a modeled market value or an accuracy result.`;
 $('contract-reference-source').setAttribute('href',r.sourceURL);
}

function renderAll(){
 updateValueContext();if(!activeCase)return;
 try{
  const cap=numeric('cap-input')*1e6;
  if(!(cap>=100e6&&cap<=300e6))throw new Error('Enter a salary cap from $100M to $300M.');
  renderContractReference(cap);prediction=predictCase(activeCase,cap,controls());
  $('input-error').hidden=true;$('input-error').textContent='';
  $('top-cap').textContent=millions(cap,3);
  const supported=prediction.status==='experimental';
  for(const id of ['years','salary-change','slider-cap','option'])$(id).disabled=!supported;
  if(supported){
   $('hero-yr1').textContent=dollars(prediction.baselineSalary);
   $('hero-cappct').textContent=percent(prediction.baselineSalary/cap);
   $('selection-status').hidden=true;
    const years=numeric('years'),raise=numeric('salary-change'),growth=numeric('slider-cap');
    if(!(raise>=-8&&raise<=8&&growth>=0&&growth<=10))throw new Error('Review the salary change and cap-growth assumptions.');
    schedule=contractBreakdown(prediction.baselineSalary,years,raise/100);
    schedule.annual=schedule.salaries.map((base,i)=>({season:nextSeason(activeCase.firstSeason,i),base,cap:Math.round(cap*(1+growth/100)**i),option:i===years-1?$('option').value:'none'}));
    $('hero-total').textContent=dollars(schedule.totalValue);$('hero-aav').textContent=dollars(schedule.aav);
    $('export-scenario').disabled=false;renderSchedule();
  }else{
   schedule=null;currentDiagnostics=[];newContractDiagnostics=[];
   for(const id of ['hero-yr1','hero-total','hero-aav','hero-cappct','ledger-years','ledger-total-base','ledger-avg-pct','ledger-aav-foot'])$(id).textContent='—';
   $('ledger-body').innerHTML='';$('export-scenario').disabled=true;
   const message=availabilityMessage(activeRoster);
   $('selection-status').hidden=false;$('selection-status-title').textContent=message.title;$('selection-status-body').textContent=message.body;
  }
  const profile=bundle.profiles[activeCase.playerId];
  $('forecast-caution').textContent=profile?.readiness==='prepared'||profile?.readiness==='model_coverage_unavailable'?coverageNote():availabilityMessage(activeRoster).body;
  const prior=profile?.maximumScopePriorReview??profile?.priorSalaryReview??profile?.priorSalarySource;
  $('prior-source-link').hidden=!prior?.sourceURL;if(prior?.sourceURL)$('prior-source-link').setAttribute('href',prior.sourceURL);
  renderProfile();renderMetrics();
  if(activeTab==='tab-metrics')renderEvaluation();
 }catch(error){
  prediction=null;schedule=null;$('contract-reference').hidden=true;$('input-error').hidden=false;$('input-error').textContent=error.message;$('export-scenario').disabled=true;
  for(const id of ['hero-yr1','hero-total','hero-aav','hero-cappct'])$(id).textContent='—';
  $('ledger-body').innerHTML='';
 }
 $('cap-rate-val').textContent=`+${decimal(numeric('slider-cap'))}% / Year`;
 $('salary-change-value').textContent=`${signed(numeric('salary-change'))}% / Year`;
 renderViewChrome();
}

function nextSeason(season,offset){const y=Number(season.slice(0,4))+offset;return `${y}-${String((y+1)%100).padStart(2,'0')}`;}
function ledgerAge(season){
 if(activeCase.dob){const d=new Date(activeCase.dob+'T00:00:00Z'),y=Number(season.slice(0,4));return y-d.getUTCFullYear()-Number(d.getUTCMonth()>9||(d.getUTCMonth()===9&&d.getUTCDate()>1));}
 return '—';
}
function renderSchedule(){
 $('ledger-body').innerHTML=schedule.annual.map(r=>`<tr><td>${r.season}</td><td>${ledgerAge(r.season)}</td><td>${dollars(r.base)}</td><td>${percent(r.base/r.cap,2)}</td><td><span class="lab-chip ${r.option==='none'?'':'blue'}">${r.option==='none'?'Scheduled':r.option==='player'?'Player Option':'Team Option'}</span></td></tr>`).join('');
 $('ledger-years').textContent=`${schedule.years} ${schedule.years===1?'Year':'Years'}`;
 $('ledger-total-base').textContent=dollars(schedule.totalValue);
 $('ledger-avg-pct').textContent=`Avg: ${percent(schedule.annual.reduce((a,r)=>a+r.base/r.cap,0)/schedule.years,2)}`;
 $('ledger-aav-foot').textContent=`${dollars(schedule.aav)} AAV`;
}
function statCard(label,value,key,raw,phase='regular'){
 const tone=metricTone(data.metricColorReferences,activeCase.family,phase,key,raw);
 return `<div class="lab-stat-card"><span>${esc(titleCase(label))}</span><strong class="${tone.color}" title="${esc(tone.meaning)}" aria-label="${esc(label+': '+value+'. '+tone.meaning)}">${esc(value)}</strong></div>`;
}
function rowsFor(phase){return data.seasonRecords.filter(r=>r.player_id===playerId(activeCase.player)&&r.phase===phase&&r.available_from<=activeCase.asOfDate);}
function historyRows(phase,profile){
 const records=rowsFor(phase),labels=['Season','Team','G','MPG','PTS','REB','AST','FG%','3P%','TS%','BPM'];
 return [2023,2024,2025,2026].map(y=>{
  const row=records.find(r=>r.season_end_year===y),season=`${y-1}-${String(y).slice(-2)}`;
  const t=row?.traditional??{},a=row?.advanced??{};
  const values=!row?[season,...Array(10).fill('—')]:[season,esc(normalizeTeam(row.team_at_season)),t.G??a.G??'—',decimal(t.MP??(a.G?a.MP/a.G:null)),decimal(t.PTS),decimal(t.TRB),decimal(t.AST),percent(t['FG%']),percent(t['3P%']),percent(a['TS%']),signed(a.BPM)];
  return '<tr>'+values.map((v,i)=>`<td data-label="${labels[i]}">${v}</td>`).join('')+'</tr>';
 }).join('');
}

function renderMetrics(){
 let p;
 try{p=prediction?.profile??buildProfile(data.seasonRecords,activeCase.player,activeCase.asOfDate,controls());}catch{
 for(const id of ['regular-cards','advanced-cards','playoff-cards'])$(id).innerHTML='<p class="lab-copy">No completed-season sample is available.</p>';
 $('regular-history').innerHTML=historyRows('regular');$('playoff-history').innerHTML=historyRows('playoffs');renderMethodDetails();return;
 }
 const r=p.regular.values,po=p.playoffs.values;
 const regularStats=[['Points / game',decimal(r.PTS_pg)],['Rebounds / game',decimal(r.TRB_pg)],['Assists / game',decimal(r.AST_pg)],['Steals / game',decimal(r.STL_pg)],['Blocks / game',decimal(r.BLK_pg)],['Turnovers / game',decimal(r.TOV_pg)],['Minutes / game',decimal(r.MPG)],['Field goal %',percent(r['FG%'])],['Three point %',percent(r['3P%'])],['Free throw %',percent(r['FT%'])],['True shooting %',percent(r['TS%'])],['Effective FG %',percent(r['eFG%'])]];
 const regularKeys=['PTS_pg','TRB_pg','AST_pg','STL_pg','BLK_pg','TOV_pg','MPG','FG%','3P%','FT%','TS%','eFG%'];
 $('regular-cards').innerHTML=regularStats.map(([label,value],i)=>statCard(label,value,regularKeys[i],r[regularKeys[i]])).join('');
 const advancedStats=[['Box plus/minus',signed(r.BPM)],['Player efficiency',decimal(r.PER)],['Usage rate',`${decimal(r['USG%'])}%`],['Offensive BPM',signed(r.OBPM)],['Defensive BPM',signed(r.DBPM)],['Win shares / 48',decimal(r['WS/48'],3)],['Offensive WS / 48',decimal(r.OWS48,3)],['Defensive WS / 48',decimal(r.DWS48,3)],['Steal rate',`${decimal(r['STL%'])}%`],['Block rate',`${decimal(r['BLK%'])}%`],['Def. rebound rate',`${decimal(r['DRB%'])}%`],['Assist rate',`${decimal(r['AST%'])}%`]];
 const advancedKeys=['BPM','PER','USG%','OBPM','DBPM','WS/48','OWS48','DWS48','STL%','BLK%','DRB%','AST%'];
 $('advanced-cards').innerHTML=advancedStats.map(([label,value],i)=>statCard(label,value,advancedKeys[i],r[advancedKeys[i]])).join('');
 const playoffStats=[['Points / game',decimal(po.PTS_pg)],['Rebounds / game',decimal(po.TRB_pg)],['Assists / game',decimal(po.AST_pg)],['Steals / game',decimal(po.STL_pg)],['Blocks / game',decimal(po.BLK_pg)],['Turnovers / game',decimal(po.TOV_pg)],['Minutes / game',decimal(po.MPG)],['True shooting %',percent(po['TS%'])],['Three point %',percent(po['3P%'])],['Box plus/minus',signed(po.BPM)],['Defensive BPM',signed(po.DBPM)],['Defensive WS / 48',decimal(po.DWS48,3)]];
 const playoffKeys=['PTS_pg','TRB_pg','AST_pg','STL_pg','BLK_pg','TOV_pg','MPG','TS%','3P%','BPM','DBPM','DWS48'];
 $('playoff-cards').innerHTML=p.playoffs.observedSeasons.length?playoffStats.map(([label,value],i)=>statCard(label,value,playoffKeys[i],po[playoffKeys[i]],'playoffs')).join(''):'<p class="lab-copy">No observed playoff sample in the supplied exports.</p>';
 $('regular-history').innerHTML=historyRows('regular',p.regular);$('playoff-history').innerHTML=historyRows('playoffs',p.playoffs);

 renderMethodDetails();
}
function renderEvaluation(){
 const c=report.scores.p419_control,m=report.scores.p425_current;
 currentDiagnostics=[];newContractDiagnostics=[];
 $('diagnostic-summary').textContent=`Broader P4.26 retrospective audit: ${m.n} distinct players, ${millions(c.maeDollars,3)} versus ${millions(m.maeDollars,3)} mean absolute error for the older and retained P4.25 models. Current-model cap-share MAE is ${m.maeCapPP.toFixed(3)} percentage points. ${report.conditionalDollarReplays} dollar replays use first-year caps realized after signature. Lower salary tiers worsened; the larger high-salary group still has substantial underpricing. This expanded exposed audit is not a blind final test or a current-roster accuracy score. The production model was not tuned or replaced in this step.`;
 $('salary-tier-rows').innerHTML=Object.entries(report.bySalaryTier).map(([tier,v])=>{const a=v.p419_control,b=v.p425_current;return `<tr><td>${esc(({under5pct:'Under 5%', '5to15pct':'5% to under 15%', '15to25pct':'15% to under 25%', '25pctAndAbove':'25% and above'})[tier])}</td><td>${b.n}</td><td>${millions(a.maeDollars,3)}</td><td>${millions(b.maeDollars,3)}</td><td>${b.maeCapPP.toFixed(3)} pp</td></tr>`;}).join('');
 $('check-summary').textContent='The evidence pack contains the actual software checks and browser-attempt status. The hypothetical 2027–28 scenario retains the same model, performance and snapshot age. Signed contract references never enter prediction scores. Phone and participant tests remain pending.';
 $('replay-rows').innerHTML='';$('new-contract-rows').innerHTML='';
 const fit=bundle.fits[bundle.profiles[activeCase.playerId]?.prediction?.fitId],ids=new Set(fit?.trainingIds??[]);
 $('source-rows').innerHTML=data.contracts.filter(c=>ids.has(c.contract_id)).map(c=>`<tr><td>${esc(c.player)}</td><td>${displayDate(c.signedDate)}</td><td>${esc(c.first_salary_season)}</td><td>Pre-signing history</td><td>${dollars(c.first_added_year_base_salary)}</td><td><a href="${esc(c.source_url)}" target="_blank" rel="noopener">Reviewed contract source ↗</a></td></tr>`).join('');
 $('source-summary').textContent=`${fit?.trainingIds.length??0} distinct other-player agreements from the unchanged 144-event training pool, including 21 reviewed maximum agreements. This player’s own agreements are excluded. Information and age snapshot: November 8, 2026. Completed performance through 2025–26. ${activeValueView().label}; entered cap ${dollars(numeric('cap-input')*1e6)}. Current roster membership and free-agent status are not independently verified.`;
}
function downloadJSON(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('announcement').textContent=`${filename} exported.`;}
function downloadScenario(){
 if(!schedule||prediction?.status!=='experimental')return;
 downloadJSON({project:'NBA Contract Lab',version:data.version,interfaceRevision:ui.interfaceRevision,exportedAt:new Date().toISOString(),
  target:{id:activeCase.id,player:activeCase.player,mode:activeCase.mode,firstSeason:activeCase.firstSeason},
  roster:{asOfDate:data.rosterSnapshot.asOfDate,team:activeRoster.team,source:activeRoster.source,membershipIndependentlyVerified:false},
  model:data.model,modelSettings:{fixedRecency:0.65,playoffInfluence:0},inputProfile:bundle.profiles[activeCase.playerId],snapshotPolicy:bundle.policy,valuationScope:'Hypothetical full-season-equivalent market value; no actual next-contract, free-agent-date, future-performance or prorated-offer forecast',valueView:{mode:valuationMode,...activeValueView(),enteredCap:numeric('cap-input')*1e6,ageHeldAtSnapshot:true,performanceHeldAtSnapshot:true},baseline:prediction,contract:schedule,currentSalaryReference:ui.currentSalaryReferences?.[activeCase.playerId]??null,currentSalaryReferenceUsedForPrediction:false,limitations:data.limitations},`NBA_Contract_Lab_${activeCase.id}_P4_30.json`);
}
function init(){
 try{
  $('team-filter').innerHTML='<option value="all">Select Teams</option>'+Object.entries(teams).sort((a,b)=>a[1].localeCompare(b[1])).map(([t,name])=>`<option value="${t}">${name}</option>`).join('');
  for(const button of document.querySelectorAll('#nav-tabs button')){
   button.addEventListener('click',()=>openTab(button.dataset.tab));
   button.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const id=e.key==='Home'?'tab-projections':e.key==='End'?'tab-metrics':activeTab==='tab-projections'?'tab-metrics':'tab-projections';openTab(id);$(id==='tab-projections'?'tab-btn-1':'tab-btn-2').focus();}});
  }
  $('team-filter').addEventListener('change',()=>populatePlayers(activeRoster?.id));
  $('player-search-select').addEventListener('change',()=>selectCase($('player-search-select').value));
  for(const id of ['cap-input','years','salary-change','slider-cap','option'])$(id).addEventListener('input',renderAll);
  $('reset-params').addEventListener('click',()=>{if(activeCase)selectCase(activeRoster.id,true);});
  $('export-scenario').addEventListener('click',downloadScenario);
  $('download-data').addEventListener('click',()=>downloadJSON(data,'NBA_Contract_Lab_P426_Preview_Data.json'));
  $('download-report').addEventListener('click',()=>downloadJSON(report,'NBA_Contract_Lab_P426_Broader_Audit.json'));
  populatePlayers(null);openTab('tab-projections');
  window.NBAContractLab={getState:()=>({valuationMode,activeCase,activeRoster,prediction,schedule,activeTab,currentDiagnostics,newContractDiagnostics}),getSummary:()=>({players:data.rosterSnapshot.rows.length,preparedScenarios:data.rosterSnapshot.counts.prepared,contracts:data.contracts.length,rosterAsOf:data.rosterSnapshot.asOfDate,modelRevision:bundle.model.revision,valueView:valuationMode,unavailable:data.rosterSnapshot.counts.unavailable}),selectCase,openTab,renderAll,downloadScenario};
  $('launch-help').hidden=true;
 }catch(error){$('load-error').hidden=false;$('load-error').textContent=`The prototype could not initialize: ${error.message}`;}
}

function availabilityMessage(entry){
 const codes=entry.reasonCodes??[];
 if(codes.includes('outside_high_performance_training_envelope'))return {title:'Market estimate unavailable for this player',body:'This player exceeds the model’s reviewed training range. Available statistics remain accessible; a signed contract is not substituted for a model estimate.'};
 if(codes.includes('latest_completed_season_absent'))return {title:'2025–26 performance is unavailable',body:'Older seasons are available in the statistics tab. The current model requires a usable 2025–26 season; older history alone does not enable this estimate.'};
 if(codes.includes('no_completed_history'))return {title:'Completed-season history is unavailable',body:'The supplied dataset does not contain the completed NBA performance needed for a market estimate. A label change does not create missing performance history.'};
 return {title:'Performance inputs need review',body:'Some regular-season inputs are missing or unreconciled. Available statistics remain accessible while the estimate is unavailable.'};
}
function renderViewChrome(){
 $('hero-value-label').textContent='Projected First-Year Market Value';
 $('hero-total-label').textContent='Total Contract Value';
 $('hero-aav-label').textContent='Average Annual Value (AAV)';
 $('hero-share-label').textContent='% of Cap';
 $('top-cap-label').textContent='2027–28 Salary Cap';
 $('hero-total').setAttribute('title','Total scheduled base of the hypothetical contract');
 $('hero-aav').setAttribute('title','Hypothetical contract total divided by years');
 $('hero-cappct').setAttribute('title','Projected first-year market value divided by the entered 2027–28 salary cap');
 $('projection-layout').hidden=!activeCase;
 renderCurrentSalaryReference();
}

function renderCurrentSalaryReference(){
 const node=$('current-salary'),ref=activeRoster?ui.currentSalaryReferences?.[activeRoster.playerKey]:null;
 const known=ref&&ref.season==='2026-27'&&Number.isFinite(ref.baseSalary)&&ref.baseSalary>=0;
 node.textContent=known?dollars(ref.baseSalary):'—';
 if(known){
  node.setAttribute('href',ref.sourceURL);
  node.setAttribute('title','Recorded 2026–27 scheduled base salary; excludes incentives and is not AAV or cap hit. Open supplied salary source.');
  node.setAttribute('aria-label','Current 2026–27 Salary: '+dollars(ref.baseSalary)+'. Open salary source.');
 }else{
  node.removeAttribute('href');
  node.setAttribute('title',activeRoster?'Current-season base salary is not verified in the supplied reference records. This does not prevent a supported model estimate.':'Select a player to view an available salary reference.');
  node.setAttribute('aria-label','Current 2026–27 Salary unavailable');
 }
}

function renderMethodDetails(){
 const profile=bundle.profiles[activeCase.playerId],fit=bundle.fits[profile?.prediction?.fitId];
 $('method-detail').textContent='Projected first-year market value equals the entered 2027–28 cap multiplied by the retained P4.25 tree model’s estimated cap share. Its 26 numerical inputs use completed regular-season performance, age, position family and reviewed prior salary. Historical training sources remain in the expandable evidence below. Playoff statistics and narrative roles remain context. Missing current-season performance and unusually high performance outside reviewed training coverage can prevent a model estimate. Signed extension references never replace a model prediction. Hypothetical schedules do not depend on a verified current contract total or AAV, but historical agreements and prior-salary information remain part of the retained model.';
 $('feature-inputs').innerHTML=fit?fit.features.map(k=>{const value=profile.target.values[k],s=fit.preprocessing[k],missing=!Number.isFinite(value),v=missing?s.median:value;return `<tr><td>${esc(k.split(':')[0])}</td><td>${esc(k)}</td><td>${esc(Number.isFinite(v)?v.toFixed(6):'—')}</td><td>${missing?'Training median':profile.prediction.outsideTrainingRange.includes(k)?'Observed · outside range':'Observed'}</td></tr>`;}).join(''):'';
 $('feature-note').textContent='Regular-season numerical inputs retain 65% weight per older season before sample weighting. Playoffs are shown for context and do not affect the salary formula. Colors describe same-position-family statistics, not confidence or salary adjustments. '+(fit?coverageNote():'No complete eligible model input row exists for this player.');
}

init();
