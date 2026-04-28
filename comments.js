// ── COMMENTS ──────────────────────────
var replyToId=null;
var replyToName=null;

async function openComments(projectId,projectTitle){
  currentProjectId=projectId;replyToId=null;replyToName=null;
  document.getElementById('reply-bar').style.display='none';
  document.getElementById('comment-input').placeholder='Write a comment...';
  document.getElementById('comments-title').textContent='💬 '+projectTitle;
  document.getElementById('comments-list').innerHTML='<div style="text-align:center;padding:1rem;font-size:12px;color:#666;">Loading comments...</div>';
  document.getElementById('comments-mask').classList.add('on');
  loadComments();
}

async function loadComments(){
  var r=await api('/projects/'+currentProjectId+'/comments');
  var list=document.getElementById('comments-list');
  if(!r.ok||!r.data.comments||!r.data.comments.length){list.innerHTML='<div style="text-align:center;padding:2rem;font-size:13px;color:#666;">No comments yet. Be the first!</div>';return;}
  var comments=r.data.comments.filter(function(c){return !c.parent_id;});
  var replies=r.data.comments.filter(function(c){return c.parent_id;});
  list.innerHTML='';
  comments.forEach(function(c){
    var div=document.createElement('div');div.style.cssText='padding:10px 0;border-bottom:1px solid #1e1e1e;';
    div.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div style="font-size:12px;font-weight:600;color:#a99cf9;">'+(c.user_name||'User')+'</div><button onclick="setReply(\''+c.id+'\',\''+c.user_name+'\')" style="background:none;border:none;color:#666;font-size:11px;cursor:pointer;">↩️ Reply</button></div><div style="font-size:13px;color:#ccc;line-height:1.4;margin-bottom:6px;">'+c.content+'</div>';
    var threadReplies=replies.filter(function(rep){return rep.parent_id===c.id;});
    if(threadReplies.length){
      var replyDiv=document.createElement('div');replyDiv.style.cssText='margin-left:16px;border-left:2px solid #2a2a3e;padding-left:10px;';
      threadReplies.forEach(function(rep){replyDiv.innerHTML+='<div style="padding:6px 0;border-bottom:1px solid #1a1a1a;"><div style="font-size:11px;font-weight:600;color:#7c6af7;margin-bottom:2px;">'+(rep.user_name||'User')+'</div><div style="font-size:12px;color:#aaa;line-height:1.4;">'+rep.content+'</div></div>';});
      div.appendChild(replyDiv);
    }
    list.appendChild(div);
  });
}

function setReply(commentId,userName){
  replyToId=commentId;replyToName=userName;
  document.getElementById('reply-bar').style.display='flex';
  document.getElementById('reply-label').textContent='↩️ Replying to '+userName;
  document.getElementById('comment-input').placeholder='Reply to '+userName+'...';
  document.getElementById('comment-input').focus();
}

document.getElementById('cancel-reply').onclick=function(){
  replyToId=null;replyToName=null;
  document.getElementById('reply-bar').style.display='none';
  document.getElementById('comment-input').placeholder='Write a comment...';
};

async function sendComment(){
  var inp=document.getElementById('comment-input');var text=inp.value.trim();
  if(!text||!currentProjectId)return;
  if(!token){alert('Please sign in to comment.');return;}
  inp.value='';
  var body={content:text};if(replyToId)body.parent_id=replyToId;
  var r=await api('/projects/'+currentProjectId+'/comments','POST',body);
  if(r.ok){
    replyToId=null;replyToName=null;
    document.getElementById('reply-bar').style.display='none';
    document.getElementById('comment-input').placeholder='Write a comment...';
    loadComments();
    var ccEl=document.getElementById('cc-'+currentProjectId);
    if(ccEl)ccEl.textContent=parseInt(ccEl.textContent||0)+1;
  }
}

document.getElementById('comment-send').onclick=sendComment;
document.getElementById('comment-input').onkeydown=function(e){if(e.key==='Enter')sendComment();};
document.getElementById('comments-close').onclick=function(){document.getElementById('comments-mask').classList.remove('on');};
document.getElementById('comments-mask').onclick=function(e){if(e.target===this)this.classList.remove('on');};
