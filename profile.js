// ── OWN PROFILE ──────────────────────────
async function loadProfile(){
  if(!user)return;
  // FIX: use user.name instead of user.full_name
  var n=user.name||user.full_name||'User';
  var pavEl=document.getElementById('pav');
  if(user.avatar_url){
    pavEl.innerHTML='<img src="'+user.avatar_url+'" alt="avatar"/>';
  }else{
    pavEl.textContent=ini(n);
  }
  document.getElementById('pname').textContent=n;
  document.getElementById('ploc').textContent=user.location||'Location not set';

  // Fetch latest user data from Python backend
  var r=await api('/auth/me');
  if(r.ok&&r.data.user){
    var u=r.data.user;
    // Update name — handle both name and full_name
    var newName=u.name||u.full_name||n;
    document.getElementById('pname').textContent=newName;
    if(u.avatar_url){
      user.avatar_url=u.avatar_url;
      pavEl.innerHTML='<img src="'+u.avatar_url+'" alt="avatar"/>';
    }
    if(u.stats){
      document.getElementById('sp').textContent=u.stats.projects||0;
      document.getElementById('sm').textContent=u.stats.matches||0;
    }
  }

  // FIX: Use /projects/my/projects to match Python backend route
  var r2=await api('/projects/my/projects');
  var el=document.getElementById('myprojs');
  if(!r2.ok||!r2.data.projects||!r2.data.projects.length){
    el.innerHTML='<div style="text-align:center;padding:2rem 0;font-size:13px;color:#666;">No projects yet.</div>';
    return;
  }

  var grid=document.createElement('div');grid.className='proj-grid';
  r2.data.projects.forEach(function(p){
    var q=clr(p.id);
    // FIX: Use looking_for instead of mode
    var lookingFor=p.looking_for||p.mode||'both';
    var mc=lookingFor==='collab'?'#7c6af7':lookingFor==='invest'?'#e8a020':'#d4537e';
    var ml=lookingFor==='collab'?'⚡ Collab':lookingFor==='invest'?'💰 Invest':'⭐ Both';
    var cell=document.createElement('div');cell.className='proj-cell';

    if(p.video_url){
      var vid=document.createElement('video');
      vid.src=p.video_url;
      vid.setAttribute('playsinline','');
      vid.muted=true;
      vid.preload='metadata';
      cell.appendChild(vid);
      var ico=document.createElement('div');
      ico.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;color:rgba(255,255,255,0.8);z-index:1;';
      ico.textContent='▶';
      cell.appendChild(ico);
    }else{
      var ph=document.createElement('div');
      ph.className='proj-cell-placeholder';
      ph.style.cssText='background:linear-gradient(135deg,'+q.bg+',#000);color:'+q.c+';';
      ph.textContent=ini(p.creator_name||n);
      cell.appendChild(ph);
    }

    var info=document.createElement('div');info.className='proj-cell-info';
    info.innerHTML=
      '<div class="proj-cell-title">'+p.title+'</div>'+
      '<span class="proj-cell-badge" style="background:'+mc+'22;color:'+mc+';">'+ml+'</span>'+
      '<div class="proj-cell-stats">'+
        '<span style="color:#f5c97a;">'+(p.invest_count||0)+'</span> invest · '+
        '<span style="color:#a99cf9;">'+(p.collab_count||0)+'</span> collab · '+
        '<span style="color:#f87171;">'+(p.like_count||0)+'</span> ❤️'+
      '</div>';
    cell.appendChild(info);
    cell.onclick=function(){openPostDetail(p);};
    grid.appendChild(cell);
  });
  el.innerHTML='';el.appendChild(grid);
}

// ── OTHER USER PROFILE ──────────────────────────
async function openUserProfile(creatorId,creatorName,creatorAvatar,creatorLocation){
  try{
    // Pause all videos while profile is open
    document.querySelectorAll('.feed-body video').forEach(function(v){v.pause();});
    var mask=document.getElementById('user-profile-mask');
    if(!mask){alert('Profile modal not found');return;}
    mask.classList.add('on');

    // Set avatar
    var avEl=document.getElementById('up-avatar');
    var q=clr(creatorId);
    if(creatorAvatar){
      avEl.style.cssText='width:64px;height:64px;border-radius:50%;overflow:hidden;flex-shrink:0;';
      var img=document.createElement('img');
      img.src=creatorAvatar;
      img.style.cssText='width:100%;height:100%;object-fit:cover;';
      img.onerror=function(){avEl.textContent=ini(creatorName);avEl.style.background=q.bg;avEl.style.color=q.c;};
      avEl.innerHTML='';avEl.appendChild(img);
    }else{
      avEl.style.cssText='width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;flex-shrink:0;background:'+q.bg+';color:'+q.c+';';
      avEl.textContent=ini(creatorName);
    }

    document.getElementById('up-name').textContent=creatorName||'User';
    document.getElementById('up-loc').textContent=creatorLocation||'';
    document.getElementById('up-stats').textContent='Loading...';
    document.getElementById('up-projects').innerHTML='<div style="text-align:center;padding:2rem;color:#555;font-size:13px;">Loading projects...</div>';

    // Try fetching their projects
    var projects=[];
    try{
      var resp=await fetch(API+'/projects?limit=50');
      var data=await resp.json();
      var allProjects=data.projects||[];
      projects=allProjects.filter(function(p){
        return p.creator_id===creatorId||p.creator_id==creatorId;
      });
    }catch(e){console.log('fetch error:',e);}

    // Fallback with auth token
    if(!projects.length){
      try{
        var r2=await api('/projects?limit=50');
        if(r2.ok&&r2.data.projects){
          projects=r2.data.projects.filter(function(p){return p.creator_id===creatorId;});
        }
      }catch(e2){}
    }

    // If viewing own profile
    if(!projects.length&&user&&user.id===creatorId){
      var r3=await api('/projects/my/projects');
      if(r3.ok&&r3.data.projects)projects=r3.data.projects;
    }

    document.getElementById('up-stats').textContent=projects.length+' project'+(projects.length!==1?'s':'');

    if(!projects.length){
      document.getElementById('up-projects').innerHTML='<div style="text-align:center;padding:2rem;color:#555;font-size:13px;">No projects yet</div>';
      return;
    }

    var grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 0;';
    projects.forEach(function(p){
      var qp=clr(p.id);
      // FIX: Use looking_for instead of mode
      var lookingFor=p.looking_for||p.mode||'both';
      var mc=lookingFor==='collab'?'#7c6af7':lookingFor==='invest'?'#e8a020':'#d4537e';
      var ml=lookingFor==='collab'?'⚡ Collab':lookingFor==='invest'?'💰 Invest':'⭐ Both';
      var cell=document.createElement('div');
      cell.style.cssText='position:relative;border-radius:10px;overflow:hidden;background:#111;aspect-ratio:9/16;cursor:pointer;';

      if(p.video_url){
        var vid=document.createElement('video');
        vid.src=p.video_url;
        vid.setAttribute('playsinline','');
        vid.muted=true;
        vid.preload='metadata';
        vid.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
        cell.appendChild(vid);
        var playIco=document.createElement('div');
        playIco.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;color:rgba(255,255,255,0.8);z-index:1;';
        playIco.textContent='▶';
        cell.appendChild(playIco);
      }else{
        var ph=document.createElement('div');
        ph.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,'+qp.bg+',#000);color:'+qp.c+';';
        ph.textContent=ini(creatorName);
        cell.appendChild(ph);
      }

      var inf=document.createElement('div');
      inf.style.cssText='position:absolute;bottom:0;left:0;right:0;padding:6px 8px;background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 100%);';
      inf.innerHTML=
        '<div style="font-size:10px;font-weight:600;color:#fff;line-height:1.3;margin-bottom:2px;">'+p.title+'</div>'+
        '<span style="font-size:8px;padding:1px 5px;border-radius:6px;background:'+mc+'22;color:'+mc+';">'+ml+'</span>';
      cell.appendChild(inf);
      cell.onclick=function(){document.getElementById('user-profile-mask').classList.remove('on');openPostDetail(p);};
      grid.appendChild(cell);
    });

    document.getElementById('up-projects').innerHTML='';
    document.getElementById('up-projects').appendChild(grid);

  }catch(err){
    console.error('openUserProfile error:',err);
    document.getElementById('up-projects').innerHTML='<div style="text-align:center;padding:2rem;color:#e24b4a;font-size:13px;">Error: '+err.message+'</div>';
  }
}

// ── MATCHES TABS ──────────────────────────
function switchTab(tab){
  document.getElementById('tab-invest').classList.toggle('active',tab==='invest');
  document.getElementById('tab-collab').classList.toggle('active',tab==='collab');
  document.getElementById('panel-invest').classList.toggle('active',tab==='invest');
  document.getElementById('panel-collab').classList.toggle('active',tab==='collab');
}

// ── LOAD MATCHES ──────────────────────────
async function loadMatches(){
  var pi=document.getElementById('panel-invest');
  var pc=document.getElementById('panel-collab');
  pi.innerHTML='<div class="m-empty"><div class="m-empty-ico">⏳</div><div>Loading...</div></div>';
  pc.innerHTML='<div class="m-empty"><div class="m-empty-ico">⏳</div><div>Loading...</div></div>';

  // FIX: Use /matches/ to match Python backend route
  var r=await api('/matches/');
  if(!r.ok||!r.data.matches||!r.data.matches.length){
    pi.innerHTML='<div class="m-empty"><div class="m-empty-ico">💰</div><div>No invest matches yet</div></div>';
    pc.innerHTML='<div class="m-empty"><div class="m-empty-ico">⚡</div><div>No collab matches yet</div></div>';
    return;
  }

  function buildMatchCard(m){
    var q=clr(m.user_id);
    var isPending=m.status==='pending';
    var d=document.createElement('div');
    d.className='mrow-item '+(isPending?'pending':'accepted');
    d.dataset.cid=m.conversation_id;
    d.dataset.name=m.creator_name||'User';
    d.dataset.pending=isPending?'1':'0';
    var statusLabel=isPending?'⏳ Pending':'✅ Connected';
    var statusClass=isPending?'pending':'accepted';
    var mavDiv=document.createElement('div');mavDiv.className='mav';
    mavDiv.style.cssText='background:'+q.bg+';color:'+q.c+(isPending?';opacity:0.6':'');
    mavDiv.textContent=ini(m.creator_name||'U');
    d.appendChild(mavDiv);
    d.innerHTML+=
      '<div style="flex:1;min-width:0;">'+
        '<div class="mname">'+(m.creator_name||'User')+'</div>'+
        '<div class="mproj">'+(m.project_title||'Project')+'</div>'+
      '</div>'+
      '<div class="mstatus '+statusClass+'">'+statusLabel+'</div>';
    d.onclick=function(){if(this.dataset.pending==='1')return;openChat(this.dataset.cid,this.dataset.name);};
    return d;
  }

  function buildPanel(matches,emptyIco,emptyMsg,panel){
    if(!matches.length){
      panel.innerHTML='<div class="m-empty"><div class="m-empty-ico">'+emptyIco+'</div><div>'+emptyMsg+'</div></div>';
      return;
    }
    panel.innerHTML='';
    matches.forEach(function(m){panel.appendChild(buildMatchCard(m));});
  }

  buildPanel(r.data.matches.filter(function(m){return m.match_type==='invest';}),'💰','No invest matches yet',pi);
  buildPanel(r.data.matches.filter(function(m){return m.match_type==='collab';}),'⚡','No collab matches yet',pc);
}

// ── MESSAGES ──────────────────────────
// Tracks which conversations have been read
var readConversations=(function(){
  try{return JSON.parse(localStorage.getItem('wnu_read')||'{}');}catch(e){return {};}
})();

function markConversationRead(cid,lastMsgAt){
  var ts=lastMsgAt?new Date(lastMsgAt).getTime():Date.now();
  readConversations[cid]=ts;
  try{localStorage.setItem('wnu_read',JSON.stringify(readConversations));}catch(e){}
}

function isConversationUnread(m){
  if(!m.last_message||!m.last_message_at)return false;
  var readAt=readConversations[m.conversation_id];
  if(!readAt)return true;
  return new Date(m.last_message_at).getTime()>readAt;
}

// Updates the red unread badge on Messages tab
function updateMsgBadge(count){
  document.querySelectorAll('.msg-badge').forEach(function(b){
    if(count>0){b.style.display='flex';b.textContent=count>9?'9+':count;}
    else{b.style.display='none';}
  });
}

// Checks for unread messages every 30 seconds
async function checkUnreadMessages(){
  if(!token)return;
  try{
    var r=await api('/matches/');
    if(!r.ok)return;
    var unread=(r.data.matches||[]).filter(function(m){
      return m.status==='accepted'&&isConversationUnread(m);
    }).length;
    updateMsgBadge(unread);
  }catch(e){}
}
setInterval(function(){if(token)checkUnreadMessages();},30000);

// ── LOAD MESSAGES LIST ──────────────────────────
async function loadMessages(){
  var list=document.getElementById('messages-list');
  if(!list)return;
  list.innerHTML='<div style="text-align:center;padding:40px;color:#555;font-size:14px;">Loading...</div>';

  var r=await api('/matches/');
  if(!r.ok){
    list.innerHTML='<div style="text-align:center;padding:40px;color:#555;">Failed to load</div>';
    return;
  }

  var accepted=(r.data.matches||[]).filter(function(m){return m.status==='accepted';});
  if(!accepted.length){
    list.innerHTML='<div style="text-align:center;padding:60px 20px;color:#555;font-size:14px;">No messages yet<br><br>When someone accepts your match request it will appear here 💬</div>';
    updateMsgBadge(0);
    return;
  }

  list.innerHTML='';
  var unreadCount=0;
  accepted.forEach(function(m){
    var q=clr(m.user_id);
    var d=document.createElement('div');
    var hasUnread=isConversationUnread(m);
    if(hasUnread)unreadCount++;
    d.style.cssText='display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #1a1a1a;cursor:pointer;background:'+(hasUnread?'rgba(124,106,247,0.06)':'transparent')+';';

    var av=document.createElement('div');
    av.style.cssText='width:46px;height:46px;border-radius:50%;background:'+q.bg+';color:'+q.c+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;position:relative;';
    av.textContent=ini(m.creator_name||'U');
    if(hasUnread){
      var dot=document.createElement('div');
      dot.style.cssText='position:absolute;bottom:1px;right:1px;width:12px;height:12px;border-radius:50%;background:#7c6af7;border:2px solid #07070d;';
      av.appendChild(dot);
    }
    d.appendChild(av);

    var info=document.createElement('div');info.style.cssText='flex:1;min-width:0;';
    info.innerHTML=
      '<div style="font-size:14px;font-weight:'+(hasUnread?700:600)+';color:#fff;margin-bottom:3px;">'+(m.creator_name||'User')+'</div>'+
      '<div style="font-size:12px;color:'+(hasUnread?'#ccc':'#666')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(m.last_message||'🎉 Match! Tap to say hello')+'</div>';
    d.appendChild(info);

    d.onclick=function(){
      markConversationRead(m.conversation_id,m.last_message_at);
      openChat(m.conversation_id,m.creator_name||'User');
    };
    list.appendChild(d);
  });
  updateMsgBadge(unreadCount);
}

// ── CHAT ──────────────────────────
async function openChat(cid,name){
  convId=cid;
  markConversationRead(cid,new Date(Date.now()+86400000).toISOString());
  checkUnreadMessages();
  document.getElementById('cwho').textContent=name;
  document.getElementById('cav').textContent=ini(name);
  var area=document.getElementById('msgs');area.innerHTML='';
  show('pg-chat');

  // FIX: Use /messages/{conversation_id} to match Python backend
  var r=await api('/messages/'+cid);
  if(r.ok&&r.data.messages){
    if(r.data.messages.length===0){
      // Show greeting prompts for new conversations
      var greeting=document.createElement('div');
      greeting.style.cssText='display:flex;flex-direction:column;align-items:center;padding:30px 16px;gap:10px;';
      greeting.innerHTML=
        '<div style="font-size:32px;margin-bottom:4px;">🎉</div>'+
        '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px;">You\'re connected with '+name+'!</div>'+
        '<div style="font-size:12px;color:#555;margin-bottom:16px;">Say hello to get the conversation started</div>'+
        '<button onclick="quickSay(\'👋 Hey! Excited to connect with you!\')" style="background:#1a1a2e;border:1px solid #2a2a3e;color:#ccc;padding:10px 18px;border-radius:20px;font-size:13px;cursor:pointer;width:100%;text-align:left;">👋 Hey! Excited to connect with you!</button>'+
        '<button onclick="quickSay(\'Would love to learn more about your idea!\')" style="background:#1a1a2e;border:1px solid #2a2a3e;color:#ccc;padding:10px 18px;border-radius:20px;font-size:13px;cursor:pointer;width:100%;text-align:left;">💡 Would love to learn more about your idea!</button>'+
        '<button onclick="quickSay(\'When would you be free for a quick call?\')" style="background:#1a1a2e;border:1px solid #2a2a3e;color:#ccc;padding:10px 18px;border-radius:20px;font-size:13px;cursor:pointer;width:100%;text-align:left;">📞 When would you be free for a quick call?</button>';
      area.appendChild(greeting);
    }else{
      r.data.messages.forEach(function(m){
        var d=document.createElement('div');
        d.className='msg '+(m.sender_id===user.id?'me':'them');
        d.innerHTML='<div class="mbub">'+m.content+'</div>';
        area.appendChild(d);
      });
    }
    area.scrollTop=area.scrollHeight;
  }
  setTimeout(function(){var cbox=document.getElementById('cbox');if(cbox)cbox.focus();},300);
}

// Pre-fills message input with a quick reply
function quickSay(text){
  var cbox=document.getElementById('cbox');
  if(cbox){cbox.value=text;cbox.focus();}
}

// Sends a message in the current chat
async function sendMsg(){
  var inp=document.getElementById('cbox');
  var text=inp.value.trim();
  if(!text||!convId)return;
  var area=document.getElementById('msgs');
  var d=document.createElement('div');
  d.className='msg me';
  d.innerHTML='<div class="mbub">'+text+'</div>';
  area.appendChild(d);
  inp.value='';
  area.scrollTop=area.scrollHeight;
  // FIX: Use /messages/ POST to match Python backend
  await api('/messages/','POST',{conversation_id:convId,content:text});
}

// ── POST DETAIL ──────────────────────────
// Opens a full screen view of a project
function openPostDetail(p){
  show('pg-feed');
}
