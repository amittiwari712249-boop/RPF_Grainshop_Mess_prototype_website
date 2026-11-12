/**
 * RPF Barrack & Mess - Google Sheets backend
 * Tabs created by setup():
 *   Barrack     : Section | Bed No | Rank | Name
 *   Mess        : Rank | Name | Bill to be paid | Security Deposit
 *   Menu        : Day | Meal | Items
 *   Purchase    : Date | Item | Quantity | Unit | Rate | Amount
 *   ItemChange  : Date | Old Item | New Item | Reason
 *   Feedback    : ID | Date | Rank | Name | Rating | Comment
 * Deploy as Web App: Execute as Me, access: Anyone.
 * Set Script Property EDIT_PIN, then run setup() once.
 */
const HEADERS = {
  Barrack:    ['Section','Bed No','Rank','Name'],
  Mess:       ['Rank','Name','Bill to be paid','Security Deposit'],
  Menu:       ['Day','Meal','Items'],
  Purchase:   ['Date','Item','Quantity','Unit','Rate','Amount'],
  ItemChange: ['Date','Old Item','New Item','Reason'],
  Feedback:   ['ID','Date','Rank','Name','Rating','Comment'],
  Notices:    ['Date','Title','Message','Active','Urgent']
};
// column (0-based) that must be non-empty for a row to count
const KEY_COL = { Barrack:1, Mess:1, Menu:0, Purchase:1, ItemChange:2, Feedback:0, Notices:1 };

function setup(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(n=>{
    const sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if(sh.getLastRow()===0) sh.getRange(1,1,1,HEADERS[n].length).setValues([HEADERS[n]]);
    sh.setFrozenRows(1);
  });
  // keep feedback id/date as plain text so Sheets never converts them
  ss.getSheetByName('Feedback').getRange('A:B').setNumberFormat('@');
  if(!PropertiesService.getScriptProperties().getProperty('EDIT_PIN'))
    throw new Error('Set Script Property EDIT_PIN, then run setup again.');
}

function doGet(e){
  try{ return json_({ok:true,data:readAll_()}); }
  catch(err){ return json_({ok:false,error:String(err)}); }
}

function doPost(e){
  const p = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  try{
    lock.waitLock(20000);
    // open to everyone (no PIN): visitors can leave feedback
    if(p.action==='addFeedback') return json_(addFeedback_(p));

    const expected = PropertiesService.getScriptProperties().getProperty('EDIT_PIN');
    if(!expected || p.pin !== expected) return json_({ok:false,error:'Unauthorized'});
    if(p.action==='verifyPin') return json_({ok:true});
    if(p.action==='saveAll'){ writeAll_(JSON.parse(p.payload||'{}')); return json_({ok:true}); }
    if(p.action==='deleteFeedback') return json_(deleteFeedback_(p.id));
    return json_({ok:false,error:'Unknown action'});
  }catch(err){ return json_({ok:false,error:String(err)}); }
  finally{ try{ lock.releaseLock(); }catch(_){} }
}

/* ---------- reading ---------- */
function cell_(v){
  if(v instanceof Date) return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return v;
}
function rows_(name){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if(!sh || sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,HEADERS[name].length).getValues()
           .filter(r => String(r[KEY_COL[name]]).trim()!=='')
           .map(r => r.map(cell_));
}
function readAll_(){
  return {
    barrack:   rows_('Barrack').map(r=>({section:r[0],bed:r[1],rank:r[2],name:r[3]})),
    mess:      rows_('Mess').map(r=>({rank:r[0],name:r[1],bill:r[2],deposit:r[3]})),
    menu:      rows_('Menu').map(r=>({day:r[0],meal:r[1],items:r[2]})),
    purchases: rows_('Purchase').map(r=>({date:r[0],item:r[1],qty:r[2],unit:r[3],rate:r[4],amount:r[5]})),
    changes:   rows_('ItemChange').map(r=>({date:r[0],oldItem:r[1],newItem:r[2],reason:r[3]})),
    feedback:  rows_('Feedback').map(r=>({id:r[0],date:r[1],rank:r[2],name:r[3],rating:r[4],comment:r[5]})),
    notices:   rows_('Notices').map(r=>({date:r[0],title:r[1],message:r[2],active:r[3],urgent:r[4]}))
  };
}

/* ---------- writing (PIN protected) ---------- */
function writeSheet_(name, values){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
  if(values.length) sh.getRange(2,1,values.length,HEADERS[name].length).setValues(values);
  sh.setFrozenRows(1);
}
function writeAll_(d){
  const barrack = (d.barrack||[]).slice().sort((a,b)=> a.section===b.section ? a.bed-b.bed : (a.section<b.section?1:-1))
                    .map(r=>[r.section,r.bed,r.rank,r.name]);
  writeSheet_('Barrack',    barrack);
  writeSheet_('Mess',       (d.mess||[]).map(r=>[r.rank,r.name,r.bill,r.deposit]));
  writeSheet_('Menu',       (d.menu||[]).map(r=>[r.day,r.meal,r.items]));
  writeSheet_('Purchase',   (d.purchases||[]).map(r=>[r.date,r.item,r.qty,r.unit,r.rate,r.amount]));
  writeSheet_('ItemChange', (d.changes||[]).map(r=>[r.date,r.oldItem,r.newItem,r.reason]));
  // Feedback is NOT rewritten here, so feedback sent by visitors is never lost.
}

/* ---------- feedback ---------- */
function addFeedback_(p){
  const comment = String(p.comment||'').trim().slice(0,300);
  const name    = String(p.name||'').trim().slice(0,60);
  const rank    = String(p.rank||'').trim().slice(0,40);
  const rating  = Math.round(Number(p.rating));
  if(!comment) return {ok:false,error:'Comment is required'};
  if(!(rating>=1 && rating<=5)) return {ok:false,error:'Rating must be 1 to 5'};
  const cache = CacheService.getScriptCache();
  if(cache.get('fb_recent')) return {ok:false,error:'Please wait a few seconds and try again'};
  cache.put('fb_recent','1',5);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Feedback') || ss.insertSheet('Feedback');
  if(sh.getLastRow()===0) sh.getRange(1,1,1,6).setValues([HEADERS.Feedback]);
  if(sh.getLastRow()>5000) return {ok:false,error:'Feedback box is full'};
  const row = {
    id: String(new Date().getTime()),
    date: Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd'),
    rank: rank, name: name, rating: rating, comment: comment
  };
  const r = sh.getLastRow()+1;
  sh.getRange(r,1,1,6).setNumberFormat('@');          // plain text: stops "=..." being run as a formula
  sh.getRange(r,1,1,6).setValues([[row.id,row.date,row.rank,row.name,row.rating,row.comment]]);
  return {ok:true,row:row};
}
function deleteFeedback_(id){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feedback');
  if(!sh || sh.getLastRow()<2) return {ok:true};
  const ids = sh.getRange(2,1,sh.getLastRow()-1,1).getValues();
  for(let i=ids.length-1;i>=0;i--) if(String(ids[i][0])===String(id)){ sh.deleteRow(i+2); break; }
  return {ok:true};
}

function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
