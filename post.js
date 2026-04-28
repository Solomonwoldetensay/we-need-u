// ── POST CREATION ──────────────────────────
document.getElementById('mc').onclick=function(){setMode('collab');};
document.getElementById('mi').onclick=function(){setMode('invest');};
document.getElementById('mb').onclick=function(){setMode('both');};

function setMode(m){
  postMode=m;
  document.getElementById('mc').className='mdb'+(m==='collab'?' sc':'');
  document.getElementById('mi').className='mdb'+(m==='invest'?' si':'');
  document.getElementById('mb').className='mdb'+(m==='both'?' sb':'');
}

document.getElementById('upbox').onclick=function(){document.getElementById('vfile').click();};
document.getElementById('vfile').onchange=function(){
  var f=this.files[0];if(!f)return;selVid=f;
  var vp=document.getElementById('vprev');vp.src=URL.createObjectURL(f);vp.style.display='block';
};

document.getElementById('pbtn').onclick=async function(){
  var title=document.getElementById('ptitle').value.trim();
  var desc=document.getElementById('pdesc').value.trim();
  var cat=document.getElementById('pcat').value;
  var skills=document.getElementById('pskills').value.trim();
  if(!title){alert('Please add a project title');return;}
  if(!desc){alert('Please describe your project');return;}
  if(!postMode){alert('Please select what you are looking for');return;}
  this.disabled=true;this.textContent='Posting...';
  var video_url=null;
  if(selVid){
    document.getElementById('uping').classList.add('on');
    try{
      var reader=new FileReader();
      video_url=await new Promise(function(resolve,reject){
        reader.onload=async function(e){
          var r=await api('/upload','POST',{data:e.target.result,type:selVid.type});
          if(r.ok&&r.data.url)resolve(r.data.url);else reject(new Error(r.data.message||'Upload failed'));
        };
        reader.onerror=function(){reject(new Error('Read failed'));};
        reader.readAsDataURL(selVid);
      });
    }catch(e){alert('Video upload failed. Posting without video.');video_url=null;}
    document.getElementById('uping').classList.remove('on');
  }
  var r=await api('/projects','POST',{title:title,description:desc,category:cat,mode:postMode,tags:skills?skills.split(',').map(function(s){return s.trim();}):[],video_url:video_url});
  this.disabled=false;this.textContent='Post to Feed →';
  if(r.ok){
    document.getElementById('ptitle').value='';document.getElementById('pdesc').value='';document.getElementById('pskills').value='';
    document.getElementById('vprev').style.display='none';document.getElementById('vprev').src='';
    selVid=null;postMode=null;setMode('');
    show('pg-feed');setTimeout(loadFeed,500);
  }else{alert(r.data.message||'Failed to post.');}
};

// ── POST DETAIL ──────────────────────────
function openPostDetail(p){
  document.querySelectorAll('.feed-body video').forEach(function(v){v.pause();});
  currentProjId=p.id;
  var q=clr(p.id);
  var mc=p.mode==='collab'?'#7c6af7':p.mode==='invest'?'#e8a020':'#d4537e';
  var ml=p.mode==='collab'?'⚡ Seeking Collaborators':p.mode==='invest'?'💰 Seeking Investors':'⚡💰 Collab + Invest';
  var wrap=document.getElementById('pd-video-wrap');
  var old=wrap.querySelector('video,.pd-placeholder');if(old)old.remove();
  pdVid=null;
  if(p.video_url){
    pdVid=document.createElement('video');
    pdVid.src=p.video_url;pdVid.setAttribute('playsinline','');pdVid.setAttribute('loop','');
    pdVid.muted=false;pdVid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
    wrap.insertBefore(pdVid,wrap.firstChild);
    pdVid.play().catch(function(){pdVid.muted=true;pdVid.play();});
    wrap.onclick=function(e){
      if(e.target.closest('.pd-back')||e.target.closest('.pd-requests-btn'))return;
      var ico=document.getElementById('pd-play-ico');
      if(pdVid.paused){pdVid.play();ico.textContent='▶';ico.style.opacity='1';setTimeout(function(){ico.style.opacity='0';},600);}
      else{pdVid.pause();ico.textContent='⏸';ico.style.opacity='1';}
    };
  }else{
    var ph=document.createElement('div');ph.className='pd-placeholder';
    ph.style.cssText='position:absolute;inset:0;background:linear-gradient(160deg,'+q.bg+',#000);display:flex;align-items:center;justify-content:center;font-size:52px;color:'+q.c+';';
    ph.textContent=ini(p.creator_name||(user&&user.full_name)||'?');wrap.insertBefore(ph,wrap.firstChild);
  }
  document.getElementById('pd-handle').textContent='@'+(p.creator_name||'user').toLowerCase().replace(/\s+/g,'_');
  document.getElementById('pd-title').textContent=p.title||'';
  document.getElementById('pd-desc').textContent=p.description||'';
  document.getElementById('pd-mode').textContent=ml;
  document.getElementById('pd-mode').style.cssText='display:inline-block;font-size:10px;padding:3px 10px;border-radius:20px;background:'+mc+'22;color:'+mc+';margin-bottom:8px;';
  document.getElementById('pd-invest').textContent=p.invest_count||0;
  document.getElementById('pd-collab').textContent=p.collab_count||0;
  document.getElementById('pd-views').textContent=p.views||0;
  document.getElementById('pd-likes').textContent=p.like_count||0;
  document.getElementById('post-detail-mask').classList.add('on');
  api('/projects/'+p.id+'/requests').then(function(r){
    if(r.ok&&r.data.requests){var cnt=r.data.requests.length;document.getElementById('pd-req-count').textContent=cnt>0?'('+cnt+')':'';}
  });
  loadDetailComments(p.id);
}

async function loadDetailComments(pid){
  var list=document.getElementById('pd-comments-list');
  list.innerHTML='<div style="font-size:12px;color:#555;text-align:center;padding:1rem;">Loading...</div>';
  var r=await api('/projects/'+pid+'/comments');
  if(!r.ok||!r.data.comments||!r.data.comments.length){list.innerHTML='<div style="font-size:12px;color:#555;text-align:center;padding:1rem;">No comments yet</div>';return;}
  var comments=r.data.comments.filter(function(c){return !c.parent_id;});
  var replies=r.data.comments.filter(function(c){return c.parent_id;});
  list.innerHTML='';
  comments.forEach(function(c){
    var div=document.createElement('div');div.className='pd-comment';
    var repHtml=replies.filter(function(rep){return rep.parent_id===c.id;}).map(function(rep){return '<div class="pd-comment-reply"><span style="color:#7c6af7;font-weight:600;font-size:10px;">'+(rep.user_name||'User')+'</span> <span style="font-size:11px;color:#999;">'+rep.content+'</span></div>';}).join('');
    div.innerHTML='<div class="pd-comment-name">'+(c.user_name||'User')+'</div><div class="pd-comment-text">'+c.content+'</div>'+repHtml;
    list.appendChild(div);
  });
}

document.getElementById('pd-back').onclick=function(){
  if(pdVid){pdVid.pause();pdVid.remove();pdVid=null;}
  var ph=document.getElementById('pd-video-wrap').querySelector('.pd-placeholder');if(ph)ph.remove();
  document.getElementById('post-detail-mask').classList.remove('on');
  document.getElementById('req-sheet').classList.remove('on');
  document.getElementById('likes-sheet').classList.remove('on');
  document.getElementById('stat-users-sheet').classList.remove('on');
  document.querySelectorAll('.slide').forEach(function(slide){
    var rect=slide.getBoundingClientRect();var vid=slide.querySelector('video');
    if(vid&&rect.top>=0&&rect.top<window.innerHeight*0.6){vid.muted=!soundUnlocked;vid.play().catch(function(){});}
  });
};

document.getElementById('pd-requests-btn').onclick=function(){openRequests();};
document.getElementById('req-close').onclick=function(){document.getElementById('req-sheet').classList.remove('on');};
document.getElementById('likes-close').onclick=function(){document.getElementById('likes-sheet').classList.remove('on');};

document.getElementById('pd-likes-btn').onclick=async function(){
  document.getElementById('likes-sheet').classList.add('on');
  var list=document.getElementById('likes-list');list.innerHTML='<div class="req-empty">Loading...</div>';
  var r=await api('/projects/'+currentProjId+'/likes');
  if(!r.ok||!r.data.likes||!r.data.likes.length){list.innerHTML='<div class="req-empty">No likes yet</div>';return;}
  list.innerHTML='';
  r.data.likes.forEach(function(u){
    var q=clr(u.id);var div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1e1e1e;';
    div.innerHTML='<div style="width:38px;height:38px;border-radius:50%;background:'+q.bg+';color:'+q.c+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">'+ini(u.full_name)+'</div><div><div style="font-size:13px;font-weight:600;color:#fff;">'+u.full_name+'</div><div style="font-size:11px;color:#666;">'+(u.location||'')+'</div></div><div style="margin-left:auto;font-size:18px;">❤️</div>';
    list.appendChild(div);
  });
};

async function openRequests(){
  document.getElementById('req-sheet').classList.add('on');
  var list=document.getElementById('req-list');list.innerHTML='<div class="req-empty">Loading...</div>';
  var r=await api('/projects/'+currentProjId+'/requests');
  if(!r.ok||!r.data.requests||!r.data.requests.length){list.innerHTML='<div class="req-empty">No pending requests 🎉</div>';return;}
  list.innerHTML='';
  r.data.requests.forEach(function(req){
    var q=clr(req.requester_id);var isInvest=req.match_type==='invest';
    var typeStyle=isInvest?'background:rgba(232,160,32,0.15);color:#f5c97a;':'background:rgba(124,106,247,0.15);color:#a99cf9;';
    var div=document.createElement('div');div.className='req-item';
    div.innerHTML='<div class="req-item-top"><div class="req-item-av" style="background:'+q.bg+';color:'+q.c+';">'+ini(req.requester_name)+'</div><div><div class="req-item-name">'+(req.requester_name||'User')+'</div><div class="req-item-loc">'+(req.requester_location||'')+'</div><span class="req-item-type" style="'+typeStyle+'">'+(isInvest?'💰 Wants to Invest':'⚡ Wants to Collab')+'</span></div></div><div class="req-btns"><button class="req-btn accept" data-id="'+req.id+'">✅ Accept</button><button class="req-btn deny" data-id="'+req.id+'">Check Back Later</button></div>';
    div.querySelector('.accept').onclick=async function(){var res=await api('/matches/'+this.dataset.id+'/accept','POST');if(res.ok){this.closest('.req-item').innerHTML='<div style="text-align:center;padding:10px;font-size:12px;color:#4ade80;">✅ Accepted! You are now connected.</div>';loadMatches();}};
    div.querySelector('.deny').onclick=async function(){var res=await api('/matches/'+this.dataset.id+'/deny','POST');if(res.ok){this.closest('.req-item').innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:4px 0;"><div style="font-size:22px;">🕐</div><div style="font-size:12px;font-weight:600;color:#aaa;">Check Back Later</div></div>';}};
    list.appendChild(div);
  });
}

async function showStatUsers(type){
  var titles={invest:'💰 Investors',collab:'⚡ Collaborators',likes:'❤️ Liked by',views:'👁 Views'};
  document.getElementById('stat-users-title').textContent=titles[type]||type;
  document.getElementById('stat-users-list').innerHTML='<div class="req-empty">Loading...</div>';
  document.getElementById('stat-users-sheet').classList.add('on');
  if(type==='views'){document.getElementById('stat-users-list').innerHTML='<div class="req-empty" style="text-align:center;color:#aaa;font-size:16px;">'+document.getElementById('pd-views').textContent+' total views</div>';return;}
  if(type==='likes'){
    var r=await api('/projects/'+currentProjId+'/likes');
    var users=r.ok?(r.data.likes||[]):[];
    if(!users.length){document.getElementById('stat-users-list').innerHTML='<div class="req-empty">No likes yet</div>';return;}
    document.getElementById('stat-users-list').innerHTML=users.map(function(u){var q=clr(u.id);return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1e1e1e;"><div style="width:38px;height:38px;border-radius:50%;background:'+q.bg+';color:'+q.c+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">'+ini(u.full_name)+'</div><div style="flex:1;font-size:13px;font-weight:600;color:#fff;">'+u.full_name+'</div><div>❤️</div></div>';}).join('');return;
  }
  var r=await api('/projects/'+currentProjId+'/requests');
  if(r.ok&&r.data.requests&&r.data.requests.length){
    var reqs=r.data.requests.filter(function(req){return req.match_type===type;});
    if(reqs.length){document.getElementById('stat-users-list').innerHTML=reqs.map(function(req){var q=clr(req.requester_id);var sc=req.status==='accepted'?'#4ade80':req.status==='denied'?'#666':'#f5c97a';var st=req.status==='accepted'?'✅':req.status==='denied'?'❌':'⏳';return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #1e1e1e;"><div style="width:38px;height:38px;border-radius:50%;background:'+q.bg+';color:'+q.c+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">'+ini(req.requester_name)+'</div><div style="flex:1;font-size:13px;font-weight:600;color:#fff;">'+(req.requester_name||'User')+'</div><div style="font-size:13px;font-weight:700;color:'+sc+';">'+st+'</div></div>';}).join('');return;}
  }
  document.getElementById('stat-users-list').innerHTML='<div class="req-empty">No '+(type==='invest'?'investors':'collaborators')+' yet</div>';
}
