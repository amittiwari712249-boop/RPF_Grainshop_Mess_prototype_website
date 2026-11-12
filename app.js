const $ = id => document.getElementById(id);
const money  = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const moneyP = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayStr = (off=0)=>{const d=new Date();d.setDate(d.getDate()+off);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const fmtDate = s => {const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||''));return m?`${m[3]}-${m[2]}-${m[1]}`:esc(s);};

/* ================= SETTINGS ================= */
const SECTIONS = {
  staff:    { title:'Staff Barrack',   beds:100 },
  officers: { title:"Officers' Rooms", beds:10  }
};
const EDIT_PIN = "2580";       // CHANGE before deployment (used only when SHEET_API_URL is empty)
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwzIvj86e9IbhRrW5kjd4GICqAH0NorxvK8KRzmQPdI6SXi93TFse_8xPzMFCSTVbIq/exec";
const BG_INTERVAL = 12000;     // background photo changes every 12 seconds
const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MEALS = ['Lunch','Dinner'];
const UNITS = ['kg','g','litre','ml','piece','dozen','packet','quintal'];
const BACKGROUNDS = [          // local photos first, online nature photos are added only if they load
  'images/background.jpg','images/RpfPostKgp.jpeg','images/RpfPostKgp.jpeg','images/RpfPostKgp.jpeg',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2000&q=80'
];
/* Your original weekly mess menu (Lunch / Dinner). Breakfast is kept editable. */
const DEFAULT_MENU = [
  ["Sunday",    "Roti, Daal, Chawal, Paneer/Chicken, Bhujiya, Salad", "Roti, Seasonal Vegetable"],
  ["Monday",    "Roti, Daal, Chawal, Curry Pakoda Chokha/Sambhar, Papad", "Roti, Rajma/Tadka"],
  ["Tuesday",   "Roti, Daal, Chawal Sabji, Mix Veg Sabji, Chatni", "Roti, Aalu Matar, Kheer/Sewai"],
  ["Wednesday", "Roti, Daal, Chawal, Paneer, Chicken/Fish, Bhujiya, Salad", "Roti, Aalu Bhindi, Sweet Chatni"],
  ["Thursday",  "Roti, Daal, Chawal, Lauki, Green Veg Bhujiya", "Roti, Chili Soya"],
  ["Friday",    "Roti, Daal, Chawal, Egg/Dahi, Aalu Bhujiya", "Roti, Seasonal Veg Sabji"],
  ["Saturday",  "Veg Khichdi, Chatni, Papad, Chokha", "Puri, Kabuli Chana, Sewai/Kheer"]
];
/* ============================================ */

/* Open index.html?demo to see the site filled with SAMPLE data (nothing is saved or sent). */
const DEMO = new URLSearchParams(location.search).has('demo');
const API  = DEMO ? '' : SHEET_API_URL;
const KEY  = 'rpfBarrackMessV3';

const emptyDB = () => ({barrack:{staff:[],officers:[]},mess:[],menu:[],purchases:[],changes:[],feedback:[]});

function seedDefaultMenu(d, startId=1){
  let id = startId;
 // const bf = ['Poha / Upma, Tea','Paratha, Curd, Tea','Idli Sambar, Tea','Puri Sabzi, Tea','Aloo Paratha, Tea','Chole Bhature, Tea','Bread Omlette / Poha, Tea'];
  DEFAULT_MENU.forEach(([day, lunch, dinner], i) => {
    //d.menu.push({id:id++, day, meal:'Breakfast', items: bf[i] || 'Tea, Bread'});
    d.menu.push({id:id++, day, meal:'Lunch',     items: lunch});
    d.menu.push({id:id++, day, meal:'Dinner',    items: dinner});
  });
  return id;
}

function makeSample(){
  const d=emptyDB(); let id=1;
  [[1,'Constable','Rajesh Kumar'],[2,'Constable','Sunil Mondal'],[3,'Head Constable','Amit Singh'],[4,'Constable','Pradip Das'],
   [5,'Constable','Vikram Yadav'],[7,'ASI','Manoj Sharma'],[8,'Head Constable','Subrata Roy'],[10,'Constable','Deepak Verma'],
   [11,'ASI','Ashok Prasad'],[12,'Constable','Kunal Ghosh']].forEach(([bed,rank,name])=>d.barrack.staff.push({id:id++,bed,rank,name}));
  [[1,'Inspector','A. K. Sinha'],[2,'Sub-Inspector','R. N. Banerjee'],[4,'Sub-Inspector','S. Mishra']]
    .forEach(([bed,rank,name])=>d.barrack.officers.push({id:id++,bed,rank,name}));
  [['Constable','Rajesh Kumar',3200,2000],['Constable','Sunil Mondal',3100,2000],['Head Constable','Amit Singh',3400,2500],
   ['Constable','Pradip Das',0,2000],['ASI','Manoj Sharma',3600,3000],['Inspector','A. K. Sinha',4200,3000]]
    .forEach(([rank,name,bill,deposit])=>d.mess.push({id:id++,rank,name,bill,deposit}));
  id = seedDefaultMenu(d, id);
  [[0,'Rice',25,'kg',54],[0,'Atta',20,'kg',38],[0,'Tomato',8,'kg',40],[0,'Cooking Oil',10,'litre',130],
   [-1,'Arhar Dal',15,'kg',120],[-1,'Potato',30,'kg',22],[-2,'Milk',20,'litre',56],[-2,'Onion',15,'kg',30],[-3,'Sugar',10,'kg',44]]
    .forEach(([o,item,qty,unit,rate])=>d.purchases.push({id:id++,date:todayStr(o),item,qty,unit,rate,amount:Math.round(qty*rate*100)/100}));
  d.changes.push({id:id++,date:todayStr(-1),oldItem:'Arhar Dal',newItem:'Moong Dal',reason:'Arhar dal not available in market'},
                 {id:id++,date:todayStr(-4),oldItem:'Cabbage',newItem:'Cauliflower',reason:'Cabbage rate too high'});
  d.feedback.push({id:'f1',date:todayStr(-2),rank:'Constable',name:'Rajesh Kumar',rating:5,comment:'Food was fresh and hot. Good service.'},
                  {id:'f2',date:todayStr(-1),rank:'ASI',name:'Manoj Sharma',rating:4,comment:'Please add more vegetables in dinner.'},
                  {id:'f3',date:todayStr(),rank:'',name:'',rating:3,comment:'Tea was a little cold in the morning.'});
  return d;
}

let editUnlocked=false, editPinValue="", cloudOn=false, sheetReady=false;
let db = load();

/* ---------- storage ---------- */
function load(){
  if(DEMO) return makeSample();
  // When Google Sheet is connected, never use localStorage – pure public data from sheet
  if(API){
    const d = emptyDB();
    seedDefaultMenu(d);
    return d;
  }
  // Offline / no-sheet mode only
  try{
    const s=JSON.parse(localStorage.getItem(KEY)||'null');
    if(s&&s.barrack&&s.mess){
      const dbx = Object.assign(emptyDB(),s);
      if(!dbx.menu || !dbx.menu.length) seedDefaultMenu(dbx);
      return dbx;
    }
  }catch(e){}
  const d = emptyDB();
  seedDefaultMenu(d);
  return d;
}
function persist(){
  // Only write to localStorage when there is no Google Sheet backend
  if(!DEMO && !API) localStorage.setItem(KEY,JSON.stringify(db));
}

function toSheet(){   // app data -> flat rows that become spreadsheet rows (feedback is handled separately)
  const barrack=[];
  Object.keys(SECTIONS).forEach(k=>db.barrack[k].forEach(p=>barrack.push({section:k==='staff'?'Staff':'Officers',bed:p.bed,rank:p.rank,name:p.name})));
  return {
    barrack,
    mess:      db.mess.map(m=>({rank:m.rank,name:m.name,bill:m.bill,deposit:m.deposit})),
    menu:      db.menu.map(m=>({day:m.day,meal:m.meal,items:m.items})),
    purchases: db.purchases.map(p=>({date:p.date,item:p.item,qty:p.qty,unit:p.unit,rate:p.rate,amount:p.amount})),
    changes:   db.changes.map(c=>({date:c.date,oldItem:c.oldItem,newItem:c.newItem,reason:c.reason}))
  };
}
function fromSheet(d){ // spreadsheet rows -> app data
  const out=emptyDB(); let i=0; const nid=()=>Date.now()+(i++);
  (d.barrack||[]).forEach(r=>{
    const k=String(r.section).toLowerCase().startsWith('off')?'officers':'staff';
    out.barrack[k].push({id:nid(),bed:Number(r.bed),rank:String(r.rank||''),name:String(r.name||'')});
  });
  (d.mess||[]).forEach(r=>out.mess.push({id:nid(),rank:String(r.rank||''),name:String(r.name||''),bill:Number(r.bill)||0,deposit:Number(r.deposit)||0}));
  (d.menu||[]).forEach(r=>out.menu.push({id:nid(),day:String(r.day),meal:String(r.meal),items:String(r.items||'')}));
  (d.purchases||[]).forEach(r=>out.purchases.push({id:nid(),date:String(r.date||''),item:String(r.item||''),qty:Number(r.qty)||0,unit:String(r.unit||''),rate:Number(r.rate)||0,amount:Number(r.amount)||0}));
  (d.changes||[]).forEach(r=>out.changes.push({id:nid(),date:String(r.date||''),oldItem:String(r.oldItem||''),newItem:String(r.newItem||''),reason:String(r.reason||'')}));
  (d.feedback||[]).forEach(r=>out.feedback.push({id:String(r.id),date:String(r.date||''),rank:String(r.rank||''),name:String(r.name||''),rating:Number(r.rating)||0,comment:String(r.comment||'')}));
  return out;
}
const post = body => fetch(API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(body)}).then(r=>r.json());
async function save(){
  render();
  if(!API){ persist(); return; }
  try{
    const j=await post({action:'saveAll',payload:JSON.stringify(toSheet()),pin:editPinValue});
    if(!j.ok) throw new Error(j.error);
    setSync('Saved to Google Sheet ✓',true);
  }catch(err){console.error(err);setSync('Sheet sync failed – changes not saved',false); alert('Could not save to Google Sheet. Check your internet / PIN and try again.');}
}
async function loadCloud(){
  if(!API) return;
  try{
    const r=await fetch(API+'?action=getAll'); const j=await r.json();
    if(j&&j.ok&&j.data){
      db=fromSheet(j.data);
      if(!db.menu || !db.menu.length) seedDefaultMenu(db);
      sheetReady=true;setSync('Live from Google Sheet',true);
    }
  }catch(err){console.warn(err);setSync('Sheet unavailable – check internet / URL',false);}
}
function setSync(t,ok){cloudOn=ok;$('syncStatus').textContent=t;}
if(API) setSync('Connecting to Google Sheet…',false);

/* ---------- calculations ---------- */
const occupiedCount = k => db.barrack[k].length;
const vacantCount   = k => SECTIONS[k].beds - db.barrack[k].length;
const sumOf = (arr,f) => arr.reduce((s,x)=>s+Number(x[f]||0),0);

/* ---------- render: barrack ---------- */
function renderBarrack(){
  const total=SECTIONS.staff.beds+SECTIONS.officers.beds, occ=occupiedCount('staff')+occupiedCount('officers');
  $('sTotal').textContent=total; $('sOccupied').textContent=occ; $('sVacant').textContent=total-occ;
  Object.keys(SECTIONS).forEach(k=>{
    $(k+'Info').textContent=`${SECTIONS[k].beds} beds · ${occupiedCount(k)} occupied · ${vacantCount(k)} vacant`;
    $('grid-'+k).innerHTML=Array.from({length:SECTIONS[k].beds},(_,i)=>{
      const o=db.barrack[k].find(x=>x.bed===i+1);
      return `<div class="bed ${o?'occupied':''}" title="${o?esc(o.rank+' '+o.name):'Vacant'}"><b>${i+1}</b><small>${o?esc(o.name):'Vacant'}</small></div>`;
    }).join('');
    $('rows-'+k).innerHTML=[...db.barrack[k]].sort((a,b)=>a.bed-b.bed).map(p=>
      `<tr><td><b>${p.bed}</b></td><td>${esc(p.rank)}</td><td>${esc(p.name)}</td><td class="edit-only"><button class="btn-sm" onclick="editBed('${k}',${p.id})">Edit</button> <button class="btn-sm" onclick="vacateBed('${k}',${p.id})">Vacate</button></td></tr>`
    ).join('')||`<tr><td colspan="4" class="empty">All beds vacant</td></tr>`;
  });
}

/* ---------- render: mess ---------- */
function renderAccounts(){
  const q=($('messSearch').value||'').toLowerCase();
  $('mCount').textContent=db.mess.length; $('mBill').textContent=money(sumOf(db.mess,'bill')); $('mDeposit').textContent=money(sumOf(db.mess,'deposit'));
  $('fBill').textContent=money(sumOf(db.mess,'bill')); $('fDeposit').textContent=money(sumOf(db.mess,'deposit'));
  $('messRows').innerHTML=db.mess.filter(m=>(m.name+' '+m.rank).toLowerCase().includes(q)).map(m=>
    `<tr><td>${esc(m.rank)}</td><td>${esc(m.name)}</td><td class="num ${m.bill>0?'due':''}">${money(m.bill)}</td><td class="num dep">${money(m.deposit)}</td><td class="edit-only"><button class="btn-sm" onclick="editMess(${m.id})">Edit</button> <button class="btn-sm" onclick="deleteMess(${m.id})">Delete</button></td></tr>`
  ).join('')||`<tr><td colspan="5" class="empty">No members found</td></tr>`;
}

const menuItems = (d,m) => (db.menu.find(x=>x.day===d&&x.meal===m)||{}).items||'';
function renderMenu(){
  const today = new Date().toLocaleDateString('en-IN',{weekday:'long'});
  const lunch = menuItems(today,'Lunch');
  const dinner = menuItems(today,'Dinner');
 // const breakfast = menuItems(today,'Breakfast');
  $('menuToday').innerHTML = `
    <article class="card accent"><span>Today · ${today}</span><strong class="small">${esc(lunch||'Not set')}</strong><em style="display:block;margin-top:6px;font-size:12px;opacity:.9">Lunch</em></article>
    <article class="card"><span>Dinner · ${today}</span><strong class="small">${esc(dinner||'Not set')}</strong></article>
   `;
  $('menuRows').innerHTML = DAYS.map(d=>`<tr class="${d===today?'today':''}"><td><b>${d}${d===today?' · TODAY':''}</b></td>`+MEALS.map(m=>{
    const t = menuItems(d,m);
    return `<td>${t?esc(t):'<span class="muted">—</span>'} <button class="btn-sm edit-only" onclick="editMenu('${d}','${m}')">Edit</button></td>`;
  }).join('')+'</tr>').join('');
}

function renderPurchase(){
  const q=($('purSearch').value||'').toLowerCase(), t=todayStr(), mo=t.slice(0,7);
  $('pToday').textContent=moneyP(sumOf(db.purchases.filter(p=>p.date===t),'amount'));
  $('pMonth').textContent=moneyP(sumOf(db.purchases.filter(p=>String(p.date).startsWith(mo)),'amount'));
  $('pCount').textContent=db.purchases.length;
  $('itemList').innerHTML=[...new Set(db.purchases.map(p=>p.item))].map(i=>`<option value="${esc(i)}">`).join('');
  const rows=db.purchases.filter(p=>(p.item+' '+fmtDate(p.date)+' '+p.date).toLowerCase().includes(q))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id);
  $('pTotal').textContent=moneyP(sumOf(rows,'amount'));
  $('purRows').innerHTML=rows.map(p=>
    `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.item)}</td><td class="num">${esc(p.qty)} ${esc(p.unit)}</td><td class="num">${moneyP(p.rate)}</td><td class="num dep">${moneyP(p.amount)}</td><td class="edit-only"><button class="btn-sm" onclick="editPur(${p.id})">Edit</button> <button class="btn-sm" onclick="deletePur(${p.id})">Delete</button></td></tr>`
  ).join('')||`<tr><td colspan="6" class="empty">No purchases recorded</td></tr>`;
}

function renderChanges(){
  $('chgRows').innerHTML=[...db.changes].sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id).map(c=>
    `<tr><td>${fmtDate(c.date)}</td><td>${esc(c.oldItem)}</td><td><b>${esc(c.newItem)}</b></td><td>${esc(c.reason)}</td><td class="edit-only"><button class="btn-sm" onclick="editChg(${c.id})">Edit</button> <button class="btn-sm" onclick="deleteChg(${c.id})">Delete</button></td></tr>`
  ).join('')||`<tr><td colspan="5" class="empty">No item changes recorded</td></tr>`;
}

function renderFeedback(){
  const f=db.feedback, rt=x=>Math.min(5,Math.max(0,Math.round(Number(x.rating)||0)));
  $('fCount').textContent=f.length;
  $('fAvg').textContent=f.length?(f.reduce((s,x)=>s+rt(x),0)/f.length).toFixed(1)+' ★':'–';
  $('fbList').innerHTML=[...f].reverse().map(x=>
    `<article class="fb"><div class="fb-top"><span class="stars">${'★'.repeat(rt(x))}${'☆'.repeat(5-rt(x))}</span><span class="muted">${fmtDate(x.date)}</span><button class="btn-sm edit-only" onclick="deleteFb('${esc(x.id)}')">Delete</button></div><p>${esc(x.comment)}</p><small>${esc(x.name||'Anonymous')}${x.rank?' · '+esc(x.rank):''}</small></article>`
  ).join('')||'<p class="empty">No feedback yet</p>';
}

function render(){renderBarrack();renderAccounts();renderMenu();renderPurchase();renderChanges();renderFeedback();}

/* ---------- mode + tabs ---------- */
function setMode(mode){
  const barrack=mode==='barrack';
  $('barrackView').hidden=!barrack; $('messView').hidden=barrack;
  $('barrackModeBtn').classList.toggle('active',barrack); $('messModeBtn').classList.toggle('active',!barrack);
  document.body.classList.toggle('barrack-mode',barrack); document.body.classList.toggle('mess-mode',!barrack);
  $('pageTitle').textContent=barrack?'RPF Grainshop Barrack':'RPF Grainshop Mess';
  $('pageSub').textContent=barrack?'Bed occupancy':'Accounts · Menu · Purchase · Feedback';
  document.title=barrack?'RPF Grainshop Barrack':'RPF Grainshop Mess';
}
function setTab(name){
  document.querySelectorAll('.tabpane').forEach(p=>p.hidden=p.id!=='tab-'+name);
  document.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
}
$('barrackModeBtn').onclick=()=>setMode('barrack');
$('messModeBtn').onclick=()=>setMode('mess');
document.querySelectorAll('.subtab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('messSearch').oninput=renderAccounts;
$('purSearch').oninput=renderPurchase;

/* ---------- modal ---------- */
function openModal(title,fields,onSave){
  $('modalTitle').textContent=title; const f=$('modalForm');
  f.innerHTML=fields.map(x=>{
    const req=x.optional?'':'required'; let inp;
    if(x.options) inp=`<select name="${x.name}">${x.options.map(o=>`<option ${o==x.value?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
    else if(x.type==='textarea') inp=`<textarea name="${x.name}" rows="3" maxlength="300" ${req}>${esc(x.value??'')}</textarea>`;
    else inp=`<input name="${x.name}" type="${x.type||'text'}" value="${esc(x.value??'')}" ${x.list?`list="${x.list}"`:''} ${x.min!==undefined?`min="${x.min}"`:''} ${x.step?`step="${x.step}"`:''} ${req}>`;
    return `<label>${x.label}${inp}</label>`;
  }).join('')+'<button class="btn-primary">Save</button>';
  f.onsubmit=e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(f)));$('modalBackdrop').classList.remove('open');save();};
  $('modalBackdrop').classList.add('open');
}
$('modalClose').onclick=()=>$('modalBackdrop').classList.remove('open');
$('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))$('modalBackdrop').classList.remove('open')};

/* ---------- barrack input: bed no + rank + name ---------- */
document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>{
  const k=btn.dataset.add;
  const free=Array.from({length:SECTIONS[k].beds},(_,i)=>i+1).filter(n=>!db.barrack[k].some(o=>o.bed===n));
  if(!free.length) return alert('No vacant beds in '+SECTIONS[k].title+'.');
  openModal('Allot bed · '+SECTIONS[k].title,[
    {label:'Bed number (vacant only)',name:'bed',options:free.map(String)},
    {label:'Rank',name:'rank',list:'rankList'},{label:'Name',name:'name'}
  ],v=>db.barrack[k].push({id:Date.now(),bed:+v.bed,rank:v.rank.trim(),name:v.name.trim()}));
});
window.editBed=(k,id)=>{const p=db.barrack[k].find(x=>x.id===id);
  openModal('Edit bed '+p.bed,[{label:'Rank',name:'rank',list:'rankList',value:p.rank},{label:'Name',name:'name',value:p.name}],
    v=>Object.assign(p,{rank:v.rank.trim(),name:v.name.trim()}));};
window.vacateBed=(k,id)=>{const p=db.barrack[k].find(x=>x.id===id);
  if(confirm(`Vacate bed ${p.bed} (${p.rank} ${p.name})?`)){db.barrack[k]=db.barrack[k].filter(x=>x.id!==id);save();}};

/* ---------- mess accounts input ---------- */
const messFields=(m={})=>[
  {label:'Rank',name:'rank',list:'rankList',value:m.rank},{label:'Name',name:'name',value:m.name},
  {label:'Bill to be paid (₹)',name:'bill',type:'number',min:0,step:'0.01',value:m.bill},
  {label:'Security deposit (₹)',name:'deposit',type:'number',min:0,step:'0.01',value:m.deposit}
];
$('addMessBtn').onclick=()=>openModal('Add mess member',messFields(),
  v=>db.mess.push({id:Date.now(),rank:v.rank.trim(),name:v.name.trim(),bill:+v.bill,deposit:+v.deposit}));
window.editMess=id=>{const m=db.mess.find(x=>x.id===id);
  openModal('Edit '+m.name,messFields(m),v=>Object.assign(m,{rank:v.rank.trim(),name:v.name.trim(),bill:+v.bill,deposit:+v.deposit}));};
window.deleteMess=id=>{const m=db.mess.find(x=>x.id===id);
  if(confirm(`Remove ${m.rank} ${m.name} from the mess register?`)){db.mess=db.mess.filter(x=>x.id!==id);save();}};

/* ---------- menu input ---------- */
window.editMenu=(day,meal)=>openModal(`${day} · ${meal}`,
  [{label:'Items (leave empty to clear)',name:'items',type:'textarea',value:menuItems(day,meal),optional:true}],
  v=>{const t=v.items.trim(); db.menu=db.menu.filter(x=>!(x.day===day&&x.meal===meal)); if(t) db.menu.push({id:Date.now(),day,meal,items:t});});

/* ---------- daily purchase input ---------- */
const purFields=(p={})=>[
  {label:'Date',name:'date',type:'date',value:p.date||todayStr()},
  {label:'Item',name:'item',list:'itemList',value:p.item},
  {label:'Quantity',name:'qty',type:'number',min:0,step:'0.01',value:p.qty},
  {label:'Unit',name:'unit',options:UNITS,value:p.unit||'kg'},
  {label:'Rate per unit (₹)',name:'rate',type:'number',min:0,step:'0.01',value:p.rate}
];
const purRec=v=>({date:v.date,item:v.item.trim(),qty:+v.qty,unit:v.unit,rate:+v.rate,amount:Math.round(+v.qty*+v.rate*100)/100});
$('addPurBtn').onclick=()=>openModal('Add purchase',purFields(),v=>db.purchases.push({id:Date.now(),...purRec(v)}));
window.editPur=id=>{const p=db.purchases.find(x=>x.id===id);openModal('Edit purchase',purFields(p),v=>Object.assign(p,purRec(v)));};
window.deletePur=id=>{const p=db.purchases.find(x=>x.id===id);
  if(confirm(`Delete purchase of ${p.item} (${fmtDate(p.date)})?`)){db.purchases=db.purchases.filter(x=>x.id!==id);save();}};

/* ---------- item change input ---------- */
const chgFields=(c={})=>[
  {label:'Date',name:'date',type:'date',value:c.date||todayStr()},
  {label:'Old item',name:'oldItem',list:'itemList',value:c.oldItem},
  {label:'New item',name:'newItem',list:'itemList',value:c.newItem},
  {label:'Reason (optional)',name:'reason',value:c.reason,optional:true}
];
const chgRec=v=>({date:v.date,oldItem:v.oldItem.trim(),newItem:v.newItem.trim(),reason:(v.reason||'').trim()});
$('addChgBtn').onclick=()=>openModal('Add item change',chgFields(),v=>db.changes.push({id:Date.now(),...chgRec(v)}));
window.editChg=id=>{const c=db.changes.find(x=>x.id===id);openModal('Edit item change',chgFields(c),v=>Object.assign(c,chgRec(v)));};
window.deleteChg=id=>{const c=db.changes.find(x=>x.id===id);
  if(confirm(`Delete change ${c.oldItem} → ${c.newItem}?`)){db.changes=db.changes.filter(x=>x.id!==id);save();}};

/* ---------- feedback (anyone can send; only editors can delete) ---------- */
let starRating = 0;
const starsEl = $('stars');
if(starsEl){
  starsEl.onclick = e => {
    const rect = starsEl.getBoundingClientRect();
    const n = Math.max(1, Math.min(5, Math.ceil((e.clientX - rect.left) / (rect.width / 5))));
    starRating = n;
    $('rating').value = n;
    starsEl.textContent = '★★★★★'.slice(0,n) + '☆'.repeat(5-n);
    starsEl.style.color = '#f4b400';
    starsEl.title = n + ' / 5';
  };
}
$('fbForm').onsubmit=async e=>{
  e.preventDefault();
  const v=Object.fromEntries(new FormData(e.target)), btn=$('fbSend'), msg=$('fbMsg');
  const rec={name:v.name.trim(),rank:v.rank.trim(),rating:+v.rating||starRating,comment:v.comment.trim()};
  if(!rec.rating){ if(msg){msg.textContent='Please select a rating.'; msg.style.color='#b42318';} else alert('Please select a rating.'); return; }
  if(!rec.comment) return;
  btn.disabled=true;
  if(msg) msg.textContent='';
  try{
    if(API){const j=await post({action:'addFeedback',...rec}); if(!j.ok) throw new Error(j.error); db.feedback.push(j.row); setSync('Feedback sent ✓',true);}
    else { db.feedback.push({id:String(Date.now()),date:todayStr(),...rec}); persist(); }
    e.target.reset(); starRating=0; if(starsEl){starsEl.textContent='★★★★★'; starsEl.style.color='#a9b1bb';} renderFeedback();
    if(msg){msg.textContent='Feedback submitted. Thank you!'; msg.style.color='#16733a';}
  }catch(err){ if(msg){msg.textContent='Could not send: '+(err.message||'try again'); msg.style.color='#b42318';} else alert('Could not send feedback: '+(err.message||'please try again')); }
  btn.disabled=false;
};
if($('shareBtn')) $('shareBtn').onclick = () => {
  const t = "RPF Mess Management – Weekly Menu & Feedback";
  const u = location.href;
  if(navigator.share) navigator.share({title:t, text:t, url:u}).catch(()=>{});
  else window.open("https://wa.me/?text=" + encodeURIComponent(t + " " + u));
};
window.deleteFb=async id=>{
  if(!confirm('Delete this feedback?')) return;
  try{
    if(API){const j=await post({action:'deleteFeedback',id,pin:editPinValue}); if(!j.ok) throw new Error(j.error);}
    db.feedback=db.feedback.filter(x=>String(x.id)!==String(id));
    if(!API) persist();
    renderFeedback();
  }catch(err){alert('Could not delete: '+(err.message||'try again'));}
};

/* ---------- edit lock ---------- */
function updateEditUI(){
  document.body.classList.toggle('edit-unlocked',editUnlocked);
  $('editStatus').textContent=editUnlocked?'Edit mode enabled':'View only';
  $('editToggle').textContent=editUnlocked?'Lock editing':'Edit (PIN)';
}
$('editToggle').onclick=async()=>{
  if(editUnlocked){editUnlocked=false;updateEditUI();return;}
  if(API && !sheetReady){await loadCloud();render();if(!sheetReady) return alert('Google Sheet could not be reached, so editing is disabled to protect your data. Check SHEET_API_URL / internet and reload.');}
  const pin=prompt('Enter edit PIN:'); if(pin===null) return;
  if(API){
    try{const j=await post({action:'verifyPin',pin}); if(j&&j.ok){editPinValue=pin;editUnlocked=true;updateEditUI();} else alert('Incorrect PIN.');}
    catch(e){alert('Could not verify PIN. Try again.');}
  }else if(pin===EDIT_PIN){editPinValue=pin;editUnlocked=true;updateEditUI();}
  else alert('Incorrect PIN.');
};

/* ---------- dynamic nature background ---------- */
let usable=[], bgIndex=0, activeLayer=0;
const layers=[$('bgA'),$('bgB')];
function showBackground(i){
  if(!usable.length) return;
  const next=layers[1-activeLayer], cur=layers[activeLayer];
  next.style.backgroundImage=`url("${usable[i%usable.length]}")`;
  next.classList.add('show'); cur.classList.remove('show');
  activeLayer=1-activeLayer;
}
window.rotatePhoto=()=>{bgIndex=(bgIndex+1)%usable.length;showBackground(bgIndex);};
BACKGROUNDS.forEach(src=>{const im=new Image();
  im.onload=()=>{usable.push(src);if(usable.length===1)showBackground(0);};
  im.src=src;});
setInterval(()=>{if(usable.length>1)window.rotatePhoto();},BG_INTERVAL);

/* ---------- start ---------- */
setMode('barrack'); updateEditUI();
if(DEMO){editUnlocked=true;updateEditUI();setSync('DEMO · sample data, nothing is saved',false);}
(async()=>{await loadCloud();render();})();
// pick up rows typed directly into the sheet (every 30 s, never while a form is open)
setInterval(async()=>{
  if(!API||$('modalBackdrop').classList.contains('open')) return;
  await loadCloud();render();
},30000);
