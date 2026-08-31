import { supabase } from './supabase.js';

const TARGETS = new Map();
const sessions = new Map();
const SUITS = ['♠','♥','♦','♣'];

function clean(v=''){ return v.trim(); }
function roomInfo(root){
  const head = root.querySelector('.shared-room-head');
  const p = head?.querySelector('p')?.textContent || '';
  const m = p.match(/Room\s+([A-Z0-9]+)/i);
  const code = m?.[1]?.toUpperCase();
  const title = root.querySelector('.arena-top h2')?.textContent?.trim() || '';
  const names = [...root.querySelectorAll('.arena-player strong')].map(x=>clean(x.textContent));
  const max = Number((p.match(/(\d+)\s*\/\s*(\d+)/)||[])[2]) || names.length || 2;
  return code ? {code,title,names,max} : null;
}
function gameKey(title){
  const t=title.toLowerCase();
  if(t.includes('whot')) return 'whot';
  if(t.includes('snooker') || t.includes('baize')) return 'snooker';
  return 'dice';
}
function esc(v=''){return String(v).replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[s]));}
function style(){
  if(document.getElementById('betsquad-live-style')) return;
  const s=document.createElement('style'); s.id='betsquad-live-style'; s.textContent=`
  .live-game{padding:18px;border-radius:22px;background:linear-gradient(145deg,#0b1220,#111827);color:#eef2ff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
  .live-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.live-head h3{margin:2px 0;font-size:20px}.live-pill2{font-size:11px;font-weight:800;padding:7px 10px;border-radius:999px;background:#16a34a;color:white}.turn-box{padding:10px 12px;border-radius:12px;background:#1e293b;margin-bottom:14px}.turn-box b{color:#fbbf24}.players-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin:12px 0}.gp{padding:11px;border-radius:14px;background:#172033;border:1px solid #334155}.gp.me{border-color:#22c55e}.gp small{display:block;color:#94a3b8;margin-top:3px}.gp .score{font-size:18px;font-weight:900;margin-top:5px}.live-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.live-actions button{border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;background:#2563eb;color:white}.live-actions button.secondary{background:#334155}.live-actions button:disabled{opacity:.45;cursor:not-allowed}.cards{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0}.cardx{width:58px;height:78px;border-radius:10px;background:#fff;color:#111827;border:2px solid #cbd5e1;font-weight:900;font-size:17px;cursor:pointer}.cardx.red{color:#dc2626}.cardx.disabled{opacity:.35;cursor:not-allowed}.top-card{width:72px;height:96px;margin:0 auto;display:flex;align-items:center;justify-content:center;border-radius:12px;background:white;color:#111827;font-weight:900;font-size:22px}.dice-face{font-size:76px;text-align:center;padding:10px}.snooker-table{position:relative;height:210px;border-radius:28px;background:#075e3a;border:13px solid #7c4a22;box-shadow:inset 0 0 0 2px #0f3d2b;margin:12px 0}.pocket{position:absolute;width:25px;height:25px;background:#020617;border-radius:50%}.p1{left:-7px;top:-7px}.p2{right:-7px;top:-7px}.p3{left:-7px;bottom:-7px}.p4{right:-7px;bottom:-7px}.cueball{position:absolute;left:22%;top:50%;width:20px;height:20px;background:#fff;border-radius:50%;transform:translateY(-50%)}.targetball{position:absolute;right:25%;top:50%;width:24px;height:24px;background:#ef4444;border-radius:50%;transform:translateY(-50%)}.power{width:100%}.result{padding:11px;border-radius:12px;background:#0f172a;margin-top:10px;color:#cbd5e1}.winner{padding:12px;border-radius:14px;background:linear-gradient(90deg,#14532d,#1e293b);border:1px solid #22c55e;margin-top:12px}.wait{padding:18px;text-align:center;color:#cbd5e1}`; document.head.appendChild(s);
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeWhot(count){
 const deck=[]; for(let s=0;s<4;s++) for(let n=1;n<=10;n++) deck.push({s,n}); shuffle(deck);
 const hands=Array.from({length:count},()=>[]); for(let r=0;r<5;r++) for(let i=0;i<count;i++) hands[i].push(deck.pop());
 return {type:'whot',deck,discard:[deck.pop()],hands,turn:0,winners:[],done:false,version:1,last:'Game started. Play a card matching the suit or number.'};
}
function makeDice(count){return {type:'dice',scores:Array(count).fill(0),turn:0,winners:[],done:false,version:1,last:'Roll the dice when it is your turn.'};}
function makeSnooker(count){return {type:'snooker',scores:Array(count).fill(0),turn:0,winners:[],done:false,version:1,last:'Choose shot power from 1–100.'};}
function initial(type,count){return type==='whot'?makeWhot(count):type==='snooker'?makeSnooker(count):makeDice(count);}
function winnerTarget(count){return count===2?1:2;}

async function startSession(root,info){
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
 const key=info.code; if(sessions.has(key)) return;
 style();
 const oldPlayers=info.names.filter(n=>n && !/^Seat|Waiting/i.test(n));
 const channel=supabase.channel(`betsquad:play:${key}`,{config:{presence:{key:user.id}}});
 const session={root,info,user,channel,state:null,players:[],hostId:null}; sessions.set(key,session);
 const board=root.querySelector('.arena-board'); if(!board)return;
 const send=payload=>channel.send({type:'broadcast',event:'game-state',payload});
 const sync=()=>{
   const ps=Object.values(channel.presenceState()).flat().map(x=>({id:x.userId,name:x.displayName||'Player'}));
   session.players=ps.length?ps:oldPlayers.map((name,i)=>({id:`seat-${i}`,name}));
   session.hostId=[...session.players].sort((a,b)=>a.id.localeCompare(b.id))[0]?.id||user.id;
   renderGame(session);
   if(session.hostId===user.id && !session.state && session.players.length>=info.max){
      session.state=initial(gameKey(info.title),info.max); send({kind:'state',state:session.state}); renderGame(session);
   }
 };
 channel.on('presence',{event:'sync'},sync).on('presence',{event:'join'},sync).on('presence',{event:'leave'},sync);
 channel.on('broadcast',{event:'game-state'},({payload})=>{if(payload?.kind==='state'){session.state=payload.state;renderGame(session);}});
 channel.on('broadcast',{event:'game-action'},({payload})=>{
   if(session.hostId!==user.id || !payload || !session.state || session.state.done)return;
   processAction(session,payload).then(()=>send({kind:'state',state:session.state}));
 });
 const status=await channel.subscribe(); if(status!=='SUBSCRIBED'){board.innerHTML='<div class="wait">Unable to connect the live game. Refresh and try again.</div>';return;}
 await channel.track({userId:user.id,displayName:user.user_metadata?.player_name || user.email?.split('@')[0] || 'Player'});
 sync();
 const observer=new MutationObserver(()=>{ if(!root.isConnected){observer.disconnect();return;} const b=root.querySelector('.arena-board'); if(b && !b.dataset.liveInjected)renderGame(session); });
 observer.observe(root,{childList:true,subtree:true}); session.observer=observer;
}
async function processAction(s,a){
 const st=s.state; const count=s.players.length||2; const actor=s.players.findIndex(p=>p.id===a.userId); if(actor<0||actor!==st.turn)return;
 if(st.type==='dice' && a.type==='roll'){
   const roll=1+Math.floor(Math.random()*6); st.scores[actor]=(st.scores[actor]||0)+roll; st.last=`${s.players[actor].name} rolled ${roll}.`;
   if(st.scores[actor]>=20){st.winners.push(actor); if(st.winners.length>=winnerTarget(count)) st.done=true;}
   if(!st.done) st.turn=(st.turn+1)%count;
 }
 if(st.type==='snooker' && a.type==='shot'){
   const power=Math.max(1,Math.min(100,Number(a.power)||50)); const chance=Math.min(.92,.25+power/140); const made=Math.random()<chance; const points=made?(1+Math.floor(Math.random()*7)):0; st.scores[actor]=(st.scores[actor]||0)+points; st.last=made?`${s.players[actor].name} potted for ${points} point${points===1?'':'s'}.`:`${s.players[actor].name} missed the shot.`;
   if(st.scores[actor]>=30){st.winners.push(actor);if(st.winners.length>=winnerTarget(count))st.done=true;} if(!st.done)st.turn=(st.turn+1)%count;
 }
 if(st.type==='whot'){
   if(a.type==='play'){
     const card=st.hands[actor]?.[a.index]; const top=st.discard.at(-1); if(!card)return;
     if(card.s===top.s||card.n===top.n){st.hands[actor].splice(a.index,1);st.discard.push(card);st.last=`${s.players[actor].name} played ${SUITS[card.s]} ${card.n}.`;if(st.hands[actor].length===0){st.winners.push(actor);if(st.winners.length>=winnerTarget(count))st.done=true;}if(!st.done)st.turn=(st.turn+1)%count;}
   } else if(a.type==='draw'){
     if(st.deck.length===0){const keep=st.discard.pop();st.deck=shuffle(st.discard.splice(0));st.discard=[keep];}
     if(st.deck.length){st.hands[actor].push(st.deck.pop());st.last=`${s.players[actor].name} drew a card.`;st.turn=(st.turn+1)%count;}
   }
 }
 st.version=(st.version||0)+1;
}
function renderGame(s){
 const board=s.root.querySelector('.arena-board'); if(!board)return; board.dataset.liveInjected='1';
 const type=gameKey(s.info.title); const count=Math.min(s.players.length||s.info.max||2,s.info.max||2); const st=s.state;
 if(!st){board.innerHTML='<div class="wait">Waiting for all players to connect to the live game…</div>';return;}
 const me=s.players.findIndex(p=>p.id===s.user.id); const myTurn=me===st.turn&&!st.done;
 let body='';
 if(type==='dice') body=`<div class="dice-face">🎲</div><div class="turn-box">${st.done?'Match finished.':`Turn: <b>${esc(s.players[st.turn]?.name||'Player')}</b>`}</div><div class="players-grid">${s.players.map((p,i)=>`<div class="gp ${i===me?'me':''}"><b>${esc(p.name)}</b><small>Seat ${i+1}</small><div class="score">${st.scores[i]||0} / 20</div></div>`).join('')}</div><div class="live-actions"><button ${myTurn?'':'disabled'} data-act="roll">Roll Dice</button></div>`;
 if(type==='snooker') body=`<div class="snooker-table"><i class="pocket p1"></i><i class="pocket p2"></i><i class="pocket p3"></i><i class="pocket p4"></i><i class="cueball"></i><i class="targetball"></i></div><div class="turn-box">${st.done?'Match finished.':`Turn: <b>${esc(s.players[st.turn]?.name||'Player')}</b>`}</div><div class="players-grid">${s.players.map((p,i)=>`<div class="gp ${i===me?'me':''}"><b>${esc(p.name)}</b><small>Seat ${i+1}</small><div class="score">${st.scores[i]||0} / 30</div></div>`).join('')}</div><label>Shot power: <input class="power" id="shot-power" type="range" min="1" max="100" value="55" ${myTurn?'':'disabled'}></label><div class="live-actions"><button ${myTurn?'':'disabled'} data-act="shot">Take Shot</button></div>`;
 if(type==='whot'){const top=st.discard.at(-1);const hand=st.hands[me]||[];body=`<div class="turn-box">${st.done?'Match finished.':`Turn: <b>${esc(s.players[st.turn]?.name||'Player')}</b>`}</div><div class="top-card">${SUITS[top.s]} ${top.n}</div><p style="text-align:center;color:#94a3b8">Play a card matching the suit or number.</p><div class="cards">${hand.map((c,i)=>{const valid=c.s===top.s||c.n===top.n;return `<button class="cardx ${c.s===1||c.s===2?'red':''} ${valid&&myTurn?'':'disabled'}" data-card="${i}" ${valid&&myTurn?'':'disabled'}>${SUITS[c.s]} ${c.n}</button>`}).join('')}</div><div class="live-actions"><button class="secondary" ${myTurn?'':'disabled'} data-act="draw">Draw Card</button></div>`;}
 const win=st.winners?.length?`<div class="winner">🏆 Winner${st.winners.length>1?'s':''}: <b>${st.winners.map(i=>esc(s.players[i]?.name||'Player')).join(' & ')}</b></div>`:'';
 board.innerHTML=`<div class="live-game"><div class="live-head"><div><small>LIVE MATCH • ${count} PLAYERS</small><h3>${esc(s.info.title)}</h3></div><span class="live-pill2">● SYNCED</span></div>${body}<div class="result">${esc(st.last||'Match in progress.')}</div>${win}</div>`;
 board.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.act;if(t==='roll')s.channel.send({type:'broadcast',event:'game-action',payload:{type:'roll',userId:s.user.id}});if(t==='draw')s.channel.send({type:'broadcast',event:'game-action',payload:{type:'draw',userId:s.user.id}});if(t==='shot')s.channel.send({type:'broadcast',event:'game-action',payload:{type:'shot',power:board.querySelector('#shot-power')?.value,userId:s.user.id}});}));
 board.querySelectorAll('[data-card]').forEach(btn=>btn.addEventListener('click',()=>s.channel.send({type:'broadcast',event:'game-action',payload:{type:'play',index:Number(btn.dataset.card),userId:s.user.id}})));
}

const observer=new MutationObserver(()=>{
 document.querySelectorAll('.shared-room.in-game').forEach(root=>{
   const info=roomInfo(root); if(!info)return; const key=info.code;
   if(!TARGETS.has(key)){TARGETS.set(key,true);startSession(root,info);}
 });
});
observer.observe(document.body,{childList:true,subtree:true});
style();
