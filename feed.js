// ══════════════════════════════════════════════════════
// FEED.JS — THE TIKTOK-STYLE VIDEO FEED
// ══════════════════════════════════════════════════════
//
// This file handles EVERYTHING about the video feed:
//
// What it does:
// Loads projects from Node.js backend
// Builds each video slide/card
// Auto-plays the most visible video
// Handles sound on/off
// Handles swipe gestures (left=invest, right=collab)
// Like, Save, Comment, Share buttons
// Shows who invested/collaborated
// Tracks view counts
//
// Connected to app.html via:
// script src=./feed.js at bottom of app.html
// id=feed-body div (empty container in app.html)
//
// Called by core.js enterApp() after login:
// loadFeed() runs after login
// ══════════════════════════════════════════════════════


// ── SECTION 1: GLOBAL VARIABLES ──────────────────────
// These variables are shared across all functions in this file


// Stores a timer ID for scroll debouncing
// debounce = wait until user STOPS doing something
// then trigger the action
// Used to wait until user stops scrolling
// before deciding which video to play
var _scrollDebounce = null;


// Tracks whether user has unlocked sound
// false = all videos are MUTED (browser default for autoplay)
// true  = videos can play with sound
//
// Why start muted?
// Browsers block autoplay with sound by default
// User must tap the screen first to unlock sound
// This is a browser security rule - not our choice!
var soundUnlocked = false;


// Tracks which projects the user has liked
// Stored as object: { projectId: true }
// Empty at start - nothing liked yet
// Example after liking project abc: { abc: true }
var liked = {};


// Tracks which projects the user has saved/bookmarked
// Same pattern as liked above
// Empty at start - nothing saved yet
var saved = {};


// ── SECTION 2: VIDEO PLAYBACK ─────────────────────────


// Finds the most visible video slide on screen
// and plays ONLY that one video
//
// Called when user stops scrolling
//
// Why only play ONE video at a time?
// Playing multiple videos drains battery very fast
// It is also confusing to hear multiple sounds
// TikTok and Instagram Reels do the exact same thing!
//
// How it works step by step:
// Step 1 - Check if feed screen is currently visible
// Step 2 - Loop through ALL slides on screen
// Step 3 - Measure how many pixels of each slide are visible
// Step 4 - The slide with most visible pixels wins
// Step 5 - Pause ALL other videos
// Step 6 - Play ONLY the winning slide video
function pickAndPlayBestSlide() {

  // Find the feed screen element in app.html
  // This is: div class=pg feed-pg id=pg-feed
  var feedPg = document.getElementById("pg-feed");

  // If feed screen is NOT visible (user went to matches/profile etc)
  // Pause ALL videos and exit this function immediately
  if (!feedPg || !feedPg.classList.contains("on")) {
    document.querySelectorAll(".slide video").forEach(function(v) { v.pause(); });
    return;
  }

  // Variables to track the winning slide
  var best = null;      // will hold the most visible slide element
  var bestScore = -1;   // will hold the highest visibility score

  // Loop through every slide currently in the feed
  document.querySelectorAll(".slide").forEach(function(slide) {

    // getBoundingClientRect() measures where this slide is on screen
    // rect.top    = pixels from top of screen to top of slide
    // rect.bottom = pixels from top of screen to bottom of slide
    var rect = slide.getBoundingClientRect();

    // Calculate how many pixels of this slide are VISIBLE on screen
    //
    // Math.max(rect.top, 0)
    // If slide starts above screen (negative top) use 0 instead
    //
    // Math.min(rect.bottom, window.innerHeight)
    // If slide goes below screen use screen height instead
    var visTop = Math.max(rect.top, 0);
    var visBot = Math.min(rect.bottom, window.innerHeight);

    // Visible pixels = bottom of visible area minus top of visible area
    // Math.max(0,...) prevents negative numbers when slide is off screen
    var visible = Math.max(0, visBot - visTop);

    // Is this slide more visible than the current winner?
    if (visible > bestScore) {
      bestScore = visible; // new best score
      best = slide;        // new winning slide
    }
  });

  // First pause and mute ALL videos
  // We do this before playing the winner
  document.querySelectorAll(".slide video").forEach(function(v) {
    v.pause();
    v.muted = true;
    v.volume = 1;
  });

  // Now play ONLY the winning slide video
  if (best) {
    // Find the video element inside the winning slide
    var vid = best.querySelector("video");

    if (vid) {
      // Has user unlocked sound by tapping?
      if (soundUnlocked) {
        // Yes - play with sound
        vid.muted = false;
        vid.volume = 1;
        // onplaying fires when video actually starts playing
        // Makes sure volume stays on after play begins
        vid.onplaying = function() {
          vid.volume = 1;
          vid.muted = false;
          vid.onplaying = null; // remove this after running once
        };
      } else {
        // No - play muted (required for autoplay)
        vid.muted = true;
        vid.volume = 1;
      }

      // Actually play the video
      // .catch() handles errors silently (browser blocks sometimes)
      vid.play().catch(function() {
        // If play failed try again with muted
        vid.muted = true;
        vid.play().catch(function() {}); // if still fails give up silently
      });
    }
  }
}


// Sets up scroll and visibility detection for the feed
// Two watchers work together to play correct video
//
// Watcher 1 - Scroll listener:
// Fires continuously while user scrolls
// Mutes videos while scrolling
// Waits 150ms after scroll stops then plays best
//
// Watcher 2 - IntersectionObserver:
// Fires when a slide enters or leaves the screen
// Also waits 150ms then plays best
//
// Why 150ms delay?
// Enough time to detect scrolling has stopped
// Without feeling too slow or laggy
function setupFeedObserver() {

  // Disconnect old observer if exists
  // Prevents duplicate observers when feed reloads
  if (window._feedObserver) window._feedObserver.disconnect();

  // Get the feed body container element
  var feedBody = document.getElementById("feed-body");

  // Remove old scroll handler if exists
  if (window._feedScrollHandler) {
    feedBody.removeEventListener("scroll", window._feedScrollHandler);
  }

  // Create new scroll handler function
  window._feedScrollHandler = function() {

    // While scrolling mute all videos immediately
    // Prevents audio jumping between videos while scrolling
    document.querySelectorAll(".slide video").forEach(function(v) { v.muted = true; });

    // Cancel any pending play timer
    clearTimeout(_scrollDebounce);

    // Wait 150ms after scroll stops then play the best slide
    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
  };

  // Add scroll listener to feed body container
  // passive:true = tells browser we wont block scrolling
  // Makes scrolling much smoother on mobile phones
  feedBody.addEventListener("scroll", window._feedScrollHandler, { passive: true });

  // IntersectionObserver watches when slides enter and leave screen
  // threshold:0.8 = fires when 80% of slide is visible on screen
  window._feedObserver = new IntersectionObserver(function() {
    clearTimeout(_scrollDebounce);
    _scrollDebounce = setTimeout(pickAndPlayBestSlide, 150);
  }, { threshold: 0.8 });

  // Tell observer to watch every single slide
  document.querySelectorAll(".slide").forEach(function(slide) {
    window._feedObserver.observe(slide);
  });
}


// ── SECTION 3: LOAD FEED ─────────────────────────────


// The MAIN function of this file!
// Loads all projects from Node.js backend
// and fills the feed with video slides
//
// Called by:
// enterApp() in core.js right after login
// goFeed() in core.js when Feed tab is tapped
//
// Steps in order:
// 1 - Find the empty feed-body div in app.html
// 2 - Show Loading message
// 3 - Call GET /api/projects on Node.js backend
// 4 - If no projects show empty state message
// 5 - For each project call buildSlide(p)
// 6 - Add all slides to the feed-body div
// 7 - Setup scroll and visibility observers
// 8 - Auto-play first video after 400ms delay
//
// async means this function waits for backend response
// without freezing the app
async function loadFeed() {

  // Find the empty feed container in app.html
  // This is the div: div class=feed-body id=feed-body
  // It is completely empty until this function fills it!
  var fb = document.getElementById("feed-body");

  // Show loading message while waiting for backend
  // innerHTML replaces everything inside the div
  fb.innerHTML = "<div style='height:80vh;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:13px;'>Loading...</div>";

  // Call the Node.js backend to get projects
  // api() function is defined in core.js
  // This calls: GET https://workmatch-backend.onrender.com/api/projects?limit=20
  // limit=20 means get maximum 20 projects at once
  // await means wait here until backend responds
  var r = await api("/projects?limit=20");

  // Clear the loading message
  fb.innerHTML = "";

  // Check if request failed or no projects exist
  // r.ok = false means server returned an error
  // !r.data.projects means no projects array in response
  // !r.data.projects.length means projects array is empty
  if (!r.ok || !r.data.projects || !r.data.projects.length) {

    // Show empty state with lightbulb icon
    fb.innerHTML = "<div style='height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;'><div style='font-size:44px;'>💡</div><div style='color:rgba(255,255,255,0.5);font-size:14px;text-align:center;padding:0 2rem;'>No projects yet!<br>Post your first idea.</div></div>";
    return; // stop the function here - nothing more to do
  }

  // Loop through each project from the backend
  // For each project:
  // buildSlide(p) creates a complete video card element
  // fb.appendChild() adds that card to the feed container
  r.data.projects.forEach(function(p) {
    fb.appendChild(buildSlide(p));
  });

  // Setup scroll and visibility detection
  // Must be called AFTER slides are added to the page
  setupFeedObserver();

  // Auto-play the first video after 400ms delay
  // Why 400ms? Gives videos time to load before trying to play
  // Feels more natural than instant play
  setTimeout(function() {

    // Find the first slide in the feed
    var firstSlide = fb.querySelector(".slide");

    if (firstSlide) {
      // Find the video inside the first slide
      var vid = firstSlide.querySelector("video");

      if (vid) {
        vid.muted = true; // must be muted for autoplay to work
        vid.play().catch(function() {}); // play - ignore errors silently
      }
    }
  }, 400);
}


// ── SECTION 4: STAT USERS ────────────────────────────


// Shows a popup panel with WHO invested/collaborated/liked
// on a specific project
//
// Called when user taps the stat counts on a slide:
// Tapping 💰 1  shows list of investors
// Tapping ⚡ 1  shows list of collaborators
// Tapping ❤️ 0  shows who liked
// Tapping 👁 64 shows who viewed
//
// Parameters:
// projectId = the ID of the project to show stats for
// type      = what to show: invest, collab, likes, or views
async function showStatUsers(projectId, type) {

  // Find the popup elements in app.html
  var sheet = document.getElementById("stat-users-sheet"); // the sliding panel
  var title = document.getElementById("stat-users-title"); // title text
  var list  = document.getElementById("stat-users-list");  // user list container

  // Set the title based on what was clicked
  if (type === "invest")      title.textContent = "💰 Investors";
  else if (type === "collab") title.textContent = "⚡ Collaborators";
  else if (type === "likes")  title.textContent = "❤️ Liked by";
  else                        title.textContent = "👁 Views";

  // Show loading state inside the panel
  list.innerHTML = "<div style='text-align:center;padding:2rem;color:#555;'>Loading...</div>";

  // Make the popup panel visible - slide it up from bottom
  // classList.add(on) triggers CSS animation
  sheet.classList.add("on");

  // Fetch the list of users from Node.js backend
  // Example URL: GET /api/projects/abc123/stat-users?type=invest
  var r = await api("/projects/" + projectId + "/stat-users?type=" + type);

  // No users found for this stat
  if (!r.ok || !r.data.users || !r.data.users.length) {
    list.innerHTML = "<div class='req-empty'>No " + type + "s yet</div>";
    return;
  }

  // Clear loading message
  list.innerHTML = "";

  // Build a row for each user in the list
  r.data.users.forEach(function(u) {

    // Get color pair for this user based on their ID
    // clr() is defined in core.js
    var q = clr(u.id);

    // Create the user row element
    var item = document.createElement("div");
    item.className = "req-item";
    item.style.cssText = "display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #1a1a1a;cursor:pointer;";

    // Fill row with avatar circle and name/location
    item.innerHTML =
      // Avatar circle showing user initials
      // ini() from core.js gets initials from full name
      "<div style='width:44px;height:44px;border-radius:50%;background:" + q.bg + ";color:" + q.c + ";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;'>" + ini(u.name) + "</div>" +
      // Name and location text
      "<div>" +
        "<div style='font-size:14px;font-weight:600;color:#fff;'>" + (u.name || "User") + "</div>" +
        "<div style='font-size:12px;color:#666;'>" + (u.location || "Entrepreneur") + "</div>" +
      "</div>";

    // Clicking a user closes this panel and opens their profile
    // openUserProfile() is defined in profile.js
    item.onclick = function() {
      sheet.classList.remove("on"); // hide the panel
      openUserProfile(u.id, u.name, u.avatar, u.location);
    };

    // Add this row to the list
    list.appendChild(item);
  });
}


// ── SECTION 5: BUILD SLIDE ────────────────────────────


// Builds ONE complete video slide card for the feed
// This is the BIGGEST and most important function!
//
// Called by loadFeed() once for each project from backend
//
// Parameter p = one project object from Node.js backend
// It contains all these fields:
// p.id            = unique project identifier
// p.title         = project name eg AI fitness app
// p.description   = what the project is about
// p.video_url     = Cloudinary video URL
// p.mode          = collab or invest or both
// p.creator_id    = who posted this
// p.creator_name  = their name
// p.creator_avatar = their photo URL
// p.creator_location = where they are
// p.invest_count  = how many invest requests
// p.collab_count  = how many collab requests
// p.like_count    = how many likes
// p.view_count    = how many views
// p.comment_count = how many comments
//
// Returns: complete div element ready to add to feed
function buildSlide(p) {

  // Create the main slide container element
  // This will hold everything inside the card
  var s = document.createElement("div");
  s.className = "slide"; // CSS makes this full screen height


  // Get a color pair for this project based on its ID
  // clr() is defined in core.js
  // Returns an object like: { bg: darkcolor, c: brightcolor }
  // Used for placeholder background and avatar colors
  var q = clr(p.id);


  // Determine what type of match this project is looking for
  //
  // IMPORTANT FIX:
  // Node.js backend sends p.mode NOT p.looking_for
  // Old code used p.looking_for which caused feed to break!
  //
  // p.mode || p.looking_for || both means:
  // Use p.mode if it exists (Node.js backend)
  // Otherwise use p.looking_for (old field name)
  // Otherwise default to both
  //
  // p.mode values: collab or invest or both
  var mode = p.mode || p.looking_for || "both";

  // The text shown on the mode badge on each slide
  var modeText = mode === "collab" ? "⚡ Seeking Collaborators" :
                 mode === "invest" ? "💰 Seeking Investors" :
                 "⚡💰 Collab + Invest";


  // ── VIDEO OR COLORED PLACEHOLDER ──────────────────

  // Does this project have a video uploaded?
  if (p.video_url) {

    // YES - create a video element
    var vid = document.createElement("video");

    // Set the video source to the Cloudinary URL
    vid.src = p.video_url;

    // playsinline = plays inline on iPhone (not forced fullscreen)
    vid.setAttribute("playsinline", "");

    // loop = video automatically restarts when it finishes
    vid.setAttribute("loop", "");

    // Start muted - this is REQUIRED for autoplay to work
    // Browsers block autoplay with sound to prevent noise
    vid.muted = true;

    // Position video to fill the entire slide
    // position:absolute;inset:0 = fills parent completely
    // object-fit:cover = fills space without stretching or distorting
    // pointer-events:none = finger touches pass through to the slide div
    vid.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;";

    // Add video to the slide
    s.appendChild(vid);


    // Sound hint overlay - shown until user taps for sound
    // Shows the text: tap video for sound
    var soundHint = document.createElement("div");
    soundHint.className = "sound-hint";

    // Show hint if sound not yet unlocked
    // display:flex = visible
    // display:none = hidden
    soundHint.style.cssText = "position:absolute;bottom:140px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;z-index:25;pointer-events:none;display:" + (soundUnlocked ? "none" : "flex") + ";align-items:center;gap:6px;white-space:nowrap;";
    soundHint.innerHTML = "🔊 Tap video for sound";
    s.appendChild(soundHint);


    // Tap handler for the video slide
    // First tap = unlock sound for all videos
    // After that = tap toggles play and pause
    s.addEventListener("click", function(e) {

      // Ignore taps on buttons and info/action areas
      // Only unlock sound when tapping the video itself
      if (e.target.tagName === "BUTTON" ||
          e.target.closest("button") ||
          e.target.closest(".s-info") ||
          e.target.closest(".s-acts") ||
          e.target.closest(".s-right")) return;

      if (!soundUnlocked) {
        // First tap - unlock sound globally for all videos
        soundUnlocked = true;

        // Pause and mute all OTHER videos first
        document.querySelectorAll(".slide video").forEach(function(v) {
          if (v !== vid) { v.pause(); v.muted = true; }
        });

        // Play THIS video with sound turned on
        vid.muted = false;
        vid.volume = 1;
        vid.play().catch(function() {});

        // Make sure volume stays on after play starts
        vid.onplaying = function() {
          vid.volume = 1;
          vid.muted = false;
          vid.onplaying = null; // remove after running once
        };

        // Hide ALL sound hint overlays across all slides
        document.querySelectorAll(".sound-hint").forEach(function(h) {
          h.style.display = "none";
        });

      } else {
        // Sound already unlocked
        // Tap now toggles play and pause like a normal player
        if (vid.paused) {
          vid.volume = 1;
          vid.play().catch(function() {});
        } else {
          vid.pause();
        }
      }
    });

  } else {

    // NO video - show colored placeholder instead
    // Shows a large avatar circle with creator initials
    // on a colored gradient background
    var ph = document.createElement("div");
    ph.style.cssText = "position:absolute;inset:0;background:linear-gradient(160deg," + q.bg + " 0%,#000 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;";

    // Large avatar circle in center
    var av = document.createElement("div");
    av.style.cssText = "width:86px;height:86px;border-radius:50%;background:" + q.bg + ";border:3px solid " + q.c + "44;color:" + q.c + ";display:flex;align-items:center;justify-content:center;font-weight:900;font-size:28px;";
    av.textContent = ini(p.creator_name); // ini() from core.js gets initials

    // Small label below the avatar
    var lbl = document.createElement("div");
    lbl.style.cssText = "font-size:11px;color:rgba(255,255,255,0.3);";
    lbl.textContent = "No video — swipe to connect";

    ph.appendChild(av);
    ph.appendChild(lbl);
    s.appendChild(ph);
  }


  // ── GRADIENT OVERLAY ──────────────────────────────
  // Dark gradient at the bottom of the slide
  // Makes text readable when placed over the video
  // Without this text would be hard to see on bright videos
  var g = document.createElement("div");
  g.className = "s-grad"; // CSS defines the gradient
  s.appendChild(g);


  // ── PROGRESS BAR ──────────────────────────────────
  // Thin bar at the very top of the slide
  // Slowly fills from left to right like Instagram stories
  // Gives visual feedback that video is playing

  // Container bar (empty track)
  var pr = document.createElement("div");
  pr.className = "prog"; // CSS positions at top

  // The fill part that grows wider over time
  var pf = document.createElement("div");
  pf.className = "prog-fill";
  pf.id = "pf-" + p.id; // unique id to find it in the interval

  pr.appendChild(pf);
  s.appendChild(pr);

  // Animate the bar from 0 to 100 percent
  var w = 0; // current width percentage

  // setInterval runs a function repeatedly
  // every 100 milliseconds (0.1 seconds)
  var pt = setInterval(function() {
    w += 0.2; // increase width by 0.2 percent each tick

    // Find the fill element by its unique id
    var el = document.getElementById("pf-" + p.id);

    // If element is gone (slide was removed) stop the timer
    if (!el) { clearInterval(pt); return; }

    // If we reached 100 percent stop the timer
    if (w >= 100) { clearInterval(pt); return; }

    // Update the visual width
    el.style.width = w + "%";

  }, 100);
  // Math: 100ms per tick x 500 ticks to reach 100% = 50 seconds


  // ── RIGHT SIDE BUTTONS ────────────────────────────
  // Vertical column of 4 buttons on the right side of slide
  // Like TikTok: heart, bookmark, comment, share

  var ra = document.createElement("div");
  ra.className = "s-right"; // CSS positions on right side

  // Build all 4 buttons using innerHTML
  // Each button has a unique id so we can attach click handlers
  // s-rbtn  = button styling
  // s-rico  = icon area
  // s-rlbl  = label text below icon
  ra.innerHTML =
    // Like button - shows heart icon
    "<button class='s-rbtn' id='lb-" + p.id + "'><div class='s-rico' id='li-" + p.id + "'>🤍</div><div class='s-rlbl'>Like</div></button>" +
    // Save button - shows bookmark icon
    "<button class='s-rbtn' id='sb-" + p.id + "'><div class='s-rico' id='si-" + p.id + "'>🔖</div><div class='s-rlbl'>Save</div></button>" +
    // Comment button - shows comment count
    "<button class='s-rbtn' id='cmb-" + p.id + "'><div class='s-rico'>💬</div><div class='s-rlbl' id='cc-" + p.id + "'>" + (p.comment_count || 0) + "</div></button>" +
    // Share button
    "<button class='s-rbtn' id='shb-" + p.id + "'><div class='s-rico'>↗</div><div class='s-rlbl'>Share</div></button>";

  s.appendChild(ra);

  // Attach click handlers AFTER buttons are in the page
  // setTimeout with 0 delay runs after current code finishes
  // This ensures buttons exist in DOM before we try to find them
  setTimeout(function() {

    // Find each button by its unique ID
    var lb  = document.getElementById("lb-"  + p.id); // like button
    var sb2 = document.getElementById("sb-"  + p.id); // save button
    var cmb = document.getElementById("cmb-" + p.id); // comment button
    var shb = document.getElementById("shb-" + p.id); // share button

    // Like button - toggles between empty and filled heart
    if (lb) lb.onclick = function() {
      var ico = document.getElementById("li-" + p.id);
      if (liked[p.id]) {
        // Already liked - remove the like
        liked[p.id] = false;
        ico.textContent = "🤍"; // empty heart
      } else {
        // Not liked yet - add the like
        liked[p.id] = true;
        ico.textContent = "❤️"; // filled heart
        // Show popup notification using showToast() from core.js
        showToast(p.id, "❤️ Liked!", "rgba(226,75,74,0.9)");
      }
    };

    // Save button - toggles between bookmark and star
    if (sb2) sb2.onclick = function() {
      var ico = document.getElementById("si-" + p.id);
      if (saved[p.id]) {
        // Already saved - remove save
        saved[p.id] = false;
        ico.textContent = "🔖"; // bookmark
      } else {
        // Not saved yet - save it
        saved[p.id] = true;
        ico.textContent = "⭐"; // star
        showToast(p.id, "⭐ Saved!", "rgba(232,160,32,0.9)");
      }
    };

    // Comment button - opens comments popup
    // openComments() is defined in comments.js
    if (cmb) cmb.onclick = function() {
      openComments(p.id, p.title);
    };

    // Share button - native share or copy link
    if (shb) shb.onclick = function() {
      if (navigator.share) {
        // Native share sheet - works on iPhone and Android
        navigator.share({ title: p.title, url: location.href });
      } else {
        // Fallback - copy page URL to clipboard
        navigator.clipboard && navigator.clipboard.writeText(location.href).then(function() {
          showToast(p.id, "🔗 Copied!", "rgba(124,106,247,0.9)");
        });
      }
    };
  }, 0);


  // ── INFO AREA ─────────────────────────────────────
  // Bottom left section showing:
  // Creator avatar + handle + location
  // Mode badge (Seeking Collaborators etc)
  // Project title
  // Project description (max 110 characters)
  // Stats row with counts

  var info = document.createElement("div");
  info.className = "s-info"; // CSS positions at bottom left of slide


  // Creator avatar row - the whole row is clickable
  // Tapping it opens the creator profile popup
  var avatarRow = document.createElement("button");
  avatarRow.style.cssText = "display:flex;align-items:center;margin-bottom:4px;cursor:pointer;background:none;border:none;padding:4px 0;width:auto;-webkit-appearance:none;";

  // Click handler - opens creator profile
  // openUserProfile() is defined in profile.js
  avatarRow.onclick = function(e) {
    e.stopPropagation(); // prevents click reaching video behind
    e.preventDefault();
    openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location);
  };


  // Avatar circle - shows photo or initials
  var avatarEl = document.createElement("div");
  avatarEl.style.cssText = "width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-right:8px;border:2px solid rgba(255,255,255,0.5);background:" + q.bg + ";color:" + q.c + ";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;";

  if (p.creator_avatar) {
    // Creator has a profile photo - show it
    var avImg = document.createElement("img");
    avImg.src = p.creator_avatar; // Cloudinary image URL
    avImg.style.cssText = "width:100%;height:100%;object-fit:cover;";
    // If photo fails to load - show initials as fallback
    avImg.onerror = function() { this.parentElement.textContent = ini(p.creator_name); };
    avatarEl.appendChild(avImg);
  } else {
    // No photo - show initials using ini() from core.js
    // Example: Solomon Woldetensay becomes SW
    avatarEl.textContent = ini(p.creator_name);
  }


  // Creator name and location column
  var nameCol = document.createElement("div");
  nameCol.style.cssText = "text-align:left;";
  nameCol.innerHTML =
    // Handle: @solomon_woldetensay
    // toLowerCase() makes it lowercase
    // .replace spaces with underscores
    "<div class='s-handle'>@" + (p.creator_name || "user").toLowerCase().replace(/\s+/g, "_") + "</div>" +
    // Location or default Entrepreneur
    "<div class='s-loc'>" + (p.creator_location || "Entrepreneur") + "</div>";

  // Put avatar and name together in the row
  avatarRow.appendChild(avatarEl);
  avatarRow.appendChild(nameCol);


  // Mode badge - shows what project is looking for
  var modeDiv = document.createElement("div");
  modeDiv.className = "s-mode";
  modeDiv.textContent = modeText; // set above: Seeking Collaborators etc


  // Project title
  var titleDiv = document.createElement("div");
  titleDiv.className = "s-title";
  titleDiv.textContent = p.title;


  // Project description - limited to 110 characters
  // Longer descriptions get cut off with ...
  // This keeps the slide clean and readable
  var descDiv = document.createElement("div");
  descDiv.className = "s-desc";
  descDiv.textContent = (p.description || "").substring(0, 110) +
    (p.description && p.description.length > 110 ? "..." : "");


  // Stats row - shows counts and each is clickable
  // Tapping a count opens the list of those users
  var statsRow = document.createElement("div");
  statsRow.style.cssText = "display:flex;gap:16px;margin-top:6px;";
  statsRow.innerHTML =
    // Invest count - clicking shows list of investors
    "<button onclick="showStatUsers('" + p.id + "','invest')" style='background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;'>💰 " + (p.invest_count || 0) + "</button>" +
    // Collab count - clicking shows list of collaborators
    "<button onclick="showStatUsers('" + p.id + "','collab')" style='background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;'>⚡ " + (p.collab_count || 0) + "</button>" +
    // Like count - clicking shows who liked
    "<button onclick="showStatUsers('" + p.id + "','likes')" style='background:none;border:none;color:rgba(255,255,255,0.7);font-size:11px;cursor:pointer;'>❤️ " + (p.like_count || 0) + "</button>" +
    // View count - just shows the number not clickable
    "<span style='color:rgba(255,255,255,0.4);font-size:11px;'>👁 " + (p.view_count || 0) + "</span>";

  // Add all info elements to the info container
  info.appendChild(avatarRow);
  info.appendChild(modeDiv);
  info.appendChild(titleDiv);
  info.appendChild(descDiv);
  info.appendChild(statsRow);

  // Add info container to the slide
  s.appendChild(info);


  // ── ACTION BUTTONS ────────────────────────────────
  // Large buttons at the very bottom of the slide
  // 💰 Invest   ⚡ Collab   👤 Profile
  //
  // Only Invest button shows if mode is invest or both
  // Only Collab button shows if mode is collab or both
  // Profile button always shows

  var acts = document.createElement("div");
  acts.className = "s-acts"; // CSS positions at bottom of slide

  var ib = null; // reference to invest button
  var cb = null; // reference to collab button


  // Create Invest button if project wants investors
  if (mode === "invest" || mode === "both") {
    ib = document.createElement("button");
    ib.className = "s-btn btn-i"; // btn-i = gold/yellow styling
    ib.textContent = "💰 Invest";

    ib.onclick = function() {
      // btn-sent class means already sent - prevent double sending
      if (ib.classList.contains("btn-sent")) return;

      // Mark button as sent - changes text to Sent!
      ib.classList.add("btn-sent");
      ib.textContent = "💰 Sent!";

      // Show popup notification
      // showToast() is defined in core.js
      showToast(p.id, "💰 Investment sent!", "rgba(232,160,32,0.95)");

      // Send invest request to Node.js backend
      // POST /api/matches/swipe
      // Body: { project_id: abc, action: invest }
      api("/matches/swipe", "POST", { project_id: p.id, action: "invest" });
    };

    acts.appendChild(ib);
  }


  // Create Collab button if project wants collaborators
  if (mode === "collab" || mode === "both") {
    cb = document.createElement("button");
    cb.className = "s-btn btn-c"; // btn-c = purple styling
    cb.textContent = "⚡ Collab";

    cb.onclick = function() {
      if (cb.classList.contains("btn-sent")) return;

      cb.classList.add("btn-sent");
      cb.textContent = "⚡ Sent!";

      showToast(p.id, "⚡ Collab request sent!", "rgba(124,106,247,0.95)");

      // POST /api/matches/swipe with action collab
      api("/matches/swipe", "POST", { project_id: p.id, action: "collab" });
    };

    acts.appendChild(cb);
  }


  // Profile button - always shown
  // Opens creator profile popup
  var profb = document.createElement("button");
  profb.className = "s-btn btn-p"; // btn-p = neutral styling
  profb.textContent = "👤";

  profb.onclick = function(e) {
    e.stopPropagation();
    e.preventDefault();
    try {
      // Open creator profile using profile.js function
      openUserProfile(p.creator_id, p.creator_name, p.creator_avatar, p.creator_location);
    } catch(err) {
      alert("Error opening profile: " + err.message);
    }
  };

  acts.appendChild(profb);
  s.appendChild(acts);


  // ── SWIPE OVERLAYS ────────────────────────────────
  // Large colored overlays that appear when user swipes
  // They give visual feedback showing what action will happen
  //
  // Swipe LEFT  = invest overlay slides in from right
  // Swipe RIGHT = collab overlay slides in from left
  //
  // Opacity increases as you swipe further
  // Full opacity = action will be triggered on release

  var si  = null; // invest overlay element
  var sc2 = null; // collab overlay element

  // Create invest overlay only if project accepts investors
  if (mode === "invest" || mode === "both") {
    si = document.createElement("div");
    si.className = "swipe-invest"; // CSS: gold overlay positioned on left
    si.textContent = "💰 Invest";
    s.appendChild(si);
  }

  // Create collab overlay only if project wants collaborators
  if (mode === "collab" || mode === "both") {
    sc2 = document.createElement("div");
    sc2.className = "swipe-collab"; // CSS: purple overlay positioned on right
    sc2.textContent = "⚡ Collab";
    s.appendChild(sc2);
  }


  // ── TOUCH SWIPE GESTURES ──────────────────────────
  // Detects left and right swipe gestures on the slide
  //
  // Three events work together:
  // touchstart = finger touches screen - record where
  // touchmove  = finger moving - show overlay based on direction
  // touchend   = finger lifted - trigger action if swiped far enough

  var txStart = 0;     // X position when touch started (pixels from left)
  var txCur   = 0;     // current X position as finger moves
  var swiping = false; // are we currently tracking a swipe?


  // TOUCHSTART - Finger touches the screen
  s.addEventListener("touchstart", function(e) {
    // Only track single finger - ignore multi-touch
    if (e.touches.length !== 1) return;

    // Do not track swipes on info area or buttons
    // Only swipe on the video part of the slide
    if (e.target.closest(".s-info") ||
        e.target.closest(".s-acts") ||
        e.target.closest(".s-right")) return;

    // Record the starting X position
    txStart = e.touches[0].clientX;
    txCur   = txStart;
    swiping = true;

  }, { passive: true }); // passive:true allows smooth scrolling


  // TOUCHMOVE - Finger sliding across screen
  s.addEventListener("touchmove", function(e) {
    if (!swiping || e.touches.length !== 1) return;

    // Update current position
    txCur = e.touches[0].clientX;

    // Calculate how far finger has moved
    // Positive number = moving right (collab direction)
    // Negative number = moving left (invest direction)
    var dx = txCur - txStart;

    // Only show overlays after 20 pixels of movement
    // Prevents accidental triggers from tiny finger movements
    if (Math.abs(dx) > 20) {

      if (dx < 0 && si) {
        // Moving LEFT - show invest overlay
        // Opacity increases as swipe distance increases
        // Math.min(1,...) caps opacity at 1 (fully visible)
        // Dividing by 80 means full opacity at 80px swipe
        si.style.opacity  = Math.min(1, Math.abs(dx) / 80);
        if (sc2) sc2.style.opacity = 0; // hide collab overlay
      } else if (dx > 0 && sc2) {
        // Moving RIGHT - show collab overlay
        sc2.style.opacity = Math.min(1, dx / 80);
        if (si) si.style.opacity = 0; // hide invest overlay
      }
    }
  }, { passive: true });


  // TOUCHEND - Finger lifted from screen
  s.addEventListener("touchend", function() {
    if (!swiping) return;
    swiping = false;

    // Calculate total swipe distance
    var dx = txCur - txStart;

    // Hide both overlays immediately
    if (si)  si.style.opacity  = 0;
    if (sc2) sc2.style.opacity = 0;

    // If swipe was less than 60 pixels it was not intentional
    // Ignore small swipes - they are probably just taps or scrolls
    if (Math.abs(dx) < 60) return;

    // Swipe LEFT 60+ pixels = INVEST action
    if (dx < -60 && ib && !ib.classList.contains("btn-sent")) {
      ib.classList.add("btn-sent");
      ib.textContent = "💰 Sent!";
      showToast(p.id, "💰 Investment request sent!", "rgba(232,160,32,0.95)");
      api("/matches/swipe", "POST", { project_id: p.id, action: "invest" });
    }
    // Swipe RIGHT 60+ pixels = COLLAB action
    else if (dx > 60 && cb && !cb.classList.contains("btn-sent")) {
      cb.classList.add("btn-sent");
      cb.textContent = "⚡ Sent!";
      showToast(p.id, "⚡ Collab request sent!", "rgba(124,106,247,0.95)");
      api("/matches/swipe", "POST", { project_id: p.id, action: "collab" });
    }

  }, { passive: true });


  // ── TOAST NOTIFICATION ELEMENT ────────────────────
  // Empty div that showToast() from core.js uses to show popups
  // Each slide has its own toast so messages do not overlap
  // Created here but filled by showToast() when needed
  //
  // Example: showToast(p.id, Liked!, red)
  // Finds this element by id t-abc123
  // Sets its text and makes it visible temporarily
  var t = document.createElement("div");
  t.className = "toast";
  t.id = "t-" + p.id; // unique id for each slide: t-abc123
  s.appendChild(t);


  // ── TRACK VIEW COUNT ──────────────────────────────
  // Tell Node.js backend that this project was viewed
  // Calls: POST /api/projects/abc123/view
  // Backend increments view_count in the database
  // This is how view counts grow over time
  api("/projects/" + p.id + "/view", "POST");


  // Return the completed slide element
  // loadFeed() receives this and adds it to feed-body div
  // That is how the video appears on screen!
  return s;
}
