// ── FEED & VIDEO ──────────────────────────

var _scrollDebounce = null;
var soundUnlocked = false;
var liked = {};
var saved = {};

// ── Finds the most visible slide and plays its video ──
function pickAndPlayBestSlide() {
  var feedPg = document.getElementById('pg-feed');
  if (!feedPg || !feedPg.classList.contains('on')) {
    document.querySelectorAll('.slide video').forEach(function(v) { v.pause(); });
    return;
  }
  var best = null, bestScore = -1;
  document.querySelectorAll('.slide').forEach(function(slide) {
    var rect = slide.getBoundingClientRect();
    var visTop = Math.max(rect.top, 0);
    var visBot = Math.min(rect.bottom, window.innerHeight);
    var visible = Math.max(0, visBot - visTop);
    if (visible > bestScore) { bestScore = visible; best = slide; }
  });
  // Pause and mute all videos first
  document.querySelectorAll('.slide video').forEach(function(v) { v.pause(); v.muted = true; v.volume = 1; });
  // Play only the best/most visible slide
  if (best) {
    var vid = best.querySelector('video');
    if (vid) {
      if (soundUnlocked) {
        vid.muted = false; vid.volume = 1;
        vid.onplaying = function() { vid.volume = 1; vid.muted = false; vid.onplaying = null; };
      } else {
        vid.muted = true; vid.volume = 1;
      }
      vid.play().catch(function() { vid.muted = true; vid.play().catch(function() {}); });
    }
  }
}

// ── Watches scroll and plays best video when user stops ──
function setupFeedObserver() {
  if (window._feedObserver) window._feedObserver.disconnect();
  var feedBody = document.getElementById('feed-body');
  if (window._feedScrollHandler) feedBody.removeEventListener('scroll', window._feedScrollHandler);
  window._feedScrollHandler = function() {
    document.querySelectorAll('.slide video').forEach(function(v) { v.muted = true; });
    clearTimeout(_scrollDebounce);
    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
  };
  feedBody.addEventListener('scroll', window._feedScrollHandler, { passive: true });
  window._feedObserver = new IntersectionObserver(function() {
    clearTimeout(_scrollDebounce);
    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
  }, { threshold: 0.8 });
  document.querySelectorAll('.slide').forEach(function(slide) { window._feedObserver.observe(slide); });
}

// ── Loads all projects from Python backend ──
async function loadFeed() {
  var fb = document.getElementById('feed-body');
  fb.innerHTML = '<div style="height:80vh;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:13px;">Loading...</div>';
  
  var r = await api('/projects?limit=20');
  fb.innerHTML = '';
  
  if (!r.ok || !r.data.projects || !r.data.projects.length) {
    fb.innerHTML = '<div style="height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;"><div style="font-size:44px;">💡</div><div style="color:rgba(255,255,255,0.5);font-size:14px;text-align:center;padding:0 2rem;">No projects yet!<br>Post your first idea.</div></div>';
    return;
  }
  
  r.data.projects.forEach(function(p) { fb.appendChild(buildSlide(p)); });
  setupFeedObserver();
  
  // Auto play first video
  setTimeout(function() {
    var firstSlide = fb.querySelector('.slide');
    if (firstSlide) {
      var vid = firstSlide.querySelector('video');
      if (vid) { vid.muted = true; vid.play().catch(function() {}); }
    }
  }, 400);
}

// ── Shows who invested or collaborated on a project ──
async function showStatUsers(projectId, type) {
  var sheet = document.getElementById('stat-users-sheet');
  var title = document.getElementById('stat-users-title');
  var list = document.getElementById('stat-users-list');
  
  // Set the title based on type
  if (type === 'invest') title.textContent = '💰 Investors';
  else if (type === 'collab') title.textContent = '⚡ Collaborators';
  else if (type === 'likes') title.textContent = '❤️ Liked by';
  else title.textContent = '👁 Views';
  
  list.innerHTML = '<div style="text-align:center;padding:2rem;color:#555;">Loading...</div>';
  sheet.classList.add('on');
  
  // Fetch from Python backend
  var r = await api('/projects/' + projectId + '/stat-users?type=' + type);
  
  if (!r.ok || !r.data.users || !r.data.users.length) {
    list.innerHTML = '<div class="req-empty">No ' + type + 's yet</div>';
    return;
  }
  
  list.innerHTML = '';
  r.data.users.forEach(function(u) {
    var q = clr(u.id);
    var item = document.createElement('div');
    item.className = 'req-item';
    item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #1a1a1a;cursor:pointer;';
    item.innerHTML =
      '<div style="width:44px;height:44px;border-radius:50%;background:' + q.bg + ';color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">' + ini(u.name) + '</div>' +
      '<div><div style="font-size:14px;font-weight:600;color:#fff;">' + (u.name || 'User') + '</div>' +
      '<div style="font-size:12px;color:#666;">' + (u.location || 'Entrepreneur') + '</div></div>';
    item.onclick = function() {
      sheet.classList.remove('on');
      openUserProfile(u.id, u.name, u.avatar, u.location);
    };
    list.appendChild(item);
  });
}

// ── Builds a single video slide/card ──
function buildSlide(p) {
  var s = document.createElement('div');
  s.className = 'slide';
  var q = clr(p.id);
  
  // FIX: Use looking_for instead of mode (matches Python backend)
  var lookingFor = p.looking_for || p.mode || 'both';
  var modeText = lookingFor === 'collab' ? '⚡ Seeking Collaborators' :
                 lookingFor === 'invest' ? '💰 Seeking Investors' :
                 '⚡💰 Collab + Invest';

  // ── Video or placeholder ──
  if (p.video_url) {
    var vid = document.createElement('video');
    vid.src = p.video_url;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('loop', '');
    vid.muted = true;
    vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
    s.appendChild(vid);

    // Sound hint shown until user taps
    var soundHint = document.createElement('div');
    soundHint.className = 'sound-hint';
    soundHint.style.cssText = 'position:absolute;bottom:140px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;z-index:25;pointer-events:none;display:' + (soundUnlocked ? 'none' : 'flex') + ';align-items:center;gap:6px;white-space:nowrap;';
    soundHint.innerHTML = '🔊 Tap video for sound';
    s.appendChild(soundHint);

    // Tap to unlock sound
    s.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.s-info') || e.target.closest('.s-acts') || e.target.closest('.s-right')) return;
      if (!soundUnlocked) {
        soundUnlocked = true;
        document.querySelectorAll('.slide video').forEach(function(v) { if (v !== vid) { v.pause(); v.muted = true; } });
        vid.muted = false; vid.volume = 1;
        vid.play().catch(function() {});
        vid.onplaying = function() { vid.volume = 1; vid.muted = false; vid.onplaying = null; };
        document.querySelectorAll('.sound-hint').forEach(function(h) { h.style.display = 'none'; });
      } else {
        if (vid.paused) { vid.volume = 1; vid.play().catch(function() {}); }
        else { vid.pause(); }
      }
    });
  } else {
    // No video — show colored placeholder with initials
    var ph = document.createElement('div');
    ph.style.cssText = 'position:absolute;inset:0;background:linear-gradient(160deg,' + q.bg + ' 0%,#000 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    var av = document.createElement('div');
    av.style.cssText = 'width:86px;height:86px;border-radius:50%;background:' + q.bg + ';border:3px solid ' + q.c + '44;color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:28px;';
    av.textContent = ini(p.creator_name);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.3);';
    lbl.textContent = 'No video — swipe to connect';
    ph.appendChild(av); ph.appendChild(lbl); s.appendChild(ph);
  }

  // ── Gradient overlay ──
  var g = document.createElement('div');
  g.className = 's-grad';
  s.appendChild(g);

  // ── Progress bar at top ──
  var pr = document.createElement('div'); pr.className = 'prog';
  var pf = document.createElement('div'); pf.className = 'prog-fill'; pf.id = 'pf-' + p.id;
  pr.appendChild(pf); s.appendChild(pr);
  var w = 0;
  var pt = setInterval(function() {
    w += 0.2;
    var el = document.getElementById('pf-' + p.id);
    if (!el) { clearInterval(pt); return; }
    if (w >= 100) { clearInterval(pt); return; }
    el.style.width = w + '%';
  }, 100);

  // ── Right side buttons (Like, Save, Comment, Share) ──
  var ra = document.createElement('div'); ra.className = 's-right';
  ra.innerHTML =
    '<button class="s-rbtn" id="lb-' + p.id + '"><div class="s-rico" id="li-' + p.id + '">🤍</div><div class="s-rlbl">Like</div></button>' +
    '<button class="s-rbtn" id="sb-' + p.id + '"><div class="s-rico" id="si-' + p.id + '">🔖</div><div class="s-rlbl">Save</div></button>' +
    '<button class="s-rbtn" id="cmb-' + p.id + '"><div class="s-rico">💬</div><div class="s-rlbl" id="cc-' + p.id + '">' + (p.comment_count || 0) + '</div></button>' +
    '<button class="s-rbtn" id="shb-' + p.id + '"><div class="s-rico">↗</div><div class="s-rlbl">Share</div></button>';
  s.appendChild(ra);

  setTimeout(function() {
    var lb = document.getElementById('lb-' + p.id);
    var sb2 = document.getElementById('sb-' + p.id);
    var cmb = document.getElementById('cmb-' + p.id);
    var shb = document.getElementById('shb-' + p.id);
    if (lb) lb.onclick = function() {
      var ico = document.getElementById('li-' + p.id);
      if (liked[p.id]) { liked[p.id] = false; ico.textContent = '🤍'; }
      else { liked[p.id] = true; ico.textContent = '❤️'; showToast(p.id, '❤️ Liked!', 'rgba(226,75,74,0.9)'); }
    };
    if (sb2) sb2.onclick = function() {
      var ico = document.getElementById('si-' + p.id);
      if (saved[p.id]) { saved[p.id] = false; ico.textContent = '🔖'; }
      else { saved[p.id] = true; ico.textContent = '⭐'; showToast(p.id, '⭐ Saved!', 'rgba(232,160,32,0.9)'); }
    };
    if (cmb) cmb.onclick = function() { openComments(p.id, p.title); };
    if (shb) shb.onclick = function() {
      if (navigator.share) navigator.share({ title: p.title, url: location.href });
      else { navigator.clipboard && navigator.clipboard.writeText(location.href).then(function() { showToast(p.id, '🔗 Copied!', 'rgba(124,106,247,0.9)'); }); }
    };
  }, 0);

  // ── Info area (avatar, name, title, description) ──
  var info = document.createElement('div'); info.className = 's-info';
  var avatarRow = document.createElement('button');
  avatarRow.style.cssText = 'display:flex;align-items:center;margin-bottom:4px;cursor:pointer;background:none;border:none;padding:4px 0;width:auto;-webkit-appearance:none;';
  avatarRow.onclick = function(e) { e.stopPropagation(); e.preventDefault(); openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location); };

  var avatarEl = document.createElement('div');
  avatarEl.style.cssText = 'width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-right:8px;border:2px solid rgba(255,255,255,0.5);background:' + q.bg + ';color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;';
  if (p.creator_avatar) {
    var avImg = document.createElement('img');
    avImg.src = p.creator_avatar;
    avImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    avImg.onerror = function() { this.parentElement.textContent = ini(p.creator_name); };
    avatarEl.appendChild(avImg);
  } else {
    avatarEl.textContent = ini(p.creator_name);
  }

  var nameCol = document.createElement('div'); nameCol.style.cssText = 'text-align:left;';
  nameCol.innerHTML = '<div class="s-handle">@' + (p.creator_name || 'user').toLowerCase().replace(/\s+/g, '_') + '</div><div class="s-loc">' + (p.creator_location || 'Entrepreneur') + '</div>';
  avatarRow.appendChild(avatarEl); avatarRow.appendChild(nameCol);

  var modeDiv = document.createElement('div'); modeDiv.className = 's-mode'; modeDiv.textContent = modeText;
  var titleDiv = document.createElement('div'); titleDiv.className = 's-title'; titleDiv.textContent = p.title;
  var descDiv = document.createElement('div'); descDiv.className = 's-desc'; descDiv.textContent = (p.description || '').substring(0, 110) + (p.description && p.description.length > 110 ? '...' : '');

  // Stats row (Invests, Collabs, Likes, Views) — clicking shows WHO
  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;gap:16px;margin-top:6px;';
  statsRow.innerHTML =
    '<button onclick="showStatUsers(' + p.id + ',\'invest\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">💰 ' + (p.invest_count || 0) + '</button>' +
    '<button onclick="showStatUsers(' + p.id + ',\'collab\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">⚡ ' + (p.collab_count || 0) + '</button>' +
    '<button onclick="showStatUsers(' + p.id + ',\'likes\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">❤️ ' + (p.like_count || 0) + '</button>' +
    '<span style="color:rgba(255,255,255,0.4);font-size:11px;">👁 ' + (p.view_count || 0) + '</span>';

  info.appendChild(avatarRow); info.appendChild(modeDiv); info.appendChild(titleDiv); info.appendChild(descDiv); info.appendChild(statsRow);
  s.appendChild(info);

  // ── Action buttons (Invest, Collab, Profile) ──
  var acts = document.createElement('div'); acts.className = 's-acts';
  var ib = null, cb = null;

  // FIX: Use looking_for instead of mode
  if (lookingFor === 'invest' || lookingFor === 'both') {
    ib = document.createElement('button'); ib.className = 's-btn btn-i'; ib.textContent = '💰 Invest';
    ib.onclick = function() {
      if (ib.classList.contains('btn-sent')) return;
      ib.classList.add('btn-sent'); ib.textContent = '💰 Sent!';
      showToast(p.id, '💰 Investment sent!', 'rgba(232,160,32,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'invest' });
    };
    acts.appendChild(ib);
  }

  if (lookingFor === 'collab' || lookingFor === 'both') {
    cb = document.createElement('button'); cb.className = 's-btn btn-c'; cb.textContent = '⚡ Collab';
    cb.onclick = function() {
      if (cb.classList.contains('btn-sent')) return;
      cb.classList.add('btn-sent'); cb.textContent = '⚡ Sent!';
      showToast(p.id, '⚡ Collab request sent!', 'rgba(124,106,247,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'collab' });
    };
    acts.appendChild(cb);
  }

  // Profile button
  var profb = document.createElement('button'); profb.className = 's-btn btn-p'; profb.textContent = '👤';
  profb.onclick = function(e) {
    e.stopPropagation(); e.preventDefault();
    try { openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location); }
    catch(err) { alert('Error opening profile: ' + err.message); }
  };
  acts.appendChild(profb);
  s.appendChild(acts);

  // ── Swipe overlays (show when swiping) ──
  var si = null, sc2 = null;
  if (lookingFor === 'invest' || lookingFor === 'both') {
    si = document.createElement('div'); si.className = 'swipe-invest'; si.textContent = '💰 Invest'; s.appendChild(si);
  }
  if (lookingFor === 'collab' || lookingFor === 'both') {
    sc2 = document.createElement('div'); sc2.className = 'swipe-collab'; sc2.textContent = '⚡ Collab'; s.appendChild(sc2);
  }

  // ── Touch swipe gestures ──
  var txStart = 0, txCur = 0, swiping = false;
  s.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    if (e.target.closest('.s-info') || e.target.closest('.s-acts') || e.target.closest('.s-right')) return;
    txStart = e.touches[0].clientX; txCur = txStart; swiping = true;
  }, { passive: true });
  s.addEventListener('touchmove', function(e) {
    if (!swiping || e.touches.length !== 1) return;
    txCur = e.touches[0].clientX;
    var dx = txCur - txStart;
    if (Math.abs(dx) > 20) {
      if (dx < 0 && si) { si.style.opacity = Math.min(1, Math.abs(dx) / 80); if (sc2) sc2.style.opacity = 0; }
      else if (dx > 0 && sc2) { sc2.style.opacity = Math.min(1, dx / 80); if (si) si.style.opacity = 0; }
    }
  }, { passive: true });
  s.addEventListener('touchend', function() {
    if (!swiping) return; swiping = false;
    var dx = txCur - txStart;
    if (si) si.style.opacity = 0; if (sc2) sc2.style.opacity = 0;
    if (Math.abs(dx) < 60) return;
    // Swipe left = Invest, Swipe right = Collab
    if (dx < -60 && ib && !ib.classList.contains('btn-sent')) {
      ib.classList.add('btn-sent'); ib.textContent = '💰 Sent!';
      showToast(p.id, '💰 Investment request sent!', 'rgba(232,160,32,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'invest' });
    } else if (dx > 60 && cb && !cb.classList.contains('btn-sent')) {
      cb.classList.add('btn-sent'); cb.textContent = '⚡ Sent!';
      showToast(p.id, '⚡ Collab request sent!', 'rgba(124,106,247,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'collab' });
    }
  }, { passive: true });

  // Toast notification for this slide
  var t = document.createElement('div'); t.className = 'toast'; t.id = 't-' + p.id;
  s.appendChild(t);

  // Track view count
  api('/projects/' + p.id + '/view', 'POST');

  return s;
}
