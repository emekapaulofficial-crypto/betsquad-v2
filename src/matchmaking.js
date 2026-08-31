import { supabase } from './supabase.js';

const games = [
  { slug: 'whot', name: 'Whot!' },
  { slug: 'snooker', name: 'Snooker' },
  { slug: 'dice-duel', name: 'Dice Duel' },
];
let queueChannel = null;
let queueConfig = null;
let matched = false;
let working = false;

const css = `
#bs-matchmaking{position:fixed;right:16px;bottom:16px;z-index:9999;width:min(390px,calc(100vw - 32px));padding:18px;border-radius:22px;background:linear-gradient(145deg,#0b1220,#172554);color:#eef2ff;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:system-ui,sans-serif;border:1px solid rgba(255,255,255,.1)}
#bs-matchmaking h3{margin:0 0 5px;font-size:20px}#bs-matchmaking p{margin:5px 0 14px;color:#cbd5e1;font-size:13px}.bs-mm-row{display:flex;gap:8px;flex-wrap:wrap}.bs-mm-game,.bs-mm-mode,.bs-mm-btn{border:0;border-radius:11px;padding:10px 12px;font-weight:800;cursor:pointer}.bs-mm-game,.bs-mm-mode{background:#1e293b;color:#e2e8f0}.bs-mm-game.active,.bs-mm-mode.active{background:#2563eb;color:#fff}.bs-mm-btn{background:#16a34a;color:#fff;width:100%;margin-top:12px}.bs-mm-btn.stop{background:#475569}.bs-mm-status{margin-top:11px;padding:10px;border-radius:11px;background:#0f172a;color:#cbd5e1;font-size:13px}.bs-mm-close{position:absolute;right:10px;top:8px;border:0;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer}
`;
function addStyle(){if(document.getElementById('bs-mm-style'))return;const s=document.createElement('style');s.id='bs-mm-style';s.textContent=css;document.head.appendChild(s)}
function esc(v=''){return String(v).replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[s]));}
function ui(){
 if(document.getElementById('bs-matchmaking'))return;
 addStyle(); const el=document.createElement('section');el.id='bs-matchmaking';
 el.innerHTML=`<button class="bs-mm-close" aria-label="close">×</button><h3>🎮 Play Now</h3><p>No room code. Betsquad will find a compatible opponent automatically.</p><div class="bs-mm-row bs-games">${games.map((g,i)=>`<button class="bs-mm-game ${i===0?'active':''}" data-game="${g.slug}">${g.name}</button>`).join('')}</div><div class="bs-mm-row bs-modes" style="margin-top:8px"><button class="bs-mm-mode active" data-mode="1v1">1v1</button><button class="bs-mm-mode" data-mode="4-player">4 Players</button></div><button class="bs-mm-btn" id="bs-mm-go">Find Opponent</button><div class="bs-mm-status" id="bs-mm-status">Ready. Choose a game and press Find Opponent.</div>`;
 document.body.appendChild(el);
 let game='whot',mode='1v1';
 el.querySelectorAll('.bs-mm-game').forEach(b=>b.onclick=()=>{game=b.dataset.game;el.querySelectorAll('.bs-mm-game').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
 el.querySelectorAll('.bs-mm-mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;el.querySelectorAll('.bs-mm-mode').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
 el.querySelector('.bs-mm-close').onclick=()=>{stopQueue();el.remove()};
 el.querySelector('#bs-mm-go').onclick=()=>startQueue(game,mode,el);
}
function status(el,text){const x=el.querySelector('#bs-mm-status');if(x)x.textContent=text}
async function stopQueue(){if(queueChannel){try{await queueChannel.untrack()}catch{};await supabase.removeChannel(queueChannel);queueChannel=null}queueConfig=null;matched=false;working=false}
async function startQueue(game,mode,el){
 if(working)return;
 const {data:{user}}=await supabase.auth.getUser(); if(!user){document.querySelector('button')?.click();return;}
 await stopQueue(); queueConfig={game,mode,userId:user.id,displayName:user.user_metadata?.player_name||user.email?.split('@')[0]||'Player',max:mode==='1v1'?2:4};
 const topic=`betsquad:matchmaking:${game}:${mode}`;queueChannel=supabase.channel(topic,{config:{presence:{key:user.id}}});
 queueChannel.on('presence',{event:'sync'},()=>evaluateQueue(el)).on('presence',{event:'join'},()=>evaluateQueue(el)).on('presence',{event:'leave'},()=>evaluateQueue(el));
 const result=await queueChannel.subscribe(); if(result!=='SUBSCRIBED'){status(el,'Could not connect to matchmaking. Please try again.');return;}
 await queueChannel.track({userId:user.id,displayName:queueConfig.displayName,joinedAt:Date.now()});
 status(el,`🔎 Looking for a ${mode==='1v1'?'player':'full room'} for ${games.find(g=>g.slug===game)?.name||game}…`);
 el.querySelector('#bs-mm-go').textContent='Cancel Search';el.querySelector('#bs-mm-go').classList.add('stop');el.querySelector('#bs-mm-go').onclick=()=>{stopQueue();status(el,'Search cancelled.');el.querySelector('#bs-mm-go').textContent='Find Opponent';el.querySelector('#bs-mm-go').classList.remove('stop');el.querySelector('#bs-mm-go').onclick=()=>startQueue(game,mode,el)};
 evaluateQueue(el);
}
function members(){if(!queueChannel)return[];return Object.values(queueChannel.presenceState()).flat().map(x=>({id:x.userId,name:x.displayName||'Player',joinedAt:x.joinedAt||0})).sort((a,b)=>a.id.localeCompare(b.id))}
async function evaluateQueue(el){
 if(!queueConfig||matched||working)return;const list=members();if(list.length<queueConfig.max){status(el,`🔎 Waiting… ${list.length}/${queueConfig.max} player${queueConfig.max>1?'s':''} found.`);return;}
 const group=list.slice(0,queueConfig.max);const host=group[0];matched=true;working=true;
 if(queueConfig.userId===host.id){
   status(el,'⚡ Match found! Creating your private game…');
   try{
     const {data,error}=await supabase.rpc('create_betsquad_room',{p_game_type:queueConfig.game,p_mode:queueConfig.mode,p_stake:500,p_display_name:queueConfig.displayName});
     if(error)throw error;const room=data?.room||data;const code=room?.code;if(!room?.id||!code)throw new Error('The server did not return a game room.');
     await queueChannel.send({type:'broadcast',event:'match-found',payload:{roomId:room.id,code,game:queueConfig.game,mode:queueConfig.mode}});
     status(el,'✅ Match found! Opening the game…');
     openExistingRoom(code);
   }catch(e){matched=false;working=false;status(el,`Could not start match: ${e?.message||'Please try again.'}`)}
 }
 queueChannel.on('broadcast',{event:'match-found'},({payload})=>{if(!payload||payload.game!==queueConfig.game||payload.mode!==queueConfig.mode)return;if(queueConfig.userId===host.id)return;status(el,'✅ Opponent found! Joining the game…');openExistingRoom(payload.code)});
}
function openExistingRoom(code){
 const input=document.querySelector('input[placeholder="ROOM CODE"]');const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Join Room');
 if(!input||!btn){status(document.getElementById('bs-matchmaking')||document.body,'Match found. Open Match Room to continue.');return;}
 input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));btn.click();
 setTimeout(()=>{stopQueue();const box=document.getElementById('bs-matchmaking');if(box)box.remove()},1200);
}
function observeAuth(){
 supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user){setTimeout(ui,250)}else{stopQueue();document.getElementById('bs-matchmaking')?.remove()}});
}
setTimeout(()=>{ui();observeAuth()},700);
