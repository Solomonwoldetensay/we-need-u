// ── GLOBALS ──────────────────────────
var BACKEND=((window.WNU_CONFIG&&window.WNU_CONFIG.BACKEND_URL)||'https://workmatch-backend.onrender.com').replace(/\/$/,'');
var API=BACKEND+'/api';
var token=localStorage.getItem('wm_token')||null;
var user=JSON.parse(localStorage.getItem('wm_user')||'null');
var postMode=null;
var convId=null;
var selVid=null;
var liked={};
var saved={};
var currentProjectId=null;
var currentProjId=null;
var pdVid=null;
var soundUnlocked=false;
var CLR=[{bg:'#160f2e',c:'#a99cf9'},{bg:'#0a1a10',c:'#1db975'},{bg:'#1e1408',c:'#e8a020'},{bg:'#1e0818',c:'#d4537e'},{bg:'#101810',c:'#639922'},{bg:'#0e1a1e',c:'#22d3ee'}];

// Returns a color pair based on id
function clr(id){return CLR[Math.abs(((id||'').toString().charCodeAt(0)||0))%CLR.length];}

// Returns initials from a name
function ini(n){return(n||'?').split(' ').map(function(x){return x[0];}).join('').substring(0,2).toUpperCase();}

// ── API HELPER ──────────────────────────
// All API calls go through here — adds auth token automatically
async function api(path,method,body){
  var h={'Content-Type':'application/json'};
  if(token)h['Authorization']='Bearer '+token;
  var o={method:method||'GET',headers:h};
  if(body)o.body=JSON.stringify(body);
  try{
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},90000);
    o.signal=controller.signal;
    var r=await fetch(API+path,o);
    clearTimeout(timeout);
    var d=await r.json();
    return{ok:r.ok,data:d};
  }catch(e){
    if(e.name==='AbortError')return{ok:false,data:{message:'Server is taking too long. Please try again.'}};
    return{ok:false,data:{message:'Connection error. Check your internet.'}};
  }
}

// ── SHOW PAGE ──────────────────────────
// Switches between screens
function show(id){
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('on');});
  document.getElementById(id).classList.add('on');
}

// ── ENTER APP ──────────────────────────
// Called after successful login — loads main app
function enterApp(){
  show('pg-feed');
  loadFeed();
  loadProfile();
  setTimeout(checkUnreadMessages,3000);
  var favEl=document.getElementById('feed-avatar');
  if(favEl&&user){
    // FIX: use user.name instead of user.full_name
    var displayName=user.name||user.full_name||'?';
    if(user.avatar_url){
      var img=document.createElement('img');img.src=user.avatar_url;
      img.style.cssText='width:100%;height:100%;object-fit:cover;';
      img.onerror=function(){favEl.textContent=displayName.charAt(0).toUpperCase();};
      favEl.innerHTML='';favEl.appendChild(img);
    }else{favEl.textContent=displayName.charAt(0).toUpperCase();}
  }
}

// ── NAVIGATION ──────────────────────────
function goFeed(){show('pg-feed');loadFeed();}
function goMatch(){show('pg-matches');loadMatches();}
function goMessages(){show('pg-messages');loadMessages();}
function goProf(){show('pg-profile');loadProfile();}

// ── TOAST ──────────────────────────
// Shows a small popup message on a slide
function showToast(id,msg,color){
  var el=document.getElementById('t-'+id);if(!el)return;
  el.textContent=msg;el.style.background=color;el.style.opacity='1';
  setTimeout(function(){el.style.opacity='0';},2500);
}

// Shows a general app-level toast at the top
function showAvatarToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';
  t.textContent=msg;document.getElementById('app').appendChild(t);
  setTimeout(function(){t.remove();},2500);
}

// Converts a date to "2m ago", "3h ago" etc
function timeAgo(dateStr){
  var s=Math.floor((Date.now()-new Date(dateStr))/1000);
  if(s<60)return 'now';
  if(s<3600)return Math.floor(s/60)+'m';
  if(s<86400)return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'d';
}
