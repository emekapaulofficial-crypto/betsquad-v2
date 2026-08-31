import { supabase } from './supabase.js';

// Simple, code-free lobby using Supabase Realtime Presence.
// Players publish only their public lobby presence; authentication remains in Supabase Auth.
const channel = supabase.channel('betsquad:online-lobby', { config: { presence: { key: crypto.randomUUID() } } });
let me = null;
let players = [];
let selectedGame = localStorage.getItem('betsquad_game') || 'dice';
let selectedMode = localStorage.getItem('betsquad_mode') || '1v1';

const gameNames = { whot: 'Whot', snooker: 'Snooker', dice: 'Dice Duel' };
const maxFor = mode => mode === '4p' ? 4 : 2;
const esc = s => String(s ?? '').replace(/[&<>\"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[x]));

function ensureStyle() {
  if (document.getElementById('online-lobby-style')) return;
  const s = document.createElement('style'); s.id='online-lobby-style';
  s.textContent=`
  #betsquad-online-lobby{position:fixed;right:14px;bottom:14px;width:min(370px,calc(100vw - 28px));z-index:9999;background:#0b1220;color:#eef2ff;border:1px solid #334155;border-radius:20px;padding:14px;box-shadow:0 18px 50px #0008;font-family:system-ui,sans-serif}
  .bol-head{display:flex;justify-content:space-between;align-items:center}.bol-head strong{font-size:16px}.bol-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#22c55e;margin-right:6px}.bol-count{color:#94a3b8;font-size:12px}
  .bol-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.bol-controls select{background:#172033;color:#fff;border:1px solid #334155;border-radius:10px;padding:9px}
  .bol-list{max-height:220px;overflow:auto}.bol-player{display:flex;align-items:center;justify-content:space-between;padding:9px;border-radius:12px;background:#111827;margin:6px 0}.bol-player small{display:block;color:#94a3b8}.bol-player button{border:0;border-radius:9px;background:#2563eb;color:#fff;padding:8px 10px;font-weight:800}.bol-me{border:1px solid #22c55e}.bol-empty{text-align:center;padding:15px;color:#94a3b8;font-size:13px}.bol-status{margin-top:8px;color:#cbd5e1;font-size:12px}
  `; document.head.appendChild(s);
}
function render() {
  ensureStyle();
  let el=document.getElementById('betsquad-online-lobby');
  if(!el){el=document.createElement('section');el.id='betsquad-online-lobby';document.body.appendChild(el);}
  const compatible=players.filter(p=>p.id!==me?.id && p.game===selectedGame && p.mode===selectedMode);
  el.innerHTML=`<div class="bol-head"><strong><span class="bol-dot"></span>Players Online</strong><span class="bol-count">${players.length} active</span></div>
  <div class="bol-controls"><select id="bol-game"><option value="dice">Dice Duel</option><option value="whot">Whot</option><option value="snooker">Snooker</option></select><select id="bol-mode"><option value="1v1">1v1</option><option value="4p">4 Players</option></select></div>
  <div class="bol-list">${players.length ? players.map(p=>`<div class="bol-player ${p.id===me?.id?'bol-me':''}"><div><b>${esc(p.name)}</b><small>${esc(gameNames[p.game]||p.game)} • ${p.mode==='4p'?'4 Players':'1v1'}${p.id===me?.id?' • You':''}</small></div>${p.id!==me?.id && p.game===selectedGame && p.mode===selectedMode ? `<button data-connect="${esc(p.id)}">Play</button>`:''}</div>`).join('') : '<div class="bol-empty">No other players are online yet.</div>'}</div>
  <div class="bol-status">${compatible.length ? `${compatible.length} player${compatible.length>1?'s':''} ready for ${gameNames[selectedGame]} ${selectedMode==='4p'?'4-player':'1v1'}.` : `Waiting for someone to choose ${gameNames[selectedGame]} ${selectedMode==='4p'?'4 Players':'1v1'}…`}</div>`;
  el.querySelector('#bol-game').value=selectedGame; el.querySelector('#bol-mode').value=selectedMode;
  el.querySelector('#bol-game').onchange=e=>{selectedGame=e.target.value;localStorage.setItem('betsquad_game',selectedGame);publish();render();};
  el.querySelector('#bol-mode').onchange=e=>{selectedMode=e.target.value;localStorage.setItem('betsquad_mode',selectedMode);publish();render();};
  el.querySelectorAll('[data-connect]').forEach(b=>b.onclick=()=>invite(b.dataset.connect));
}
async function publish(){
  if(!me) return;
  await channel.track({ id:me.id, name:me.name, game:selectedGame, mode:selectedMode, online:true, at:Date.now() });
}
async function invite(targetId){
  const payload={from:me.id,fromName:me.name,game:selectedGame,mode:selectedMode,matchToken:crypto.randomUUID()};
  await channel.send({type:'broadcast',event:`invite:${targetId}`,payload});
  const status=document.querySelector('#betsquad-online-lobby .bol-status'); if(status) status.textContent='Invitation sent. Waiting for the player to accept…';
}
async function start(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return;
  me={id:user.id,name:user.user_metadata?.player_name || user.email?.split('@')[0] || 'Player'};
  channel.on('presence',{event:'sync'},()=>{
    const state=channel.presenceState();
    players=Object.values(state).flat().map(x=>({id:x.id,name:x.name||'Player',game:x.game||'dice',mode:x.mode||'1v1'}));
    render();
  });
  channel.on('broadcast',{event:`invite:${me.id}`},async ({payload})=>{
    if(!payload || payload.from===me.id) return;
    const ok=window.confirm(`${payload.fromName} wants to play ${gameNames[payload.game]||payload.game} (${payload.mode==='4p'?'4 Players':'1v1'}). Join now?`);
    if(ok){
      // Store a one-time match request. The existing app can consume this and open its match screen.
      localStorage.setItem('betsquad_pending_match',JSON.stringify({...payload,acceptedAt:Date.now(),to:me.id}));
      window.dispatchEvent(new CustomEvent('betsquad:match-found',{detail:payload}));
      const status=document.querySelector('#betsquad-online-lobby .bol-status'); if(status) status.textContent='Match accepted. Opening the game…';
      // If the app exposes a Join/Create button, trigger it rather than asking the user for a code.
      const join=[...document.querySelectorAll('button')].find(b=>/join|play now|find opponent/i.test(b.textContent||''));
      if(join) join.click();
    }
  });
  const status=await channel.subscribe();
  if(status!=='SUBSCRIBED') return;
  await publish(); render();
}

start();
