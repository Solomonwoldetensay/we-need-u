// ══════════════════════════════════════════════════════
// CORE.JS — THE ENGINE OF YOU-HAVE-VALUE
// ══════════════════════════════════════════════════════
//
// This is the MOST IMPORTANT file in the entire app!
// Every other JavaScript file depends on this file.
//
// It loads SECOND right after env.js
// and provides tools that ALL other files use:
//
// ✅ Backend URL (reads from env.js)
// ✅ Login token management
// ✅ api() function for ALL server requests
// ✅ Screen navigation (show/hide pages)
// ✅ Toast notification popups
// ✅ Color generation for avatars
// ✅ Name initials generator
// ✅ Time formatting ("2m ago", "3h ago")
//
// If this file breaks → EVERYTHING breaks!
// Think of it as the ENGINE of a car 🚗
// ══════════════════════════════════════════════════════


// ── SECTION 1: GLOBAL VARIABLES ──────────────────────
// These variables are available to ALL other JS files
// because they are declared at the top level (global scope)


// Reads the backend URL from env.js
// env.js set: window.WNU_CONFIG = { BACKEND_URL: 'https://...' }
//
// Breaking this line down:
// window.WNU_CONFIG              → does env.js config exist?
// &&                             → AND (both must be true)
// window.WNU_CONFIG.BACKEND_URL  → does the URL exist inside it?
// ||                             → OR (fallback if above fails)
// 'https://workmatch-backend.onrender.com' → old backup URL
// .replace(/\/$/, '')            → removes trailing slash if exists
//
// Example results:
// env.js loaded correctly → 'https://playset.ngrok-free.dev'
// env.js failed to load   → 'https://workmatch-backend.onrender.com'
var BACKEND = ((window.WNU_CONFIG && window.WNU_CONFIG.BACKEND_URL) || 'https://workmatch-backend.onrender.com').replace(/\/$/, '');


// Adds /api to the backend URL
// ALL Python backend routes start with /api
//
// Example:
// BACKEND = 'https://playset.ngrok-free.dev'
// API     = 'https://playset.ngrok-free.dev/api'
//
// Used in every request:
// API + '/auth/login'   = 'https://playset.ngrok-free.dev/api/auth/login'
// API + '/projects'     = 'https://playset.ngrok-free.dev/api/projects'
// API + '/matches'      = 'https://playset.ngrok-free.dev/api/matches'
var API = BACKEND + '/api';


// Gets your login token from browser storage
// localStorage = mini database built into the browser
//             = saves data even after closing the app
//
// wm_token = WorkMatch Token (old app name)
//          = a long string that proves you are logged in
//          = given by Python backend after login/signup
//
// || null means:
// if token exists in storage → use it (stay logged in) ✅
// if token missing           → use null (show login screen)
var token = localStorage.getItem('wm_token') || null;


// Gets your saved user information from browser storage
// Stores things like:
// → user.name       = "Solomon"
// → user.email      = "solomon@test.com"
// → user.id         = 1
// → user.avatar_url = "https://cloudinary.com/..."
//
// JSON.parse() converts text → JavaScript object
// Because localStorage can ONLY save text not objects!
//
// Example:
// Saved in storage as text: '{"name":"Solomon","id":1}'
// JSON.parse converts to:    {name: "Solomon", id: 1}
//
// || 'null' means:
// if no user saved → parse 'null' → becomes null
var user = JSON.parse(localStorage.getItem('wm_user') || 'null');


// Tracks which mode user selected when posting an idea
// Can be: 'collab', 'invest', or 'both'
// null means nothing selected yet
var postMode = null;


// Tracks which chat/conversation is currently open
// Stores the conversation ID number
// Used when sending messages to know which chat to send to
var convId = null;


// Tracks which video file the user selected for uploading
// Stores the video file object from file picker
var selVid = null;


// Tracks which projects the user has liked
// Stored as an object: { projectId: true/false }
// Example after liking project 5: { 5: true }
// {} means empty — nothing liked yet
var liked = {};


// Tracks which projects the user has saved/bookmarked
// Stored as an object: { projectId: true/false }
// Example after saving project 3: { 3: true }
// {} means empty — nothing saved yet
var saved = {};


// Tracks the ID of the project currently being viewed
// in the post detail screen
var currentProjectId = null;


// Same as currentProjectId — used in some places
// (duplicate variable from old code)
var currentProjId = null;


// Tracks the video element in the post detail screen
// Used to pause/play the video when opening/closing detail view
var pdVid = null;


// Tracks whether the user has unlocked sound for videos
// false = all videos are MUTED (default for autoplay)
// true  = videos can play with SOUND
//
// Why start muted?
// Browsers block autoplay with sound by default
// User must tap first to unlock sound
var soundUnlocked = false;


// Array of 6 color pairs used for user avatars
// When a user has no profile photo →
// we show their initials with a colored background
//
// Each color pair has:
// bg = background color (dark)
// c  = text/icon color (bright)
//
// Colors:
// 1. Purple  bg:#160f2e  text:#a99cf9
// 2. Green   bg:#0a1a10  text:#1db975
// 3. Orange  bg:#1e1408  text:#e8a020
// 4. Pink    bg:#1e0818  text:#d4537e
// 5. Lime    bg:#101810  text:#639922
// 6. Teal    bg:#0e1a1e  text:#22d3ee
var CLR = [
  {bg:'#160f2e', c:'#a99cf9'},
  {bg:'#0a1a10', c:'#1db975'},
  {bg:'#1e1408', c:'#e8a020'},
  {bg:'#1e0818', c:'#d4537e'},
  {bg:'#101810', c:'#639922'},
  {bg:'#0e1a1e', c:'#22d3ee'}
];


// ── SECTION 2: HELPER FUNCTIONS ───────────────────────


// Returns a color pair for a user based on their ID
// Same user ALWAYS gets same color!
//
// How it works:
// 1. id.toString()      → converts ID to text "1" or "abc"
// 2. .charCodeAt(0)     → gets number value of first character
//                         Example: "S" = 83, "1" = 49
// 3. Math.abs()         → makes sure number is positive
// 4. % CLR.length       → keeps result between 0-5
//                         (we only have 6 colors)
//
// Example:
// User "Solomon" → S=83 → 83%6=5 → teal color
// User ID 1      → "1"  → 49%6=1 → green color
//
// Python equivalent:
// def clr(id): return CLR[abs(ord(str(id)[0])) % len(CLR)]
function clr(id) {
  return CLR[Math.abs(((id || '').toString().charCodeAt(0) || 0)) % CLR.length];
}


// Returns initials from a full name (max 2 letters)
// Used when user has no profile photo
//
// How it works:
// 1. (n||'?')        → if no name given use '?'
// 2. .split(' ')     → splits name by spaces into array
//                      "Solomon Woldetensay" → ["Solomon","Woldetensay"]
// 3. .map(x=>x[0])   → takes first letter of each word → ["S","W"]
// 4. .join('')       → joins letters together → "SW"
// 5. .substring(0,2) → keeps only first 2 letters
// 6. .toUpperCase()  → makes capitals → "SW"
//
// Examples:
// "Solomon Woldetensay" → "SW"
// "Solomon"             → "S"
// "john doe"            → "JD"
// null or undefined     → "?"
//
// Python equivalent:
// def ini(n): return ''.join(x[0] for x in (n or '?').split())[:2].upper()
function ini(n) {
  return (n || '?').split(' ').map(function(x) { return x[0]; }).join('').substring(0, 2).toUpperCase();
}


// ── SECTION 3: API HELPER FUNCTION ───────────────────
// This is the MOST IMPORTANT function in the entire app!
// Every single request to your Python backend goes through here
//
// Usage examples in other files:
// var r = await api('/auth/login', 'POST', {email, password})
// var r = await api('/projects')
// var r = await api('/matches/swipe', 'POST', {project_id, action})
//
// Python equivalent:
// async def api(path, method='GET', body=None):
//     headers = {'Content-Type': 'application/json'}
//     if token: headers['Authorization'] = f'Bearer {token}'
//     response = requests.request(method, API+path, json=body, headers=headers)
//     return {'ok': response.ok, 'data': response.json()}


// async means this function can WAIT for server response
// without freezing the entire app
async function api(path, method, body) {

  // Set up request headers
  // Headers are like a cover letter attached to the request
  // Content-Type: application/json
  // → Tells Python: "I am sending JSON data"
  var h = {'Content-Type': 'application/json'};

  // Add authorization if user is logged in
  // Bearer token proves to Python: "I am logged in"
  // Like showing your ID card at the door
  if (token) h['Authorization'] = 'Bearer ' + token;

  // Build the request options
  // method || 'GET' means:
  // if method given → use it (POST, PUT, DELETE)
  // if no method    → default to GET (just reading data)
  var o = {method: method || 'GET', headers: h};

  // If request has data to send → convert object to text
  // Because HTTP can only send TEXT not JavaScript objects
  // Example:
  // {email: "sol@test.com"} → '{"email":"sol@test.com"}'
  if (body) o.body = JSON.stringify(body);

  try {
    // Create a controller to cancel request if too slow
    var controller = new AbortController();

    // Set 90 second timeout
    // If server takes longer than 90s → cancel automatically
    // Why 90 seconds? ngrok and Render free plan start slowly
    var timeout = setTimeout(function() {
      controller.abort();
    }, 90000);

    // SEND THE REQUEST to Python backend!
    // API + path = full URL
    // Example: 'https://playset.ngrok.dev/api' + '/auth/login'
    //        = 'https://playset.ngrok.dev/api/auth/login'
    // await = wait for response without freezing app
    var r = await fetch(API + path, o);

    // Got response! Cancel the 90 second timer
    clearTimeout(timeout);

    // Convert server response text → JavaScript object
    // Server sends: '{"token":"abc","user":{...}}'
    // r.json() gives: {token:"abc", user:{...}}
    var d = await r.json();

    // Return result to whoever called this function
    // ok: true  = success (200, 201)
    // ok: false = error (400, 401, 404, 500)
    // data:     = actual response from Python
    return {ok: r.ok, data: d};

  } catch(e) {
    // Something went wrong — handle gracefully
    // AbortError = 90 seconds passed with no response
    if (e.name === 'AbortError')
      return {ok: false, data: {message: 'Server is taking too long. Please try again.'}};

    // Other error = no internet or server completely down
    return {ok: false, data: {message: 'Connection error. Check your internet.'}};
  }
}


// ── SECTION 4: SCREEN NAVIGATION ─────────────────────


// Shows one screen and hides all others
// App has many screens but only ONE shows at a time
//
// Screens available:
// pg-login    → login screen
// pg-signup   → signup screen
// pg-feed     → main video feed
// pg-matches  → your matches
// pg-post     → post an idea
// pg-profile  → your profile
// pg-chat     → chat with someone
// pg-messages → all messages
//
// In styles.css:
// .pg      { display: none }  ← hidden by default
// .pg.on   { display: flex }  ← visible when on added
//
// Python equivalent:
// def show(id): hide_all(); show_only(id)
function show(id) {
  // Hide ALL screens first
  document.querySelectorAll('.pg').forEach(function(p) {
    p.classList.remove('on');
  });
  // Show ONLY the requested screen
  document.getElementById(id).classList.add('on');
}


// ── SECTION 5: ENTER APP ─────────────────────────────


// Called immediately after successful login or signup
// Sets up the main app experience
//
// Order of operations:
// 1. Show feed screen
// 2. Load projects from backend
// 3. Load profile data
// 4. After 3 seconds check unread messages
function enterApp() {
  // Switch to the feed screen
  show('pg-feed');

  // Load all projects from Python backend
  // Defined in feed.js
  loadFeed();

  // Load user profile data
  // Defined in profile.js
  loadProfile();

  // Wait 3 seconds then check for unread messages
  // Why 3 seconds? Feed loads first (more important)
  // Messages check happens quietly in background
  setTimeout(checkUnreadMessages, 3000);

  // Show user avatar in top left corner of feed
  var favEl = document.getElementById('feed-avatar');
  if (favEl && user) {
    // Try user.name first (new Python backend)
    // Then user.full_name (old Node.js backend)
    // This handles both cases!
    var displayName = user.name || user.full_name || '?';

    if (user.avatar_url) {
      // User has profile photo → show it
      var img = document.createElement('img');
      img.src = user.avatar_url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      // Photo failed to load → show first letter instead
      img.onerror = function() {
        favEl.textContent = displayName.charAt(0).toUpperCase();
      };
      favEl.innerHTML = '';
      favEl.appendChild(img);
    } else {
      // No photo → show first letter of name
      // Example: "Solomon" → "S"
      favEl.textContent = displayName.charAt(0).toUpperCase();
    }
  }
}


// ── SECTION 6: NAVIGATION FUNCTIONS ──────────────────
// Connected to bottom nav buttons in auth.js:
// document.getElementById('n1').onclick = goFeed;
// document.getElementById('n2').onclick = goMatch;
// etc...


// Go to Feed screen and reload projects
function goFeed() {
  show('pg-feed');
  loadFeed();
}

// Go to Matches screen and reload matches
function goMatch() {
  show('pg-matches');
  loadMatches();
}

// Go to Messages screen and reload messages
function goMessages() {
  show('pg-messages');
  loadMessages();
}

// Go to Profile screen and reload profile data
function goProf() {
  show('pg-profile');
  loadProfile();
}


// ── SECTION 7: TOAST NOTIFICATIONS ───────────────────


// Shows a small popup message on a specific video slide
// Automatically fades away after 2.5 seconds
//
// Parameters:
// id    = project ID (finds the right toast element)
// msg   = message to show
// color = background color of popup
//
// Used when:
// ⚡ Collab tapped → "⚡ Collab request sent!"
// 💰 Invest tapped → "💰 Investment sent!"
// ❤️ Like tapped   → "❤️ Liked!"
// 🔗 Share tapped  → "🔗 Link copied!"
function showToast(id, msg, color) {
  // Find toast element for this slide
  // Each slide has: <div class="toast" id="t-5">
  var el = document.getElementById('t-' + id);
  if (!el) return; // not found → do nothing safely

  // Set message, color, and make visible
  el.textContent = msg;
  el.style.background = color;
  el.style.opacity = '1';

  // After 2.5 seconds → fade away
  setTimeout(function() {
    el.style.opacity = '0';
  }, 2500);
}


// Shows a popup at the TOP of the entire screen
// Not tied to any specific slide
// Creates itself, shows, then removes itself
//
// Used for:
// "✅ Profile photo updated!"
// "❌ Upload failed, try again"
function showAvatarToast(msg) {
  // Create new popup element
  var t = document.createElement('div');

  // Position it at top center of screen
  t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';

  // Set the message
  t.textContent = msg;

  // Add to app
  document.getElementById('app').appendChild(t);

  // After 2.5 seconds → completely remove from page
  setTimeout(function() {
    t.remove();
  }, 2500);
}


// ── SECTION 8: TIME FORMATTER ─────────────────────────


// Converts a date to human readable time ago format
//
// Examples:
// 30 seconds ago → "now"
// 5 minutes ago  → "5m"
// 3 hours ago    → "3h"
// 2 days ago     → "2d"
//
// Used in Messages list to show when last message was sent
//
// How the math works:
// 60 seconds    = 1 minute
// 3600 seconds  = 1 hour  (60 x 60)
// 86400 seconds = 1 day   (60 x 60 x 24)
//
// Python equivalent:
// def time_ago(date_str):
//     s = (datetime.now() - datetime.fromisoformat(date_str)).seconds
//     if s < 60: return 'now'
//     if s < 3600: return f'{s//60}m'
//     if s < 86400: return f'{s//3600}h'
//     return f'{s//86400}d'
function timeAgo(dateStr) {
  // Get difference between now and the date in seconds
  var s = Math.floor((Date.now() - new Date(dateStr)) / 1000);

  // Less than 60 seconds → "now"
  if (s < 60) return 'now';

  // Less than 1 hour → show minutes
  // Example: 300 seconds → 300/60 = 5 → "5m"
  if (s < 3600) return Math.floor(s / 60) + 'm';

  // Less than 1 day → show hours
  // Example: 7200 seconds → 7200/3600 = 2 → "2h"
  if (s < 86400) return Math.floor(s / 3600) + 'h';

  // More than 1 day → show days
  // Example: 172800 seconds → 172800/86400 = 2 → "2d"
  return Math.floor(s / 86400) + 'd';
}
