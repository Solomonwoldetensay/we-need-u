// ══════════════════════════════════════════════════════
// FEED.JS — THE TIKTOK VIDEO FEED
// ══════════════════════════════════════════════════════
//
// This file controls the main video feed screen.
// It builds each startup pitch "slide" and handles:
//
// ✅ Loading projects from the backend
// ✅ Building each video slide card
// ✅ Playing/pausing videos as user scrolls
// ✅ Sound unlock on first tap
// ✅ Like, Save, Comment, Share buttons
// ✅ Swipe left = Invest, Swipe right = Collab
// ✅ Progress bar animation on each slide
// ✅ Showing who invested/collaborated/liked
//
// Depends on core.js being loaded first!
// core.js provides: api(), clr(), ini(), showToast()
// ══════════════════════════════════════════════════════


// ── SECTION 1: GLOBAL VARIABLES ───────────────────────

var _scrollDebounce = null;
// Timer used to delay video switching while user is scrolling
// Without this, video would try to switch dozens of times per second
// clearTimeout stops the old timer, setTimeout starts a new one
// Only fires pickAndPlayBestSlide() 150ms AFTER scrolling stops

var soundUnlocked = false;
// Tracks whether user has tapped to unlock sound
// false = all videos are MUTED (browsers block autoplay with sound)
// true  = videos play WITH sound after user's first tap
// Starts false because browsers require a user gesture before playing sound

var liked = {};
// Tracks which projects the current user has liked
// Example after liking project 5: { '5': true }
// Example after unliking: { '5': false }
// {} = empty object, nothing liked yet

var saved = {};
// Tracks which projects the current user has saved/bookmarked
// Same structure as liked: { projectId: true/false }
// {} = empty object, nothing saved yet


// ── SECTION 2: VIDEO PLAYBACK ─────────────────────────

// Finds the video slide most visible on screen and plays it
// Pauses all other slides
// Called after scrolling stops (via _scrollDebounce timer)
function pickAndPlayBestSlide() {

  var feedPg = document.getElementById('pg-feed');
  // Get the feed screen element

  if (!feedPg || !feedPg.classList.contains('on')) {
    // If feed screen is not currently visible (user is on another screen)
    document.querySelectorAll('.slide video').forEach(function(v) { v.pause(); });
    // Pause ALL videos to save battery and data
    return;
    // Stop here — don't try to play anything
  }

  var best = null, bestScore = -1;
  // best = the slide element most visible on screen
  // bestScore = how many pixels of that slide are visible
  // Start with -1 so any slide beats the starting score

  document.querySelectorAll('.slide').forEach(function(slide) {
    // Loop through every slide in the feed

    var rect = slide.getBoundingClientRect();
    // Gets the slide's position relative to the visible screen
    // rect.top = distance from top of screen to top of slide
    // rect.bottom = distance from top of screen to bottom of slide

    var visTop = Math.max(rect.top, 0);
    // Top of the VISIBLE part of the slide
    // Math.max(rect.top, 0) prevents negative numbers
    // If slide starts above screen (rect.top = -100), visTop = 0

    var visBot = Math.min(rect.bottom, window.innerHeight);
    // Bottom of the VISIBLE part of the slide
    // Math.min stops it at the bottom of the screen
    // If slide goes below screen (rect.bottom = 900, screen = 844), visBot = 844

    var visible = Math.max(0, visBot - visTop);
    // How many pixels of this slide are visible
    // Math.max(0,...) prevents negative numbers if slide is off screen

    if (visible > bestScore) { bestScore = visible; best = slide; }
    // If this slide is more visible than the previous best → update best
  });

  document.querySelectorAll('.slide video').forEach(function(v) { v.pause(); v.muted = true; v.volume = 1; });
  // Pause and mute ALL videos first
  // v.volume = 1 resets volume to max so it's ready when unmuted

  if (best) {
    // If we found a best slide

    var vid = best.querySelector('video');
    // Get the video element inside the best slide

    if (vid) {
      // If this slide actually has a video (not just a colored placeholder)

      if (soundUnlocked) {
        // User has already tapped to unlock sound
        vid.muted = false; vid.volume = 1;
        // Unmute this video and set volume to max
        vid.onplaying = function() { vid.volume = 1; vid.muted = false; vid.onplaying = null; };
        // Extra safety: when video actually starts playing, make sure it's unmuted
        // vid.onplaying = null removes this handler after it runs once
      } else {
        // Sound not unlocked yet — keep video muted
        vid.muted = true; vid.volume = 1;
        // Still set volume=1 so it's ready when sound unlocks
      }

      vid.play().catch(function() { vid.muted = true; vid.play().catch(function() {}); });
      // Try to play the video
      // .catch = if play fails (browser blocked it) → mute it and try again
      // Browsers sometimes block unmuted autoplay → muting fixes this
    }
  }
}


// ── SECTION 3: SCROLL OBSERVER ────────────────────────

// Sets up scroll detection and IntersectionObserver
// Called once after the feed loads
// Makes videos auto-play/pause as user scrolls
function setupFeedObserver() {

  if (window._feedObserver) window._feedObserver.disconnect();
  // If an old observer exists from a previous feed load → disconnect it
  // Prevents duplicate observers causing double-play bugs

  var feedBody = document.getElementById('feed-body');
  // The scrollable container holding all video slides

  if (window._feedScrollHandler) feedBody.removeEventListener('scroll', window._feedScrollHandler);
  // Remove old scroll listener if it exists
  // Prevents multiple scroll handlers stacking up on feed reload

  window._feedScrollHandler = function() {
    // Create the scroll handler function
    // Stored on window so we can remove it later

    document.querySelectorAll('.slide video').forEach(function(v) { v.muted = true; });
    // Immediately mute all videos WHILE scrolling
    // Prevents audio glitches as multiple videos briefly become visible

    clearTimeout(_scrollDebounce);
    // Cancel any pending timer from the last scroll event

    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
    // Start a new timer: 150ms after scrolling stops → find best slide and play it
    // 150ms feels instant but gives the browser time to settle
  };

  feedBody.addEventListener('scroll', window._feedScrollHandler, { passive: true });
  // Listen for scroll events on the feed
  // passive: true = tells browser we won't call preventDefault()
  //                 allows browser to scroll smoothly without waiting for JS

  window._feedObserver = new IntersectionObserver(function() {
    // IntersectionObserver fires when slides enter or leave the visible area
    // This catches cases that scroll events might miss

    clearTimeout(_scrollDebounce);
    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
    // Same debounce as scroll handler
  }, { threshold: 0.8 });
  // threshold: 0.8 = only fires when 80% of a slide is visible
  // Prevents firing too early when slide is just peeking into view

  document.querySelectorAll('.slide').forEach(function(slide) { window._feedObserver.observe(slide); });
  // Tell the observer to watch every slide for visibility changes
}


// ── SECTION 4: LOAD FEED ──────────────────────────────

// Fetches all projects from backend and builds the feed
// Called by core.js enterApp() after login
// Also called when user taps the Feed tab to refresh
async function loadFeed() {

  var fb = document.getElementById('feed-body');
  // The container div that holds all the slides

  fb.innerHTML = '<div style="height:80vh;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:13px;">Loading...</div>';
  // Show "Loading..." while fetching from backend
  // height:80vh = takes up most of the screen

  var r = await api('/projects?limit=20');
  // Fetch up to 20 projects from the backend
  // await = wait for response before continuing
  // Returns: { ok: true, data: { projects: [...] } }

  fb.innerHTML = '';
  // Clear the loading message

  if (!r.ok || !r.data.projects || !r.data.projects.length) {
    // If request failed OR no projects exist yet

    fb.innerHTML = '<div style="height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;"><div style="font-size:44px;">💡</div><div style="color:rgba(255,255,255,0.5);font-size:14px;text-align:center;padding:0 2rem;">No projects yet!<br>Post your first idea.</div></div>';
    // Show empty state with 💡 emoji and message
    return;
    // Stop here — nothing more to do
  }

  r.data.projects.forEach(function(p) { fb.appendChild(buildSlide(p)); });
  // For each project → build a slide card and add it to the feed
  // buildSlide(p) creates the full slide HTML element

  setupFeedObserver();
  // Set up scroll detection now that slides exist in the DOM

  setTimeout(function() {
    // Wait 400ms for slides to fully render before trying to play

    var firstSlide = fb.querySelector('.slide');
    // Get the very first slide in the feed

    if (firstSlide) {
      var vid = firstSlide.querySelector('video');
      // Get its video element

      if (vid) { vid.muted = true; vid.play().catch(function() {}); }
      // Auto-play the first video MUTED
      // Muted = browser allows autoplay without user interaction
    }
  }, 400);
  // 400ms delay = gives browser time to render the DOM before playing
}


// ── SECTION 5: STAT USERS SHEET ───────────────────────

// Shows a bottom sheet listing users for a specific stat
// Called when tapping 💰 Invest, ⚡ Collab, ❤️ Likes, or 👁 Views on a slide
// projectId = which project's stats to show
// type = 'invest', 'collab', 'likes', or 'views'
async function showStatUsers(projectId, type) {

  var sheet = document.getElementById('stat-users-sheet');
  // The bottom sheet element that slides up

  var title = document.getElementById('stat-users-title');
  // The title at the top of the sheet

  var list = document.getElementById('stat-users-list');
  // The scrollable list inside the sheet

  if (type === 'invest') title.textContent = '💰 Investors';
  else if (type === 'collab') title.textContent = '⚡ Collaborators';
  else if (type === 'likes') title.textContent = '❤️ Liked by';
  else title.textContent = '👁 Views';
  // Set the sheet title based on which stat was tapped

  list.innerHTML = '<div style="text-align:center;padding:2rem;color:#555;">Loading...</div>';
  // Show loading while fetching

  sheet.classList.add('on');
  // Show the sheet immediately (with loading state)

  var r = await api('/projects/' + projectId + '/stat-users?type=' + type);
  // Fetch the list of users from backend
  // Example URL: /projects/5/stat-users?type=invest

  if (!r.ok || !r.data.users || !r.data.users.length) {
    list.innerHTML = '<div class="req-empty">No ' + type + 's yet</div>';
    // Show "No invests yet" or "No collabs yet" etc.
    return;
  }

  list.innerHTML = '';
  // Clear loading message

  r.data.users.forEach(function(u) {
    // Loop through each user

    var q = clr(u.id);
    // Get a consistent color for this user based on their ID
    // clr() from core.js returns { bg: '#...', c: '#...' }

    var item = document.createElement('div');
    item.className = 'req-item';
    item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #1a1a1a;cursor:pointer;';
    // Create a row item for this user

    item.innerHTML =
      '<div style="width:44px;height:44px;border-radius:50%;background:' + q.bg + ';color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">' + ini(u.name) + '</div>' +
      // Colored circle with user's initials
      // ini() from core.js returns first letters of name e.g. "SW"

      '<div><div style="font-size:14px;font-weight:600;color:#fff;">' + (u.name || 'User') + '</div>' +
      // User's full name

      '<div style="font-size:12px;color:#666;">' + (u.location || 'Entrepreneur') + '</div></div>';
      // User's location or "Entrepreneur" if none set

    item.onclick = function() {
      sheet.classList.remove('on');
      // Close this sheet first

      openUserProfile(u.id, u.name, u.avatar, u.location);
      // Then open the tapped user's profile modal
      // openUserProfile() is defined in profile.js
    };

    list.appendChild(item);
    // Add this user row to the sheet list
  });
}


// ── SECTION 6: BUILD SLIDE ────────────────────────────

// Creates a single full-screen video slide for one project
// Called by loadFeed() for each project
// p = project object from backend with all project data
// Returns: a div element ready to be added to the feed
function buildSlide(p) {

  var s = document.createElement('div');
  s.className = 'slide';
  // Create the main slide container div
  // CSS makes this full screen height with scroll-snap

  var q = clr(p.id);
  // Get a consistent color pair for this project
  // Used for the placeholder background when there's no video

  // ── DETERMINE MODE ──────────────────────────────────
  var mode = p.mode || p.looking_for || 'both';
  // What the creator is looking for:
  // p.mode = new Node.js backend field name
  // p.looking_for = old field name (fallback)
  // 'both' = default if neither exists

  var modeText = mode === 'collab' ? '⚡ Seeking Collaborators' :
                 mode === 'invest' ? '💰 Seeking Investors' :
                 '⚡💰 Collab + Invest';
  // Human readable mode text shown on the slide


  // ── VIDEO OR PLACEHOLDER ─────────────────────────────
  if (p.video_url) {
    // Project has a video → show it

    var vid = document.createElement('video');
    vid.src = p.video_url;
    // Set the video source URL (from Cloudinary)

    vid.setAttribute('playsinline', '');
    // REQUIRED for iPhone: plays video inline instead of going fullscreen
    // Without this, iPhone would open video in native fullscreen player

    vid.setAttribute('loop', '');
    // Video loops back to start when it ends

    vid.muted = true;
    // Start muted so browser allows autoplay
    // User taps to unlock sound

    vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
    // Cover the entire slide area
    // object-fit:cover = fills space without stretching (may crop sides)
    // pointer-events:none = touch events pass through to the slide (for swipe detection)

    s.appendChild(vid);
    // Add video to the slide

    var soundHint = document.createElement('div');
    soundHint.className = 'sound-hint';
    soundHint.style.cssText = 'position:absolute;bottom:140px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;z-index:25;pointer-events:none;display:' + (soundUnlocked ? 'none' : 'flex') + ';align-items:center;gap:6px;white-space:nowrap;';
    // "🔊 Tap video for sound" hint shown above the buttons
    // Only shows if sound hasn't been unlocked yet (soundUnlocked = false)
    // bottom:140px = sits above the action buttons
    // pointer-events:none = doesn't block swipe/tap detection

    soundHint.innerHTML = '🔊 Tap video for sound';
    s.appendChild(soundHint);
    // Add sound hint to the slide

    s.addEventListener('click', function(e) {
      // Listen for taps on this slide

      if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.s-info') || e.target.closest('.s-acts') || e.target.closest('.s-right')) return;
      // IGNORE taps on buttons, info text, action buttons, and right-side buttons
      // Only respond to taps on the video itself

      if (!soundUnlocked) {
        // First time tapping → unlock sound for ALL videos

        soundUnlocked = true;
        // Remember that sound is now unlocked globally

        document.querySelectorAll('.slide video').forEach(function(v) { if (v !== vid) { v.pause(); v.muted = true; } });
        // Pause and mute all OTHER videos
        // We keep this video (vid) playing

        vid.muted = false; vid.volume = 1;
        // Unmute THIS video and set volume to max

        vid.play().catch(function() {});
        // Play the video (in case it was paused)

        vid.onplaying = function() { vid.volume = 1; vid.muted = false; vid.onplaying = null; };
        // Extra safety: when video confirms it's playing, ensure it's unmuted
        // vid.onplaying = null removes this handler so it only runs once

        document.querySelectorAll('.sound-hint').forEach(function(h) { h.style.display = 'none'; });
        // Hide ALL sound hint messages across all slides

      } else {
        // Sound already unlocked → toggle play/pause on tap

        if (vid.paused) { vid.volume = 1; vid.play().catch(function() {}); }
        // If paused → play it
        else { vid.pause(); }
        // If playing → pause it
      }
    });

  } else {
    // No video → show a colored placeholder with creator's initials

    var ph = document.createElement('div');
    ph.style.cssText = 'position:absolute;inset:0;background:linear-gradient(160deg,' + q.bg + ' 0%,#000 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    // Full screen gradient background using the project's color

    var av = document.createElement('div');
    av.style.cssText = 'width:86px;height:86px;border-radius:50%;background:' + q.bg + ';border:3px solid ' + q.c + '44;color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:28px;';
    // Large circle with creator's initials
    // q.c + '44' adds 44 hex opacity (27%) to the border color

    av.textContent = ini(p.creator_name);
    // ini() from core.js → "Solomon Woldetensay" becomes "SW"

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.3);';
    lbl.textContent = 'No video — swipe to connect';
    // Small hint text below the avatar

    ph.appendChild(av); ph.appendChild(lbl); s.appendChild(ph);
    // Build: placeholder → avatar circle → hint text → add to slide
  }


  // ── GRADIENT OVERLAY ────────────────────────────────
  var g = document.createElement('div');
  g.className = 's-grad';
  s.appendChild(g);
  // Dark gradient from bottom to top of slide
  // Makes white text readable over bright videos
  // CSS: background: linear-gradient(to top, rgba(0,0,0,0.93), transparent 50%)


  // ── PROGRESS BAR ────────────────────────────────────
  var pr = document.createElement('div'); pr.className = 'prog';
  // Thin bar at very top of slide (like Instagram Stories)

  var pf = document.createElement('div'); pf.className = 'prog-fill'; pf.id = 'pf-' + p.id;
  // The colored fill inside the progress bar
  // id='pf-5' for project with id=5, so we can find it in the interval

  pr.appendChild(pf); s.appendChild(pr);
  // Add fill inside bar, add bar to slide

  var w = 0;
  // Starting width = 0%

  var pt = setInterval(function() {
    // Run every 100ms to animate the progress bar

    w += 0.2;
    // Increase width by 0.2% every 100ms
    // 100ms × 500 steps × 0.2% = 100% in 50 seconds

    var el = document.getElementById('pf-' + p.id);
    // Find the progress fill element for this specific project

    if (!el) { clearInterval(pt); return; }
    // If element no longer exists (slide removed) → stop the interval

    if (w >= 100) { clearInterval(pt); return; }
    // If bar is full → stop the interval

    el.style.width = w + '%';
    // Update the bar width visually
  }, 100);


  // ── RIGHT SIDE BUTTONS ──────────────────────────────
  var ra = document.createElement('div'); ra.className = 's-right';
  // Vertical column of buttons on the right side of the slide
  // Like TikTok's like/comment/share column

  ra.innerHTML =
    '<button class="s-rbtn" id="lb-' + p.id + '"><div class="s-rico" id="li-' + p.id + '">🤍</div><div class="s-rlbl">Like</div></button>' +
    // ❤️ Like button. id='lb-5' for project 5. Inner icon id='li-5'
    // Starts with 🤍 (empty heart). Turns ❤️ when liked

    '<button class="s-rbtn" id="sb-' + p.id + '"><div class="s-rico" id="si-' + p.id + '">🔖</div><div class="s-rlbl">Save</div></button>' +
    // 🔖 Save button. Turns ⭐ when saved

    '<button class="s-rbtn" id="cmb-' + p.id + '"><div class="s-rico">💬</div><div class="s-rlbl" id="cc-' + p.id + '">' + (p.comment_count || 0) + '</div></button>' +
    // 💬 Comments button. Shows comment count below icon
    // id='cc-5' for the count label — comments.js updates this when user comments

    '<button class="s-rbtn" id="shb-' + p.id + '"><div class="s-rico">↗</div><div class="s-rlbl">Share</div></button>';
    // ↗ Share button. Shares the app URL

  s.appendChild(ra);
  // Add the right button column to the slide

  setTimeout(function() {
    // Wait for DOM to update before adding click handlers
    // setTimeout(fn, 0) = run after current execution finishes

    var lb = document.getElementById('lb-' + p.id);
    var sb2 = document.getElementById('sb-' + p.id);
    var cmb = document.getElementById('cmb-' + p.id);
    var shb = document.getElementById('shb-' + p.id);
    // Get each button element by their unique IDs

    if (lb) lb.onclick = function() {
      // Like button clicked

      var ico = document.getElementById('li-' + p.id);
      // Get the heart emoji icon element

      if (liked[p.id]) {
        // Already liked → unlike it
        liked[p.id] = false;
        ico.textContent = '🤍';
        // Switch back to empty heart
      } else {
        // Not liked yet → like it
        liked[p.id] = true;
        ico.textContent = '❤️';
        // Switch to filled heart
        showToast(p.id, '❤️ Liked!', 'rgba(226,75,74,0.9)');
        // Show red popup toast notification
        // showToast() from core.js
      }
    };

    if (sb2) sb2.onclick = function() {
      // Save button clicked

      var ico = document.getElementById('si-' + p.id);
      // Get the bookmark icon element

      if (saved[p.id]) {
        // Already saved → unsave it
        saved[p.id] = false;
        ico.textContent = '🔖';
        // Switch back to bookmark icon
      } else {
        // Not saved → save it
        saved[p.id] = true;
        ico.textContent = '⭐';
        // Switch to star icon
        showToast(p.id, '⭐ Saved!', 'rgba(232,160,32,0.9)');
        // Show gold popup toast notification
      }
    };

    if (cmb) cmb.onclick = function() { openComments(p.id, p.title); };
    // Comment button → opens the comments modal
    // openComments() from comments.js

    if (shb) shb.onclick = function() {
      // Share button clicked

      if (navigator.share) navigator.share({ title: p.title, url: location.href });
      // If browser supports native share → open the share sheet
      // Shows: AirDrop, Messages, Copy Link, etc.

      else { navigator.clipboard && navigator.clipboard.writeText(location.href).then(function() { showToast(p.id, '🔗 Copied!', 'rgba(124,106,247,0.9)'); }); }
      // Fallback: copy the URL to clipboard and show purple "Copied!" toast
      // navigator.clipboard might not exist in older browsers → && check first
    };
  }, 0);


  // ── CREATOR INFO (BOTTOM LEFT) ───────────────────────
  var info = document.createElement('div'); info.className = 's-info';
  // Container for all the text info at the bottom left of the slide

  var avatarRow = document.createElement('button');
  avatarRow.style.cssText = 'display:flex;align-items:center;margin-bottom:4px;cursor:pointer;background:none;border:none;padding:4px 0;width:auto;-webkit-appearance:none;';
  // Clickable row with avatar + name. Opens creator's profile when tapped
  // background:none; border:none = looks like a div, not a button
  // -webkit-appearance:none = removes default iOS button styling

  avatarRow.onclick = function(e) {
    e.stopPropagation();
    // Stop the click from reaching the slide (would toggle play/pause)
    e.preventDefault();
    // Prevent any default browser behavior
    openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location);
    // Open the creator's profile modal
    // openUserProfile() from profile.js
  };

  var avatarEl = document.createElement('div');
  avatarEl.style.cssText = 'width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-right:8px;border:2px solid rgba(255,255,255,0.5);background:' + q.bg + ';color:' + q.c + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;';
  // Small circular avatar for the creator
  // flex-shrink:0 = never shrinks smaller than 36x36px

  if (p.creator_avatar) {
    // Creator has a profile photo

    var avImg = document.createElement('img');
    avImg.src = p.creator_avatar;
    // Load their actual profile photo

    avImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    // Fill the circle without stretching

    avImg.onerror = function() { this.parentElement.textContent = ini(p.creator_name); };
    // If photo fails to load → show initials instead

    avatarEl.appendChild(avImg);
  } else {
    avatarEl.textContent = ini(p.creator_name);
    // No photo → show initials (e.g. "SW" for Solomon Woldetensay)
  }

  var nameCol = document.createElement('div'); nameCol.style.cssText = 'text-align:left;';
  nameCol.innerHTML =
    '<div class="s-handle">@' + (p.creator_name || 'user').toLowerCase().replace(/\s+/g, '_') + '</div>' +
    // @solomon_woldetensay style handle
    // .toLowerCase() → all lowercase
    // .replace(/\s+/g, '_') → spaces become underscores

    '<div class="s-loc">' + (p.creator_location || 'Entrepreneur') + '</div>';
    // Location or "Entrepreneur" if none set

  avatarRow.appendChild(avatarEl); avatarRow.appendChild(nameCol);
  // Build avatar row: circle + name column

  var modeDiv = document.createElement('div'); modeDiv.className = 's-mode'; modeDiv.textContent = modeText;
  // Pill badge: "⚡ Seeking Collaborators" etc.

  var titleDiv = document.createElement('div'); titleDiv.className = 's-title'; titleDiv.textContent = p.title;
  // Project title in large bold text

  var descDiv = document.createElement('div'); descDiv.className = 's-desc';
  descDiv.textContent = (p.description || '').substring(0, 110) + (p.description && p.description.length > 110 ? '...' : '');
  // Project description, cut off at 110 characters
  // If longer than 110 chars → add "..." at the end
  // substring(0, 110) = first 110 characters only

  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;gap:16px;margin-top:6px;';
  // Row of small stat buttons at the very bottom of the info area

  statsRow.innerHTML =
    '<button onclick="showStatUsers(\'' + p.id + '\',\'invest\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">💰 ' + (p.invest_count || 0) + '</button>' +
    // 💰 count button → shows who wants to invest

    '<button onclick="showStatUsers(\'' + p.id + '\',\'collab\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">⚡ ' + (p.collab_count || 0) + '</button>' +
    // ⚡ count button → shows who wants to collab

    '<button onclick="showStatUsers(\'' + p.id + '\',\'likes\')" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;">❤️ ' + (p.like_count || 0) + '</button>' +
    // ❤️ count button → shows who liked this

    '<span style="color:rgba(255,255,255,0.4);font-size:11px;">👁 ' + (p.view_count || 0) + '</span>';
    // 👁 view count (not clickable, just informational)

  info.appendChild(avatarRow);
  info.appendChild(modeDiv);
  info.appendChild(titleDiv);
  info.appendChild(descDiv);
  info.appendChild(statsRow);
  // Stack all info elements: avatar → mode badge → title → description → stats

  s.appendChild(info);
  // Add info section to the slide


  // ── ACTION BUTTONS (BOTTOM) ──────────────────────────
  var acts = document.createElement('div'); acts.className = 's-acts';
  // Row of action buttons at the very bottom of the slide
  // Invest button | Collab button | 👤 Profile button

  var ib = null, cb = null;
  // ib = invest button reference (used by swipe gesture later)
  // cb = collab button reference (used by swipe gesture later)
  // null = not created yet (only created if mode matches)

  if (mode === 'invest' || mode === 'both') {
    // Only show Invest button if creator is looking for investors

    ib = document.createElement('button'); ib.className = 's-btn btn-i'; ib.textContent = '💰 Invest';
    // Gold "💰 Invest" button

    ib.onclick = function() {
      if (ib.classList.contains('btn-sent')) return;
      // If already sent → ignore the click (prevent double-sending)

      ib.classList.add('btn-sent'); ib.textContent = '💰 Sent!';
      // Add btn-sent class (makes button semi-transparent)
      // Change text to "💰 Sent!" to confirm

      showToast(p.id, '💰 Investment sent!', 'rgba(232,160,32,0.95)');
      // Show gold popup notification on the slide

      api('/matches/swipe', 'POST', { project_id: p.id, action: 'invest' });
      // Send invest request to backend
      // Backend creates a match record with status 'pending'
    };
    acts.appendChild(ib);
  }

  if (mode === 'collab' || mode === 'both') {
    // Only show Collab button if creator is looking for collaborators

    cb = document.createElement('button'); cb.className = 's-btn btn-c'; cb.textContent = '⚡ Collab';
    // Purple "⚡ Collab" button

    cb.onclick = function() {
      if (cb.classList.contains('btn-sent')) return;
      // Prevent double-sending

      cb.classList.add('btn-sent'); cb.textContent = '⚡ Sent!';
      // Mark as sent and update text

      showToast(p.id, '⚡ Collab request sent!', 'rgba(124,106,247,0.95)');
      // Show purple popup notification

      api('/matches/swipe', 'POST', { project_id: p.id, action: 'collab' });
      // Send collab request to backend
    };
    acts.appendChild(cb);
  }

  var profb = document.createElement('button'); profb.className = 's-btn btn-p'; profb.textContent = '👤';
  // Small 👤 profile button on the right
  // Opens the creator's profile modal

  profb.onclick = function(e) {
    e.stopPropagation(); e.preventDefault();
    // Stop tap from toggling video play/pause

    try { openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location); }
    catch(err) { alert('Error opening profile: ' + err.message); }
    // Try to open profile, show error alert if something goes wrong
  };
  acts.appendChild(profb);
  s.appendChild(acts);
  // Add all action buttons to the slide


  // ── SWIPE GESTURE INDICATORS ─────────────────────────
  var si = null, sc2 = null;
  // si = invest indicator (left swipe)
  // sc2 = collab indicator (right swipe)

  if (mode === 'invest' || mode === 'both') {
    si = document.createElement('div'); si.className = 'swipe-invest'; si.textContent = '💰 Invest'; s.appendChild(si);
    // Gold "💰 Invest" label that appears when swiping left
    // Starts invisible (opacity:0), becomes visible during swipe
  }
  if (mode === 'collab' || mode === 'both') {
    sc2 = document.createElement('div'); sc2.className = 'swipe-collab'; sc2.textContent = '⚡ Collab'; s.appendChild(sc2);
    // Purple "⚡ Collab" label that appears when swiping right
  }


  // ── SWIPE GESTURE DETECTION ──────────────────────────
  var txStart = 0, txCur = 0, swiping = false;
  // txStart = x position where finger first touched
  // txCur = current x position of finger
  // swiping = true while finger is moving horizontally

  s.addEventListener('touchstart', function(e) {
    // Finger touches the screen

    if (e.touches.length !== 1) return;
    // Ignore multi-finger touches (pinch zoom etc.)

    if (e.target.closest('.s-info') || e.target.closest('.s-acts') || e.target.closest('.s-right')) return;
    // Ignore touches on text info, action buttons, and right buttons
    // Only detect swipes on the video/background area

    txStart = e.touches[0].clientX; txCur = txStart; swiping = true;
    // Record starting position and begin tracking swipe
  }, { passive: true });
  // passive:true = browser can scroll normally without waiting for this handler

  s.addEventListener('touchmove', function(e) {
    // Finger is moving across the screen

    if (!swiping || e.touches.length !== 1) return;
    // Only track if we started a valid swipe

    txCur = e.touches[0].clientX;
    // Update current finger position

    var dx = txCur - txStart;
    // dx = how far finger has moved horizontally
    // Negative dx = swiping LEFT (towards invest)
    // Positive dx = swiping RIGHT (towards collab)

    if (Math.abs(dx) > 20) {
      // Only show indicators after moving more than 20px
      // Prevents accidental triggers from tiny movements

      if (dx < 0 && si) {
        // Swiping LEFT → show invest indicator
        si.style.opacity = Math.min(1, Math.abs(dx) / 80);
        // Fade in based on swipe distance (fully visible at 80px)
        if (sc2) sc2.style.opacity = 0;
        // Hide collab indicator
      }
      else if (dx > 0 && sc2) {
        // Swiping RIGHT → show collab indicator
        sc2.style.opacity = Math.min(1, dx / 80);
        // Fade in based on swipe distance
        if (si) si.style.opacity = 0;
        // Hide invest indicator
      }
    }
  }, { passive: true });

  s.addEventListener('touchend', function() {
    // Finger lifted off screen

    if (!swiping) return; swiping = false;
    // Stop tracking

    var dx = txCur - txStart;
    // Final swipe distance

    if (si) si.style.opacity = 0; if (sc2) sc2.style.opacity = 0;
    // Hide both indicators

    if (Math.abs(dx) < 60) return;
    // If swipe was less than 60px → too short, ignore it

    if (dx < -60 && ib && !ib.classList.contains('btn-sent')) {
      // Swiped LEFT more than 60px AND invest button exists AND not already sent

      ib.classList.add('btn-sent'); ib.textContent = '💰 Sent!';
      showToast(p.id, '💰 Investment request sent!', 'rgba(232,160,32,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'invest' });
      // Same as tapping the invest button directly
    }
    else if (dx > 60 && cb && !cb.classList.contains('btn-sent')) {
      // Swiped RIGHT more than 60px AND collab button exists AND not already sent

      cb.classList.add('btn-sent'); cb.textContent = '⚡ Sent!';
      showToast(p.id, '⚡ Collab request sent!', 'rgba(124,106,247,0.95)');
      api('/matches/swipe', 'POST', { project_id: p.id, action: 'collab' });
      // Same as tapping the collab button directly
    }
  }, { passive: true });


  // ── TOAST NOTIFICATION ELEMENT ───────────────────────
  var t = document.createElement('div'); t.className = 'toast'; t.id = 't-' + p.id;
  s.appendChild(t);
  // Each slide gets its own hidden toast element
  // showToast() from core.js finds this by id='t-5' and shows it briefly


  // ── RECORD VIEW ──────────────────────────────────────
  api('/projects/' + p.id + '/view', 'POST');
  // Tell the backend this project was viewed
  // Backend increments the view_count in the database
  // Called as soon as the slide is built (appears in feed)


  return s;
  // Return the completed slide element
  // loadFeed() adds it to the feed-body container
}
