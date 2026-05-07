// ── ENV.JS — BACKEND CONFIGURATION ──────────────────────────
//
// WHAT THIS FILE DOES:
// This is the FIRST script that loads in the app.
// It stores the backend server URL so every other
// JavaScript file knows where to send requests.
//
// WHAT IS NGROK?
// Our Python backend runs on this Mac at:
// http://127.0.0.1:8000
//
// BUT 127.0.0.1 means "MY OWN COMPUTER" —
// nobody else in the world can reach it!
//
// ngrok solves this by creating a TUNNEL:
//
//   Your Mac (127.0.0.1:8000)
//         ↕️ secret tunnel
//     ngrok servers
//         ↕️
//     The whole internet 🌍
//
// Think of it like this:
//   Your Mac    = The kitchen 🍳 (where Python runs)
//   ngrok       = The front door 🚪 (lets users in)
//   BACKEND_URL = The restaurant address 📍
//
// WARNING — ngrok is temporary!
// Every time you restart your Mac or close the terminal:
// → The tunnel closes
// → The URL may change
// → The app stops working
//
// When we move to Render.com later:
// → No more ngrok needed
// → Permanent URL that never changes
// → Works 24/7 even when Mac is off
//
// HOW OTHER FILES USE THIS:
// core.js reads this URL:
//   var BACKEND = window.WNU_CONFIG.BACKEND_URL
//
// Then every API call uses it:
//   fetch(BACKEND + '/api/auth/login')
//   fetch(BACKEND + '/api/projects')
//   fetch(BACKEND + '/api/matches')
//
// WHY IT'S A SEPARATE FILE:
// When we switch from ngrok to Render someday —
// we only change ONE line in this ONE file
// instead of changing every single JS file!

window.WNU_CONFIG = {
  // The URL where our Python/FastAPI backend lives
  // Right now → ngrok tunnel to our Mac
  // Future   → permanent Render.com URL
  BACKEND_URL: 'https://playset-demanding-sandbar.ngrok-free.dev'
};
