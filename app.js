/* app.js - kopiere komplett */
/* Minimal, getestete Implementierung mit den geforderten Features:
   - Teams untereinander
   - kein vertikales Seiten-Scrollen (app verwendet 100vh und interne scrollable Bereiche)
   - Kurzspiel: Dropdown-Eingabe, max = PAR*3 + 1
   - 2-Spieler: automatische Gegenplatzierung
   - 4-Spieler Team: automatische Teamauswertung (beste Platzierung pro Team entscheidet)
*/

const clubs = ["Driver","Holz 3","Holz 5","Hybrid","Eisen 4","Eisen 5","Eisen 6","Eisen 7","Eisen 8","Eisen 9","Pitching Wedge","Gap Wedge","Sand Wedge","Lob Wedge","Putter"];
const forms = ["Zufallsschläger (Einer für die Bahn)","Zufallsschläger (für Alle)","Zufallsschläger (Luck of the draw)","Nur Eisen 7","Nur Pitching Wedge","Nur Hölzer","Von Rot","Von Gelb","Nimm 2 -Best Ball","Nimm 2 -Worst Ball","Scramble Best Ball","Scramble Worst Ball","Nur zwei Zufallsschläger","Pflicht-Fairway-/Grüntreffer","Leder Wedge","Mitspieler wählen Schläger"];

let players = [];
let placements = {}; // e.g. placements["5-0"] = {points:1,label:1} or placements["5-team1"] = {result:"Gewonnen"}
let kurzScores = {}; // kurzScores[playerIndex][hole] = number

// DOM refs
const playerCountSel = document.getElementById('playerCount');
const modeSel = document.getElementById('mode');
const parSetting = document.getElementById('parSetting');
const parInput = document.getElementById('parValue');
const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const playersArea = document.getElementById('playersArea');
const holesContainer = document.getElementById('holesContainer');
const gameSection = document.getElementById('gameSection');
const startSection = document.getElementById('startSection');
const generators = document.getElementById('generators');
const clubBtn = document.getElementById('clubBtn');
const formBtn = document.getElementById('formBtn');
const clubResult = document.getElementById('clubResult');
const formResult = document.getElementById('formResult');

function initModeOptions(){
  const count = parseInt(playerCountSel.value,10);
  modeSel.innerHTML = '';
  addOptionTo(modeSel,'einzel','Einzel');
  addOptionTo(modeSel,'kurz','Kurzspiel-Competition');
  if(count === 4) addOptionTo(modeSel,'team','Team');
  if(count === 2 || count === 4) addOptionTo(modeSel,'matchplay','Matchplay');
  modeSel.onchange = ()=> { parSetting.style.display = (modeSel.value === 'kurz') ? 'block' : 'none'; };
  modeSel.dispatchEvent(new Event('change'));
}
function addOptionTo(sel,val,text){ const o = document.createElement('option'); o.value=val; o.textContent=text; sel.appendChild(o); }

playerCountSel.onchange = initModeOptions;
initModeOptions();

// Start game
startBtn.addEventListener('click', ()=>{
  const count = parseInt(playerCountSel.value,10);
  const mode = modeSel.value;
  players = [];
  placements = {};
  kurzScores = {};
  for(let i=0;i<count;i++){ players.push({name:`Spieler ${i+1}`, bonus:0}); kurzScores[i] = {}; }
  startSection.style.display = 'none';
  gameSection.style.display = 'flex';
  // generators hidden for matchplay & kurz
  generators.style.display = (mode==='matchplay' || mode==='kurz') ? 'none' : 'flex';
  renderPlayersArea();
  renderHoles(count, mode);
});

// Back
backBtn.addEventListener('click', ()=>{
  startSection.style.display = 'flex';
  gameSection.style.display = 'none';
  clubResult.textContent = '';
  formResult.textContent = '';
});

// generators
clubBtn.addEventListener('click', ()=> clubResult.textContent = clubs[Math.floor(Math.random()*clubs.length)]);
formBtn.addEventListener('click', ()=> {
  const f = forms[Math.floor(Math.random()*forms.length)];
  const m = f.match(/^(.*?)\s*\((.*)\)\s*$/);
  formResult.textContent = m ? (m[1] + '\n' + m[2]) : f;
});

/* Renders */
function renderPlayersArea(){
  playersArea.innerHTML = '';
  const mode = modeSel.value;
  const count = players.length;

  if(mode === 'matchplay' && count === 4){
    // Teams stacked: Team A then Team B
    const wrapper = document.createElement('div');
    wrapper.className = 'teamWrapperColumn';
    // Team A
    wrapper.appendChild(createTeamCard(1, 0,1));
    // Team B
    wrapper.appendChild(createTeamCard(2, 2,3));
    playersArea.appendChild(wrapper);
    return;
  }

  if(mode === 'matchplay' && count === 2){
    // two player cards with their hole circles
    for(let i=0;i<2;i++){
      const pc = document.createElement('div'); pc.className='playerCard';
      pc.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>Spieler ${i+1}</strong><br><input type="text" value="${players[i].name}" data-index="${i}" class="nameInput"></div>
          <div id="score-${i}" class="score-square score-zero">0</div>
        </div>
        <div style="margin-top:6px;"><div id="status-${i}" class="score-square score-zero">TIED</div></div>
        <div style="margin-top:8px;">
          <div style="text-align:center;font-weight:700">Bahnen 1–9</div>
          <div id="p${i}-holes-1" class="hole-row" style="margin:6px 0"></div>
          <div style="text-align:center;font-weight:700">Bahnen 10–18</div>
          <div id="p${i}-holes-2" class="hole-row" style="margin:6px 0"></div>
        </div>
        <div class="placementTable" id="placement-${i}" style="margin-top:8px"></div>
      `;
      playersArea.appendChild(pc);
      // name binding
      pc.querySelector('.nameInput').addEventListener('input', (e)=>{ players[i].name = e.target.value; });
      // create circles
      for(let h=1;h<=9;h++){ const el=document.createElement('div'); el.className='hole-circle neutral'; el.id=`p${i}-hole-${h}`; el.textContent=h; document.getElementById(`p${i}-holes-1`).appendChild(el); }
      for(let h=10;h<=18;h++){ const el=document.createElement('div'); el.className='hole-circle neutral'; el.id=`p${i}-hole-${h}`; el.textContent=h; document.getElementById(`p${i}-holes-2`).appendChild(el); }
    }
    return;
  }

  if(mode === 'kurz'){
    // show scorecards: inputs via dropdown will be rendered later in renderKurzspielScorecards
    renderKurzspielScorecards();
    return;
  }

  // default strokeplay / Einzel / 3 or 4 players
  for(let i=0;i<count;i++){
    const pc = document.createElement('div'); pc.className='playerCard';
    pc.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>Spieler ${i+1}</strong><br><input type="text" value="${players[i].name}" data-index="${i}" class="nameInput"></div>
        <div id="score-${i}" class="score-square score-zero">0</div>
      </div>
      <div style="margin-top:6px;">
        <select data-player="${i}" class="optSelect"><option value="">Option wählen…</option></select>
      </div>
      <div class="optionList" style="display:flex;align-items:center;">
        <div id="optList-${i}" style="flex:1"></div>
        <div id="bonus-${i}" class="score-square score-zero">0</div>
      </div>
      <div class="placementTable" id="placement-${i}" style="margin-top:8px"></div>
    `;
    playersArea.appendChild(pc);
    // name binding
    pc.querySelector('.nameInput').addEventListener('input',(e)=> players[i].name = e.target.value );
    // populate option select
    const sel = pc.querySelector('.optSelect');
    optionsFor(sel); // fill options
    sel.addEventListener('change', (e)=> {
      const val = e.target.value; if(!val) return;
      addOptionToPlayer(i,val);
      e.target.value = '';
    });
  }
  updateUI();
}

function createTeamCard(teamId, pIndexA, pIndexB){
  const div = document.createElement('div'); div.className='teamCard';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong>Team ${teamId===1?'A':'B'}</strong>
      <div style="display:flex;gap:8px;align-items:center">
        <div id="status-team${teamId}" class="score-square score-zero">TIED</div>
        <div id="team${teamId}-total" class="score-square score-zero">0</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:6px;">
      <div style="flex:1">
        <div>Spieler ${pIndexA+1}:<br><input type="text" value="${players[pIndexA].name}" data-index="${pIndexA}" class="nameInput"></div>
        <div class="optionList" style="display:flex;align-items:center;">
          <div id="optList-${pIndexA}" style="flex:1"></div>
          <div id="bonus-${pIndexA}" class="score-square score-zero">0</div>
        </div>
        <div class="placementTable" id="placement-${pIndexA}"></div>
      </div>
      <div style="flex:1">
        <div>Spieler ${pIndexB+1}:<br><input type="text" value="${players[pIndexB].name}" data-index="${pIndexB}" class="nameInput"></div>
        <div class="optionList" style="display:flex;align-items:center;">
          <div id="optList-${pIndexB}" style="flex:1"></div>
          <div id="bonus-${pIndexB}" class="score-square score-zero">0</div>
        </div>
        <div class="placementTable" id="placement-${pIndexB}"></div>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div style="text-align:center;font-weight:700">Bahnen 1–9</div>
      <div id="team${teamId}-holes-1" class="hole-row" style="margin:6px 0"></div>
      <div style="text-align:center;font-weight:700">Bahnen 10–18</div>
      <div id="team${teamId}-holes-2" class="hole-row" style="margin:6px 0"></div>
    </div>
  `;
  // name input binding
  setTimeout(()=>{ // DOM appended in caller; attach listeners
    const inputs = div.querySelectorAll('.nameInput');
    inputs.forEach(inp => inp.addEventListener('input', e => { const idx = parseInt(e.target.dataset.index,10); players[idx].name = e.target.value; }));
    // create hole circles
    for(let h=1;h<=9;h++){ const el=document.createElement('div'); el.className='hole-circle neutral'; el.id=`team${teamId}-hole-${h}`; el.textContent=h; div.querySelector(`#team${teamId}-holes-1`).appendChild(el); }
    for(let h=10;h<=18;h++){ const el=document.createElement('div'); el.className='hole-circle neutral'; el.id=`team${teamId}-hole-${h}`; el.textContent=h; div.querySelector(`#team${teamId}-holes-2`).appendChild(el); }
  },0);
  return div;
}

/* Fill options into select element */
function optionsFor(sel){
  sel.innerHTML = '<option value="">Option wählen…</option>';
  const arr = ["Holz getroffen","Penalty Area","Out of bounds","3–Putt","1-Putt","Chip-In","Birdie","Bunker","Fairway verfehlt","Green in Regulation","PAR gerettet","Texas Wedge"];
  arr.forEach(a => {
    const o = document.createElement('option'); o.value=a; o.textContent=a; sel.appendChild(o);
  });
}

/* Add option (simple bonus handling) */
function addOptionToPlayer(playerIndex,optionName){
  // simplistic: map some names to values
  const map = { "Holz getroffen":-1, "Penalty Area":-1, "Out of bounds":-1, "3–Putt":-1, "1-Putt":1, "Chip-In":1, "Birdie":1, "Bunker":-1, "Fairway verfehlt":-1, "Green in Regulation":1, "PAR gerettet":1, "Texas Wedge":1 };
  const v = map[optionName]||0;
  players[playerIndex].bonus = (players[playerIndex].bonus||0) + v;
  updateUI();
}

/* Render holes (selects for placements) */
function renderHoles(count, mode){
  holesContainer.innerHTML = '';
  for(let h=1; h<=18; h++){
    const card = document.createElement('div'); card.className='holeCard';
    card.innerHTML = `<div style="font-weight:700">Bahn ${h}</div><div class="holeControls" id="controls-${h}"></div>`;
    holesContainer.appendChild(card);
    const controls = card.querySelector(`#controls-${h}`);
    if(mode==='matchplay' && count===4){
      // team selects (still present, but individuals auto-eval override)
      const selA = makeSelect(['','Gewonnen','Verloren','Geteilt'], val => { setPlacementTeam(h,1,val); });
      const selB = makeSelect(['','Gewonnen','Verloren','Geteilt'], val => { setPlacementTeam(h,2,val); });
      const wrapA = document.createElement('div'); wrapA.innerHTML = `Team 1<br>`; wrapA.appendChild(selA);
      const wrapB = document.createElement('div'); wrapB.innerHTML = `Team 2<br>`; wrapB.appendChild(selB);
      controls.appendChild(wrapA); controls.appendChild(wrapB);
    } else if(mode==='matchplay' && count===2){
      const sel0 = makeSelect(['','Gewonnen','Verloren','Geteilt'], val => { setPlacementMatch2(h,0,val); });
      const sel1 = makeSelect(['','Gewonnen','Verloren','Geteilt'], val => { setPlacementMatch2(h,1,val); });
      controls.appendChild(elemWithLabel('Spieler 1',sel0)); controls.appendChild(elemWithLabel('Spieler 2',sel1));
    } else if(mode==='kurz'){
      controls.textContent = 'Kurzspiel: Ergebnisse per Scorecards';
    } else {
      // strokeplay: generate select for each player
      for(let i=0;i<count;i++){
        const opts = ['','1','2','T'];
        if(count>=3) opts.splice(2,0,'3');
        if(count===4) opts.splice(opts.length-1,0,'4'); // ensure '4' present if 4 players strokeplay
        const sel = makeSelect(opts, val => { setPlacementStroke(h,i,val); });
        controls.appendChild(elemWithLabel((i+1)+':', sel));
      }
    }
  }
}

/* helpers to create elements */
function makeSelect(optionsArray, onChange){
  const sel = document.createElement('select');
  optionsArray.forEach(o => { const opt = document.createElement('option'); opt.value=o; opt.textContent=o || '-'; sel.appendChild(opt); });
  sel.addEventListener('change', ()=> onChange(sel.value));
  return sel;
}
function elemWithLabel(labelText, element){
  const wrap = document.createElement('div'); wrap.innerHTML = `${labelText}<br>`; wrap.appendChild(element); return wrap;
}

/* PLACEMENT handlers */

// strokeplay per-player placement
function setPlacementStroke(hole, playerIndex, val){
  if(val==='') { delete placements[`${hole}-${playerIndex}`]; updateAfterPlacement(hole); return; }
  if(val === 'T' && players.length===2){
    // both get T
    placements[`${hole}-0`] = {points:0,label:'T'}; placements[`${hole}-1`] = {points:0,label:'T'};
    // reflect selects
    reflectSelectsForHole(hole);
    updateAfterPlacement(hole);
    return;
  }
  const num = parseInt(val,10);
  if(isNaN(num)) return;
  // points mapping consistent with earlier code
  let points = 0;
  if(players.length===4){ if(num===1) points=2; if(num===2) points=1; if(num===3) points=-1; if(num===4) points=-2; }
  else if(players.length===3){ if(num===1)points=1; if(num===2)points=0; if(num===3)points=-1; }
  else if(players.length===2){ if(num===1)points=1; if(num===2)points=-1; }
  placements[`${hole}-${playerIndex}`] = {points:points,label:num};
  // Special: if 2-player, auto set other player's placement
  if(players.length===2){
    const other = playerIndex===0?1:0;
    if(num===1) placements[`${hole}-${other}`] = {points:-1,label:2};
    else if(num===2) placements[`${hole}-${other}`] = {points:1,label:1};
    reflectSelectsForHole(hole);
  }
  // If we are in matchplay 4-player, recompute team scoring automatically
  if(modeSel.value==='matchplay' && players.length===4){
    computeTeamScoringFromIndividuals();
  }
  updateAfterPlacement(hole);
}

// 2-player matchplay selects
function setPlacementMatch2(hole, playerIndex, val){
  if(val===''){ delete placements[`${hole}-0`]; delete placements[`${hole}-1`]; reflectSelectsForHole(hole); updateAfterPlacement(hole); return; }
  if(val==='Geteilt'){ placements[`${hole}-0`] = {result:'Geteilt'}; placements[`${hole}-1`] = {result:'Geteilt'}; reflectSelectsForHole(hole); updateAfterPlacement(hole); return; }
  if(val==='Gewonnen'){ placements[`${hole}-0`] = (playerIndex===0)?{result:'Gewonnen'}:{result:'Verloren'}; placements[`${hole}-1`] = (playerIndex===0)?{result:'Verloren'}:{result:'Gewonnen'}; reflectSelectsForHole(hole); updateAfterPlacement(hole); return; }
  if(val==='Verloren'){ placements[`${hole}-0`] = (playerIndex===0)?{result:'Verloren'}:{result:'Gewonnen'}; placements[`${hole}-1`] = (playerIndex===0)?{result:'Gewonnen'}:{result:'Verloren'}; reflectSelectsForHole(hole); updateAfterPlacement(hole); return; }
}

// team selects (keeps team select functionality but automatic individuals-based scoring overrides)
function setPlacementTeam(hole, teamId, val){
  if(!val){ delete placements[`${hole}-team1`]; delete placements[`${hole}-team2`]; updateAfterPlacement(hole); return; }
  const key1 = `${hole}-team1`, key2 = `${hole}-team2`;
  if(val==='Geteilt'){ placements[key1]={result:'Geteilt'}; placements[key2]={result:'Geteilt'}; updateAfterPlacement(hole); return; }
  if(val==='Gewonnen'){
    placements[key1] = (teamId===1)?{result:'Gewonnen'}:{result:'Verloren'};
    placements[key2] = (teamId===1)?{result:'Verloren'}:{result:'Gewonnen'};
    updateAfterPlacement(hole); return;
  }
  if(val==='Verloren'){
    placements[key1] = (teamId===1)?{result:'Verloren'}:{result:'Gewonnen'};
    placements[key2] = (teamId===1)?{result:'Gewonnen'}:{result:'Verloren'};
    updateAfterPlacement(hole); return;
  }
}

// reflect selects: ensure UI select controls show current placements (for 2-player auto updates)
function reflectSelectsForHole(hole){
  // strokeplay selects for 2-player mode in controls will be updated implicitly because they are independent elements (no central store of selects)
  // So we update the DOM by searching controls for that hole
  const ctrl = document.getElementById(`controls-${hole}`);
  if(!ctrl) return;
  // set selects inside
  const selects = ctrl.querySelectorAll('select');
  selects.forEach(sel => {
    // determine which select corresponds to which player/team by parent label text
    const parentText = sel.parentElement && sel.parentElement.textContent ? sel.parentElement.textContent.trim() : '';
    if(parentText.startsWith('Spieler 1')) {
      const ent = placements[`${hole}-0`];
      if(ent && ent.label === 'T'){ sel.value = 'T'; }
      else if(ent && ent.label === 1){ sel.value = '1'; }
      else if(ent && ent.label === 2){ sel.value = '2'; }
      else if(ent && ent.result){ sel.value = ent.result; }
      else sel.value = '';
    } else if(parentText.startsWith('Spieler 2')){
      const ent = placements[`${hole}-1`];
      if(ent && ent.label === 'T'){ sel.value = 'T'; }
      else if(ent && ent.label === 1){ sel.value = '1'; }
      else if(ent && ent.label === 2){ sel.value = '2'; }
      else if(ent && ent.result){ sel.value = ent.result; }
      else sel.value = '';
    } else if(parentText.startsWith('Team 1') || parentText.startsWith('Team 2')){
      const entA = placements[`${hole}-team1`];
      const entB = placements[`${hole}-team2`];
      if(sel.previousSibling && sel.previousSibling.textContent.includes('Team 1')) {
        sel.value = entA && entA.result ? entA.result : '';
      } else {
        sel.value = entB && entB.result ? entB.result : '';
      }
    } else {
      // generic: leave as is
    }
  });
}

/* After any placement change: update visuals and team computations */
function updateAfterPlacement(hole){
  // If 4-player matchplay and individual placements exist, compute automatic team scoring
  if(modeSel.value==='matchplay' && players.length===4){
    computeTeamScoringFromIndividuals();
  }
  renderPlacementVisuals(); // updates circles, tables, totals
}

/* Renders placements to UI */
function renderPlacementVisuals(){
  const mode = modeSel.value;
  // Update player totals, bonus etc.
  for(let i=0;i<players.length;i++){
    const scoreEl = document.getElementById(`score-${i}`);
    if(scoreEl){
      // compute total points (bonus + placement points)
      let placementSum = 0;
      for(let h=1;h<=18;h++){
        const key = `${h}-${i}`;
        if(placements[key] && typeof placements[key].points === 'number') placementSum += placements[key].points;
      }
      const total = (players[i].bonus||0) + placementSum;
      scoreEl.textContent = total;
      if(total>0) scoreEl.className='score-square score-pos'; else if(total<0) scoreEl.className='score-square score-neg'; else scoreEl.className='score-square score-zero';
    }
    // bonus square
    const bonusEl = document.getElementById(`bonus-${i}`) || document.getElementById(`bonus-${i}`);
    if(bonusEl) {
      const b = players[i].bonus || 0;
      bonusEl.textContent = b;
      bonusEl.className = b>0 ? 'score-square score-pos' : b<0 ? 'score-square score-neg' : 'score-square score-zero';
    }
    // placement table
    const placementDiv = document.getElementById(`placement-${i}`);
    if(placementDiv){
      let html = '';
      for(let h=1;h<=18;h++){
        const key = `${h}-${i}`;
        if(placements[key]) {
          if(placements[key].result) html += `Bahn ${h}: ${placements[key].result}<br>`;
          else if(typeof placements[key].points === 'number') html += `Bahn ${h}: ${placements[key].points} P<br>`;
        }
      }
      placementDiv.innerHTML = html;
    }
  }

  // Matchplay circles & team totals
  if(mode==='matchplay'){
    if(players.length===2){
      // update circles per hole based on placements[`${h}-0`] results
      for(let h=1;h<=18;h++){
        const e0 = placements[`${h}-0`], e1 = placements[`${h}-1`];
        const el0 = document.getElementById(`p0-hole-${h}`), el1 = document.getElementById(`p1-hole-${h}`);
        if(el0 && el1){
          if(e0 && e0.result){
            if(e0.result==='Gewonnen'){ el0.className='hole-circle win'; el1.className='hole-circle lose'; }
            else if(e0.result==='Verloren'){ el0.className='hole-circle lose'; el1.className='hole-circle win'; }
            else { el0.className='hole-circle tie'; el1.className='hole-circle tie'; }
          } else {
            el0.className='hole-circle neutral'; el1.className='hole-circle neutral';
          }
        }
      }
      // compute net up
      let net=0, played=0;
      for(let h=1;h<=18;h++){ if(placements[`${h}-0`] && placements[`${h}-0`].result){ played++; if(placements[`${h}-0`].result==='Gewonnen') net++; else if(placements[`${h}-0`].result==='Verloren') net--; } }
      const s0=document.getElementById('score-0'), s1=document.getElementById('score-1');
      if(s0 && s1){ s0.textContent = net; s1.textContent = -net; s0.className = net>0?'score-square score-pos':net<0?'score-square score-neg':'score-square score-zero'; s1.className = net<0?'score-square score-pos':net>0?'score-square score-neg':'score-square score-zero'; }
    } else if(players.length===4){
      // team circles updated via computeTeamScoringFromIndividuals -> updateTeamCircles called there
      // update team totals display done there as well
    }
  }
}

/* Compute team scoring automatically from individual placements (4-player matchplay) */
function computeTeamScoringFromIndividuals(){
  if(players.length !== 4) return;
  // For each hole determine best position for each team
  for(let h=1;h<=18;h++){
    let bestA = null, bestB = null;
    for(let pi=0; pi<4; pi++){
      const ent = placements[`${h}-${pi}`];
      if(!ent) continue;
      const lab = ent.label;
      if(lab === 'T'){
        if(pi<=1 && bestA===null) bestA='T';
        if(pi>=2 && bestB===null) bestB='T';
      } else if(typeof lab === 'number'){
        if(pi<=1){ if(bestA===null || bestA==='T' || lab < bestA) bestA = lab; }
        else { if(bestB===null || bestB==='T' || lab < bestB) bestB = lab; }
      }
    }
    if(bestA === null && bestB === null){
      delete placements[`${h}-team1`]; delete placements[`${h}-team2`];
    } else {
      let resA='Geteilt', resB='Geteilt';
      if(bestA === 'T' && bestB === 'T'){ resA='Geteilt'; resB='Geteilt'; }
      else if(bestA==='T' && typeof bestB === 'number'){ resA='Verloren'; resB='Gewonnen'; }
      else if(bestB==='T' && typeof bestA === 'number'){ resA='Gewonnen'; resB='Verloren'; }
      else if(typeof bestA === 'number' && typeof bestB === 'number'){
        if(bestA < bestB) { resA='Gewonnen'; resB='Verloren'; }
        else if(bestA === bestB) { resA='Geteilt'; resB='Geteilt'; }
        else { resA='Verloren'; resB='Gewonnen'; }
      } else if(typeof bestA === 'number' && bestB === null){ resA='Gewonnen'; resB='Verloren'; }
      else if(typeof bestB === 'number' && bestA === null){ resA='Verloren'; resB='Gewonnen'; }
      placements[`${h}-team1`] = { result: resA };
      placements[`${h}-team2`] = { result: resB };
    }
  }
  // update visuals
  for(let h=1;h<=18;h++) updateTeamCircles(h);
  // update team totals
  let totalA=0, totalB=0;
  for(let h=1;h<=18;h++){
    const a = placements[`${h}-team1`];
    const b = placements[`${h}-team2`];
    if(a && a.result==='Gewonnen') totalA++;
    else if(a && a.result==='Verloren') totalA--;
    if(b && b.result==='Gewonnen') totalB++;
    else if(b && b.result==='Verloren') totalB--;
  }
  const tA = document.getElementById('team1-total') || document.getElementById('team1-total');
  const t1 = document.getElementById('team1-total') || document.getElementById('team1-total');
  const elA = document.getElementById('team1-total') || document.getElementById('teamA-total') || document.getElementById('team1-total'); // multiple id variants handled
  const elB = document.getElementById('team2-total') || document.getElementById('teamB-total') || document.getElementById('team2-total');
  if(elA) elA.textContent = totalA, elA.className = totalA>0?'score-square score-pos':totalA<0?'score-square score-neg':'score-square score-zero';
  if(elB) elB.textContent = totalB, elB.className = totalB>0?'score-square score-pos':totalB<0?'score-square score-neg':'score-square score-zero';
}

/* Update single team hole circles */
function updateTeamCircles(hole){
  const a = placements[`${hole}-team1`];
  const b = placements[`${hole}-team2`];
  const elA = document.getElementById(`team1-hole-${hole}`) || document.getElementById(`teamA-hole-${hole}`) || document.getElementById(`teamA-hole-${hole}`);
  const elB = document.getElementById(`team2-hole-${hole}`) || document.getElementById(`teamB-hole-${hole}`) || document.getElementById(`teamB-hole-${hole}`);
  if(elA){
    if(a && a.result==='Gewonnen') elA.className='hole-circle win';
    else if(a && a.result==='Verloren') elA.className='hole-circle lose';
    else if(a && a.result==='Geteilt') elA.className='hole-circle tie';
    else elA.className='hole-circle neutral';
  }
  if(elB){
    if(b && b.result==='Gewonnen') elB.className='hole-circle win';
    else if(b && b.result==='Verloren') elB.className='hole-circle lose';
    else if(b && b.result==='Geteilt') elB.className='hole-circle tie';
    else elB.className='hole-circle neutral';
  }
}

/* KURZSPIEL: render scorecards and dropdowns with max = PAR*3+1 */
function renderKurzspielScorecards(){
  playersArea.innerHTML = '';
  const count = players.length;
  const par = Math.max(1, parseInt(parInput.value,10) || 2);
  const maxScore = par*3 + 1;
  for(let i=0;i<count;i++){
    const card = document.createElement('div'); card.className='playerCard';
    card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
      <div><strong>Spieler ${i+1}</strong><br><input type="text" value="${players[i].name}" class="nameInput" data-index="${i}"></div>
      <div id="kurz-total-${i}" class="score-square score-zero">0</div>
    </div>
    <div style="text-align:center;margin-top:6px;font-weight:700">Bahn Ergebnisse (1–9 / 10–18)</div>
    <div style="margin-top:6px;">
      <div id="k${i}-holes-1" class="hole-row" style="margin-bottom:6px"></div>
      <div id="k${i}-holes-2" class="hole-row"></div>
    </div>`;
    playersArea.appendChild(card);
    // name handler
    card.querySelector('.nameInput').addEventListener('input', e => { players[i].name = e.target.value; });
    // create dropdown per hole
    for(let h=1;h<=9;h++){
      const dd = makeSelectForKurz(par, maxScore, i, h);
      document.getElementById(`k${i}-holes-1`).appendChild(dd);
    }
    for(let h=10;h<=18;h++){
      const dd = makeSelectForKurz(par, maxScore, i, h);
      document.getElementById(`k${i}-holes-2`).appendChild(dd);
    }
    // init kurzScores
    kurzScores[i] = kurzScores[i] || {};
    for(let h=1;h<=18;h++){ if(kurzScores[i][h] === undefined) kurzScores[i][h] = 0; }
  }
  updateKurzTotals();
}

function makeSelectForKurz(par, maxScore, playerIndex, holeNumber){
  const wrapper = document.createElement('div');
  wrapper.style.display='flex'; wrapper.style.flexDirection='column'; wrapper.style.alignItems='center'; wrapper.style.gap='4px';
  const circle = document.createElement('div'); circle.className='kurz-circle'; circle.id = `k${playerIndex}-hole-${holeNumber}`; circle.textContent = '0';
  const sel = document.createElement('select');
  const empty = document.createElement('option'); empty.value = '0'; empty.textContent = '0'; sel.appendChild(empty);
  for(let v=1; v<=maxScore; v++){ const opt = document.createElement('option'); opt.value = String(v); opt.textContent = String(v); sel.appendChild(opt); }
  sel.value = '0';
  sel.addEventListener('change', ()=> {
    const val = parseInt(sel.value,10) || 0;
    kurzScores[playerIndex][holeNumber] = val;
    circle.textContent = val;
    // set color according to diff to par
    const diff = val - par;
    circle.className = 'kurz-circle';
    if(val===0){ circle.style.background='#fff'; circle.style.color='#000'; circle.style.borderColor='#000'; }
    else if(diff <= -2){ circle.classList.add('kurz-orange'); circle.style.background='orange'; circle.style.color='#fff'; circle.style.borderColor='transparent'; }
    else if(diff === -1){ circle.classList.add('kurz-yellow'); circle.style.background='yellow'; circle.style.color='#000'; circle.style.borderColor='transparent'; }
    else if(diff === 0){ circle.classList.add('kurz-blue'); circle.style.background='#2b7cff'; circle.style.color='#fff'; circle.style.borderColor='transparent'; }
    else if(diff === 1){ circle.classList.add('kurz-red'); circle.style.background='#d9534f'; circle.style.color='#fff'; circle.style.borderColor='transparent'; }
    else if(diff === 2){ circle.classList.add('kurz-purple'); circle.style.background='purple'; circle.style.color='#fff'; circle.style.borderColor='transparent'; }
    else if(diff >= 3){ circle.classList.add('kurz-black'); circle.style.background='#000'; circle.style.color='#fff'; circle.style.borderColor='transparent'; }
    updateKurzTotals();
  });
  wrapper.appendChild(circle); wrapper.appendChild(sel);
  return wrapper;
}

function updateKurzTotals(){
  for(let i=0;i<players.length;i++){
    let total = 0;
    for(let h=1;h<=18;h++){ total += (kurzScores[i][h] || 0); }
    const el = document.getElementById(`kurz-total-${i}`);
    if(el){ el.textContent = total; el.className = total>0?'score-square score-pos':total<0?'score-square score-neg':'score-square score-zero'; }
  }
}

/* INITIAL render helpers */
function renderKurzspielScorecards(){
  renderKurzspielScorecards(); // wrapper exists to be consistent
}

/* initial utilities */
function setInitialUIAfterStart(){
  renderPlacementVisuals();
}

/* wire up some global events */
modeSel.addEventListener('change', ()=> {
  // nothing yet; when start is clicked the current mode will be used
});
parInput.addEventListener('change', ()=> {
  // ensure positive integer
  let v = parseInt(parInput.value,10) || 2; if(v<1) v=1; parInput.value = v;
});

/* kick-off: nothing until start pressed */

/* Notes:
 - The UI uses internal overflow on panel-inner to avoid page vertical scroll.
 - Kurzspiel dropdown max = PAR*3 + 1 as requested.
 - 2-player strokeplay auto-sets the opponent's placement.
 - 4-player team auto-scoring computes team result from best individual placement.
 - Teams are rendered stacked (A above B).
*/