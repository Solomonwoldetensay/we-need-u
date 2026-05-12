// ── PAYMENTS ──────────────────────────
// Stripe payment integration for YOU-HAVE-VALUE
// Three plans: Collaborator, Founder, Investor

// Your Stripe publishable key
var STRIPE_PK = 'pk_test_51TTVjqBmby8hxyHxKIg2ECIJWbIX5PWu6VxfnbMjVFpRhPnjmR7UUloEdaLL8VJQ7KO9BAPb2lEPgdXziDCDmOjF00M7GR6ylr';

// Your 3 Stripe Price IDs
var PLANS = {
  collab: {
    name: 'Collaborator Pro',
    price: '$9.99/month',
    priceId: 'price_1TW1u9Bmby8hxyHxpnRIZxVq',
    color: '#7c6af7',
    emoji: '⚡',
    features: [
      'Unlimited collab requests',
      'See who viewed your pitch',
      'Priority in feed',
      'Direct messaging',
      'Profile badge'
    ]
  },
  founder: {
    name: 'Founder Pro',
    price: '$14.99/month',
    priceId: 'price_1TW21qBmby8hxyHxjLgvYSnM',
    color: '#e8a020',
    emoji: '🚀',
    features: [
      'Everything in Collaborator',
      'Post unlimited ideas',
      'Video analytics',
      'Featured placement',
      'Investor introductions',
      'Pitch coaching tips'
    ]
  },
  investor: {
    name: 'Investor Plan',
    price: '$29.99/month',
    priceId: 'price_1TW244Bmby8hxyHxZuEcE4FX',
    color: '#1db975',
    emoji: '💰',
    features: [
      'Everything in Founder',
      'See all startup pitches first',
      'Advanced founder filters',
      'Deal flow dashboard',
      'Direct founder outreach',
      'Monthly startup report',
      'Verified investor badge'
    ]
  }
};

// Opens the pricing screen
function showPricing() {
  // Create overlay if it doesn't exist
  var existing = document.getElementById('pricing-mask');
  if (existing) { existing.classList.add('on'); return; }

  // Create full screen pricing overlay
  var mask = document.createElement('div');
  mask.id = 'pricing-mask';
  mask.style.cssText = 'position:fixed;inset:0;background:#07070d;z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;';

  // Build pricing HTML
  mask.innerHTML =
    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:52px 20px 16px;">' +
      '<div>' +
        '<div style="font-size:22px;font-weight:900;color:#fff;">Upgrade Plan</div>' +
        '<div style="font-size:13px;color:#666;margin-top:4px;">Unlock your full potential</div>' +
      '</div>' +
      '<button onclick="hidePricing()" style="background:none;border:none;color:#666;font-size:24px;cursor:pointer;">✕</button>' +
    '</div>' +

    // Subtitle
    '<div style="text-align:center;padding:0 20px 24px;">' +
      '<div style="font-size:14px;color:#aaa;">Join founders and investors building the future</div>' +
    '</div>' +

    // Plans container
    '<div style="padding:0 16px 40px;display:flex;flex-direction:column;gap:16px;" id="plans-container">' +
    '</div>';

  document.getElementById('app').appendChild(mask);

  // Build each plan card
  var container = document.getElementById('plans-container');
  Object.keys(PLANS).forEach(function(key) {
    var plan = PLANS[key];
    var card = document.createElement('div');
    card.style.cssText = 'background:#111;border:1px solid ' + plan.color + '33;border-radius:20px;padding:24px;cursor:pointer;transition:all 0.2s;';

    // Features list HTML
    var featuresHTML = plan.features.map(function(f) {
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<div style="color:' + plan.color + ';font-size:14px;">✓</div>' +
        '<div style="font-size:13px;color:#ccc;">' + f + '</div>' +
      '</div>';
    }).join('');

    card.innerHTML =
      // Plan header
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="width:44px;height:44px;border-radius:12px;background:' + plan.color + '22;display:flex;align-items:center;justify-content:center;font-size:22px;">' + plan.emoji + '</div>' +
          '<div>' +
            '<div style="font-size:16px;font-weight:700;color:#fff;">' + plan.name + '</div>' +
            '<div style="font-size:13px;color:' + plan.color + ';font-weight:600;">' + plan.price + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Features
      '<div style="margin-bottom:20px;">' + featuresHTML + '</div>' +

      // Subscribe button
      '<button onclick="startCheckout(\'' + key + '\')" style="width:100%;padding:14px;background:' + plan.color + ';border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">' +
        'Get ' + plan.name + ' →' +
      '</button>';

    container.appendChild(card);
  });

  // Free plan note at bottom
  var freeNote = document.createElement('div');
  freeNote.style.cssText = 'text-align:center;padding:0 20px 40px;';
  freeNote.innerHTML = '<div style="font-size:12px;color:#555;">Free plan available with limited features</div>';
  mask.appendChild(freeNote);

  mask.classList.add('on');
}

// Hides the pricing screen
function hidePricing() {
  var mask = document.getElementById('pricing-mask');
  if (mask) mask.style.display = 'none';
}

// Starts Stripe Checkout for a plan
async function startCheckout(planKey) {
  var plan = PLANS[planKey];
  if (!plan) return;

  // Show loading state on button
  var btn = event.target;
  var originalText = btn.textContent;
  btn.textContent = 'Loading...';
  btn.disabled = true;

  try {
    // Call Node.js backend to create checkout session
    // POST /api/payments/create-checkout-session
    var r = await api('/payments/create-checkout-session', 'POST', {
      priceId: plan.priceId,
      planName: plan.name,
      successUrl: window.location.href + '?payment=success',
      cancelUrl: window.location.href + '?payment=cancelled'
    });

    if (r.ok && r.data.url) {
      // Redirect to Stripe Checkout page
      window.location.href = r.data.url;
    } else {
      alert('Could not start checkout. Please try again.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  } catch(e) {
    alert('Connection error. Please try again.');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// Check if returning from successful payment
window.addEventListener('load', function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    // Clean URL
    history.replaceState(null, null, window.location.pathname);
    // Show success message
    setTimeout(function() {
      showAvatarToast('🎉 Payment successful! Welcome to Pro!');
    }, 1000);
  }
  if (params.get('payment') === 'cancelled') {
    history.replaceState(null, null, window.location.pathname);
  }
});
