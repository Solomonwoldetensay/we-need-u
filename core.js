// ── GLOBALS ──────────────────────────
var API='https://workmatch-backend.onrender.com/api';
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
function clr(id){return CLR[Math.abs(((id||'').charCodeAt(0)||0))%CLR.length];}
function ini(n){return(n||'?').split(' ').map(function(x){return x[0];}).join('').substring(0,2).toUpperCase();}

// ── API HELPER ──────────────────────────
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
function show(id){
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('on');});
  document.getElementById(id).classList.add('on');
}

// ── ENTER APP ──────────────────────────
function enterApp(){
  show('pg-feed');
  loadFeed();
  loadProfile();
  setTimeout(checkUnreadMessages,3000);
  var favEl=document.getElementById('feed-avatar');
  if(favEl&&user){
    if(user.avatar_url){
      var img=document.createElement('img');img.src=user.avatar_url;
      img.style.cssText='width:100%;height:100%;object-fit:cover;';
      img.onerror=function(){favEl.textContent=(user.full_name||'?').charAt(0).toUpperCase();};
      favEl.innerHTML='';favEl.appendChild(img);
    }else{favEl.textContent=(user.full_name||'?').charAt(0).toUpperCase();}
  }
}

// ── NAVIGATION ──────────────────────────
function goFeed(){show('pg-feed');loadFeed();}
function goMatch(){show('pg-matches');loadMatches();}
function goMessages(){show('pg-messages');loadMessages();}
function goProf(){show('pg-profile');loadProfile();}

// ── TOAST ──────────────────────────
function showToast(id,msg,color){
  var el=document.getElementById('t-'+id);if(!el)return;
  el.textContent=msg;el.style.background=color;el.style.opacity='1';
  setTimeout(function(){el.style.opacity='0';},2500);
}

function showAvatarToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';
  t.textContent=msg;document.getElementById('app').appendChild(t);
  setTimeout(function(){t.remove();},2500);
}

function timeAgo(dateStr){
  var s=Math.floor((Date.now()-new Date(dateStr))/1000);
  if(s<60)return 'now';
  if(s<3600)return Math.floor(s/60)+'m';
  if(s<86400)return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'d';
}
