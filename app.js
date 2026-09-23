// ==========================================================================
// MULTI-SIMULATOR HUB APP CONTROLLER
// Supports Dashboard, Phantom Wallet, Shopify Admin, and Cash App
// ==========================================================================

// Global App State & Asset Resolvers
// Explicit direct literal new URL(..., import.meta.url).href is statically analyzed by Vite during build
// and natively resolved by the browser relative to app.js on GitHub Pages / subdirectories
const PHANTOM_COIN_LOGOS = {
  btc: new URL('./bitcoin-logo.png', import.meta.url).href,
  usdt: new URL('./usdt-logo.png', import.meta.url).href,
  solana: new URL('./solana-logo.png', import.meta.url).href,
  ethereum: new URL('./ethereum-logo.png', import.meta.url).href,
  usdc: new URL('./usdc-logo.png', import.meta.url).href,
  polygon: new URL('./polygon-logo.png', import.meta.url).href
};

const SHOPIFY_NOTIF_LOGO = new URL('./shopify green logo.webp', import.meta.url).href;
const SHOPIFY_SALE_SOUND_URL = new URL('./shopify_sale_sound.mp3', import.meta.url).href;

const state = {
  currentView: 'landing',
  cashAppAmount: '0',
  cashAppBalance: 0,
  cashAppActiveTab: 'keypad',
  cashAppHistory: [],
  phantom: {
    address: '9WzQ...7k2q',
    fullAddress: '9WzQxR64mY8cK3eN2uFpLt5J8vG1mZbAo41P7k2q',
    walletName: 'Wallet Name',
    cash: 0,
    tokens: {
      btc: 0,
      usdt: 0,
      solana: 0,
      ethereum: 0,
      usdc: 0,
      polygon: 0
    },
    prices: {
      btc: 66192.75,
      solana: 143.50,
      ethereum: 3350.00,
      usdt: 1.00,
      usdc: 1.00,
      polygon: 0.45
    }
  },
  shopify: {
    storeName: 'Shop Name',
    initials: 'LP',
    sales: '$800',
    salesGrowth: '+0%',
    orders: '20',
    ordersGrowth: '+0%',
    sessions: '0',
    sessionsGrowth: '0%',
    conv: '7%',
    convGrowth: '+0%',
    visitors: '0',
    fulfillOrders: 0,
    notificationsCount: 3,
    startingOrderNum: 1042,
    storeLogo: ''
  },
  isLoggedIn: false,
  userEmail: '',
  pendingDestination: null
};

// Restore existing session immediately
try {
  const saved = localStorage.getItem('larpkit_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.isLoggedIn) {
      state.isLoggedIn = true;
      state.userEmail = parsed.email || 'creator@larpkit.io';
    }
  }
} catch (e) { }

// Restore Phantom state
try {
  const savedPhantom = localStorage.getItem('larpkit_phantom');
  if (savedPhantom) {
    const parsedP = JSON.parse(savedPhantom);
    if (parsedP) {
      if (parsedP.walletName !== undefined) state.phantom.walletName = parsedP.walletName;
      if (parsedP.cash !== undefined) state.phantom.cash = parsedP.cash;
      if (parsedP.tokens) state.phantom.tokens = { ...state.phantom.tokens, ...parsedP.tokens };
    }
  }
} catch (e) { }

// Restore Shopify state
try {
  const savedShopify = localStorage.getItem('larpkit_shopify');
  if (savedShopify) {
    const parsedS = JSON.parse(savedShopify);
    if (parsedS) {
      state.shopify = { ...state.shopify, ...parsedS };
    }
  }
} catch (e) { }

let currentAuthMode = 'login';

function checkPasswordRules(pw) {
  pw = pw || '';
  const hasLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);

  const elLen = document.getElementById('rule-length');
  const elUpper = document.getElementById('rule-upper');
  const elLower = document.getElementById('rule-lower');
  const elNum = document.getElementById('rule-number');

  if (elLen) elLen.classList.toggle('valid', hasLen);
  if (elUpper) elUpper.classList.toggle('valid', hasUpper);
  if (elLower) elLower.classList.toggle('valid', hasLower);
  if (elNum) elNum.classList.toggle('valid', hasNum);

  return hasLen && hasUpper && hasLower && hasNum;
}

function updateUserNavUI() {
  const guestMenu = document.getElementById('nav-guest-menu');
  const authMenu = document.getElementById('nav-auth-menu');
  const emailDisplay = document.getElementById('nav-user-email-display');
  const userBtn = document.getElementById('nav-user-btn');

  if (state.isLoggedIn) {
    if (guestMenu) guestMenu.style.display = 'none';
    if (authMenu) authMenu.style.display = 'block';
    if (emailDisplay) emailDisplay.textContent = state.userEmail || 'creator@larpkit.io';
    if (userBtn) userBtn.style.borderColor = 'rgba(52, 211, 153, 0.4)';
  } else {
    if (guestMenu) guestMenu.style.display = 'block';
    if (authMenu) authMenu.style.display = 'none';
    if (userBtn) userBtn.style.borderColor = 'var(--border-subtle)';
  }
}

function openAuthModal(mode = 'signup', isGated = false) {
  currentAuthMode = mode;

  const authModal = document.getElementById('auth-modal');
  const authCard = document.getElementById('auth-modal-card');
  const stepCredentials = document.getElementById('auth-step-credentials');
  const stepCard = document.getElementById('auth-step-card');
  const authGateNotice = document.getElementById('auth-gate-notice');
  const authGateText = document.getElementById('auth-gate-text');
  const authTitle = document.getElementById('auth-card-title');
  const authDesc = document.getElementById('auth-card-desc');
  const pwRules = document.getElementById('auth-pw-rules');
  const pwExtras = document.getElementById('auth-pw-extras');
  const mainBtn = document.getElementById('auth-main-btn');
  const switchText = document.getElementById('auth-switch-text');
  const switchBtn = document.getElementById('auth-switch-btn');
  const passwordInput = document.getElementById('auth-password-input');

  if (!authModal) return;

  // Reset view to Step 1 (credentials)
  if (stepCredentials) stepCredentials.style.display = 'block';
  if (stepCard) stepCard.style.display = 'none';
  if (authCard) authCard.classList.remove('wider');

  // Gate notice
  if (authGateNotice) {
    if (isGated) {
      authGateNotice.style.display = 'flex';
      if (authGateText && state.pendingDestination) {
        const simNames = { phantom: 'Phantom Wallet', shopify: 'Shopify', cashapp: 'Cash App' };
        authGateText.textContent = `Please sign in to launch ${simNames[state.pendingDestination] || 'this app'}.`;
      }
    } else {
      authGateNotice.style.display = 'none';
    }
  }

  if (mode === 'signup') {
    if (authTitle) authTitle.textContent = 'Create your account';
    if (authDesc) authDesc.textContent = 'Make a new account to explore high-fidelity simulators. For free';
    if (pwRules) pwRules.style.display = 'block';
    if (pwExtras) pwExtras.style.display = 'none';
    if (mainBtn) mainBtn.textContent = 'Get Started';
    if (switchText) switchText.textContent = 'Already have an account?';
    if (switchBtn) switchBtn.textContent = 'Log in';
    if (passwordInput) checkPasswordRules(passwordInput.value);
  } else {
    if (authTitle) authTitle.textContent = 'Sign in with email';
    if (authDesc) authDesc.textContent = 'Make a new doc to bring your words, data, and teams together. For free';
    if (pwRules) pwRules.style.display = 'none';
    if (pwExtras) pwExtras.style.display = 'flex';
    if (mainBtn) mainBtn.textContent = 'Log In';
    if (switchText) switchText.textContent = "Don't have an account?";
    if (switchBtn) switchBtn.textContent = 'Sign up';
  }

  authModal.classList.add('active');
}

function closeAuthModal() {
  const authModal = document.getElementById('auth-modal');
  const authCard = document.getElementById('auth-modal-card');
  const stepCredentials = document.getElementById('auth-step-credentials');
  const stepCard = document.getElementById('auth-step-card');

  if (authModal) authModal.classList.remove('active');
  if (authCard) authCard.classList.remove('wider');
  if (stepCredentials) stepCredentials.style.display = 'block';
  if (stepCard) stepCard.style.display = 'none';
}

function completeAuthentication(email, isNewAccount = false) {
  state.isLoggedIn = true;
  state.userEmail = email || 'creator@larpkit.io';

  try {
    localStorage.setItem('larpkit_user', JSON.stringify({ isLoggedIn: true, email: state.userEmail }));
  } catch (e) { }

  updateUserNavUI();
  closeAuthModal();

  const welcomeMsg = isNewAccount
    ? `Account activated! Free access to all simulators granted.`
    : `Welcome back, ${state.userEmail}! Simulator unlocked.`;

  showToast(welcomeMsg);

  if (state.pendingDestination) {
    const dest = state.pendingDestination;
    state.pendingDestination = null;
    setTimeout(() => {
      navigateTo(dest);
    }, 350);
  }
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.updateUserNavUI = updateUserNavUI;
window.completeAuthentication = completeAuthentication;

// --------------------------------------------------------------------------
// ROUTER & NAVIGATION
// --------------------------------------------------------------------------
function navigateTo(viewName, pushHistory = true) {
  const validViews = ['landing', 'cashapp', 'phantom', 'shopify'];
  if (!validViews.includes(viewName)) {
    viewName = 'landing';
  }

  // Standalone simulator bypasses login gating
  const isStandalone = document.documentElement.dataset.standalone ||
                       new URLSearchParams(window.location.search).get('standalone') === 'true' ||
                       new URLSearchParams(window.location.search).get('app');

  if (isStandalone && ['cashapp', 'phantom', 'shopify'].includes(viewName)) {
    state.isLoggedIn = true;
  }

  // Gate simulators behind login
  if (['cashapp', 'phantom', 'shopify'].includes(viewName) && !state.isLoggedIn) {
    state.pendingDestination = viewName;
    openAuthModal('login', true);
    return;
  }

  // Update URL hash & clean index.html from address bar
  if (pushHistory) {
    if (viewName === 'landing') {
      let cleanPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '');
      if (!cleanPath) cleanPath = '/';
      window.history.pushState(null, '', cleanPath + window.location.search);
    } else {
      window.location.hash = `#${viewName}`;
    }
  }

  state.currentView = viewName;

  // Toggle visible view panel
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Hide context menu if open
  hideContextMenu();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Update theme color for browser navigation bar
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    if (viewName === 'cashapp') themeMeta.setAttribute('content', '#06ae13');
    else if (viewName === 'phantom') themeMeta.setAttribute('content', '#13141f');
    else if (viewName === 'shopify') {
      themeMeta.setAttribute('content', '#000000');
      renderShopifyDesktop();
    }
    else themeMeta.setAttribute('content', '#09090b');
  }
}

// Handle Browser Back / Forward & Initial Hash
function handleHashChange() {
  // Check if standalone or query app parameter is present
  const urlParams = new URLSearchParams(window.location.search);
  const requestedApp = urlParams.get('app') || document.documentElement.dataset.standalone;
  if (requestedApp && ['cashapp', 'phantom', 'shopify'].includes(requestedApp)) {
    state.isLoggedIn = true;
    navigateTo(requestedApp, false);
    return;
  }

  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (['cashapp', 'phantom', 'shopify'].includes(hash)) {
    if (!state.isLoggedIn) {
      state.pendingDestination = hash;
      navigateTo('landing', false);
      openAuthModal('login', true);
    } else {
      navigateTo(hash, false);
    }
  } else {
    let cleanPath = window.location.pathname;
    if (cleanPath.endsWith('/index.html')) {
      cleanPath = cleanPath.slice(0, -10) || '/';
    } else if (cleanPath.endsWith('.html') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      cleanPath = cleanPath.replace(/\.html$/, '');
    }
    if (!cleanPath) cleanPath = '/';
    if (cleanPath !== window.location.pathname) {
      window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
    }
    navigateTo('landing', false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

window.addEventListener('hashchange', handleHashChange);
window.addEventListener('popstate', handleHashChange);

// --------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// --------------------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// --------------------------------------------------------------------------
// SIMULATED MODALS
// --------------------------------------------------------------------------
function showSimModal({ iconSvg, iconBg, title, desc, actionText = 'Done' }) {
  const overlay = document.getElementById('sim-modal');
  if (!overlay) return;

  const iconEl = document.getElementById('modal-icon');
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  const closeBtn = document.getElementById('modal-close-btn');

  if (iconEl) {
    iconEl.innerHTML = iconSvg;
    iconEl.style.backgroundColor = iconBg;
  }
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (closeBtn) closeBtn.textContent = actionText;

  overlay.classList.add('active');
}

function hideSimModal() {
  const overlay = document.getElementById('sim-modal');
  if (overlay) overlay.classList.remove('active');
}

// --------------------------------------------------------------------------
// CONTEXT MENU (Custom Floating Menu with Back/Forward/Reload)
// --------------------------------------------------------------------------
const contextMenu = document.getElementById('custom-context-menu');

function showContextMenu(x, y) {
  if (!contextMenu) return;
  contextMenu.style.display = 'block';

  // Keep inside screen viewport
  const rect = contextMenu.getBoundingClientRect();
  const maxX = window.innerWidth - 190;
  const maxY = window.innerHeight - 200;
  contextMenu.style.left = `${Math.min(Math.max(10, x), maxX)}px`;
  contextMenu.style.top = `${Math.min(Math.max(10, y), maxY)}px`;
}

function hideContextMenu() {
  if (contextMenu) contextMenu.style.display = 'none';
}

// Right-click opens custom context menu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});

// Click outside closes it
document.addEventListener('click', (e) => {
  if (contextMenu && !contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// --------------------------------------------------------------------------
// CASH APP LOGIC & KEYPAD
// --------------------------------------------------------------------------
const MAX_CASHAPP_LIMIT = 99999;

function formatCashAppAmount(raw) {
  if (!raw || raw === '0') return '0';
  if (raw.includes('.')) {
    const [whole, decimal] = raw.split('.');
    const formattedWhole = Number(whole || 0).toLocaleString('en-US');
    return `${formattedWhole}.${decimal}`;
  }
  return Number(raw).toLocaleString('en-US');
}

function shakeCashAppAmount() {
  const displayVal = document.getElementById('cashapp-amount-display');
  if (!displayVal) return;
  displayVal.classList.remove('cashapp-shaking');
  void displayVal.offsetWidth; // trigger reflow
  displayVal.classList.add('cashapp-shaking');
  setTimeout(() => {
    displayVal.classList.remove('cashapp-shaking');
  }, 800);

  if (navigator.vibrate) {
    try {
      navigator.vibrate([30, 40, 30]);
    } catch (e) { }
  }
}

function updateCashAppDisplay(isTyping = false) {
  const displayVal = document.getElementById('cashapp-amount-display');
  const hiddenMeasure = document.getElementById('cashapp-measure-display');
  const minWarning = document.getElementById('cashapp-min-warning');

  const formatted = formatCashAppAmount(state.cashAppAmount);

  if (displayVal) {
    // Dynamic responsive font sizing so larger numbers scale smoothly
    let targetSize = '98px';
    if (!state.cashAppAmount || state.cashAppAmount === '0') {
      targetSize = '98px'; // Same size as single-digit typed numbers
    } else {
      const len = formatted.length;
      if (len >= 8) {
        targetSize = '64px';
      } else if (len >= 6) {
        targetSize = '84px';
      } else if (len >= 4) {
        targetSize = '90px';
      } else {
        targetSize = '98px';
      }
    }
    displayVal.style.fontSize = targetSize;

    // Render characters: newly typed digit blossoms with scale & ease-out transition
    const chars = formatted.split('');
    let digitsHtml = '';
    chars.forEach((ch, idx) => {
      // Mark last character as pop if typing
      const isNew = isTyping && (idx === chars.length - 1);
      if (isNew) {
        digitsHtml += `<span class="cashapp-digit cashapp-digit-pop">${ch}</span>`;
      } else {
        digitsHtml += `<span class="cashapp-digit">${ch}</span>`;
      }
    });

    displayVal.innerHTML = `<span class="cashapp-currency-symbol">$</span><span class="cashapp-digits-wrap">${digitsHtml}</span>`;
  }
  if (hiddenMeasure) {
    hiddenMeasure.innerHTML = `<span>$</span>${formatted}`;
  }

  // Minimum warning if typing 0 or empty when action clicked
  if (minWarning) {
    minWarning.style.opacity = '0';
  }
}

function handleCashAppKeyPress(key) {
  let cur = state.cashAppAmount;
  let isAdd = false;

  if (key === 'backspace') {
    if (cur.length > 1) {
      state.cashAppAmount = cur.slice(0, -1);
    } else {
      state.cashAppAmount = '0';
    }
  } else if (key === '.') {
    if (cur.includes('.')) {
      shakeCashAppAmount();
      return;
    }
    const candidate = cur + '.';
    if (parseFloat(candidate) > MAX_CASHAPP_LIMIT) {
      shakeCashAppAmount();
      return;
    }
    state.cashAppAmount = candidate;
    isAdd = true;
  } else {
    // Digits 0-9
    let candidate = '';
    if (cur === '0') {
      candidate = key;
    } else {
      // Prevent more than 2 decimal places
      if (cur.includes('.')) {
        const parts = cur.split('.');
        if (parts[1] && parts[1].length >= 2) {
          shakeCashAppAmount();
          return;
        }
      }
      candidate = cur + key;
    }

    // Enforce maximum limit of 99999 (do not take input, trigger vibration)
    const num = parseFloat(candidate);
    const wholePart = candidate.split('.')[0];
    if (num > MAX_CASHAPP_LIMIT || wholePart.length > 5 || parseInt(wholePart, 10) > MAX_CASHAPP_LIMIT) {
      shakeCashAppAmount();
      return;
    }

    state.cashAppAmount = candidate;
    isAdd = true;
  }

  updateCashAppDisplay(isAdd);
}

// --------------------------------------------------------------------------
// CASH APP PAY SHEET & SEARCH (Screenshots 1 & 2)
// --------------------------------------------------------------------------
const cashAppContacts = [
  { name: 'Aaron Brooks', cashtag: '$allmigt', initial: 'A', bg: '#e85656' },
  { name: 'Marcus Thomas', cashtag: '$allmigt2', initial: 'M', bg: '#e85656' },
  { name: 'Alex Lewis', cashtag: '$allmigtt', initial: 'A', bg: '#d87498' },
  { name: 'Devin Parker', cashtag: '$allmi5', initial: 'D', bg: '#e86b59' },
  { name: 'Sarah Jenkins', cashtag: '$sarahj22', initial: 'S', bg: '#5c7cfa' },
  { name: 'Michael Chen', cashtag: '$mchen_ai', initial: 'M', bg: '#20c997' },
  { name: 'Emma Watson', cashtag: '$emma_w', initial: 'E', bg: '#f06595' },
  { name: 'Liam Kelly', cashtag: '$liamk', initial: 'L', bg: '#51cf66' },
  { name: 'Chloe Bennett', cashtag: '$chloeb', initial: 'C', bg: '#845ef7' },
  { name: 'Lucas Vance', cashtag: '$lucasv', initial: 'L', bg: '#fcc419' },
  { name: 'Sophia Miller', cashtag: '$sophiam', initial: 'S', bg: '#ff922b' },
  { name: 'Ethan Ross', cashtag: '$ethanr', initial: 'E', bg: '#ff6b6b' }
];

let selectedCashAppRecipient = null;
let cashAppSearchDebounce = null;

function getFilteredCashAppContacts(query) {
  const q = query.trim().toLowerCase().replace('$', '');
  if (!q) return [];

  const capitalized = q.charAt(0).toUpperCase() + q.slice(1);

  // Exact match structure from Screenshots 2 & 3:
  // Option 1 dynamically reflects the typed name/cashtag
  // Options 2-4 provide the authentic peer options
  return [
    {
      name: `${capitalized} Hayes`,
      cashtag: `$${q}`,
      initial: capitalized.charAt(0) || 'I',
      bg: '#29b6f6'
    },
    {
      name: 'Sean Anderson',
      cashtag: '$seana',
      initial: 'S',
      bg: '#22c55e'
    },
    {
      name: 'Dylan Garcia',
      cashtag: '$dylan39',
      initial: 'D',
      bg: '#3b82f6'
    },
    {
      name: 'Alex Walker',
      cashtag: '$awalker',
      initial: 'A',
      bg: '#f59e0b'
    }
  ];
}

function openCashAppPaySheet(amountText) {
  const sheet = document.getElementById('cashapp-pay-sheet');
  const amountEl = document.getElementById('pay-sheet-amount');
  const confirmAmountEl = document.getElementById('cashapp-confirm-amount');
  const input = document.getElementById('cashapp-recipient-input');
  const contactsCard = document.getElementById('cashapp-contacts-card');
  const spinnerWrap = document.getElementById('cashapp-search-spinner');
  const resultsSection = document.getElementById('cashapp-results-section');
  const resultsContainer = document.getElementById('cashapp-results-list');
  const searchView = document.getElementById('cashapp-view-search');
  const confirmView = document.getElementById('cashapp-view-confirm');
  const backBtn = document.getElementById('cashapp-pay-sheet-back');
  const closeBtn = document.getElementById('cashapp-pay-sheet-close');

  if (!sheet) return;

  if (amountEl) amountEl.textContent = amountText;
  if (confirmAmountEl) confirmAmountEl.textContent = amountText;

  // Reset to Step 1 (Search View)
  if (searchView) searchView.style.display = 'block';
  if (confirmView) confirmView.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';
  if (closeBtn) closeBtn.style.display = 'flex';

  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }

  if (contactsCard) contactsCard.style.display = 'block';
  if (spinnerWrap) spinnerWrap.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';
  if (resultsContainer) resultsContainer.innerHTML = '';

  sheet.classList.add('active');
}

function closeCashAppPaySheet() {
  const sheet = document.getElementById('cashapp-pay-sheet');
  if (sheet) sheet.classList.remove('active');
  if (cashAppSearchDebounce) clearTimeout(cashAppSearchDebounce);
}

function handleCashAppSearchInput(query) {
  const contactsCard = document.getElementById('cashapp-contacts-card');
  const spinnerWrap = document.getElementById('cashapp-search-spinner');
  const resultsSection = document.getElementById('cashapp-results-section');
  const resultsContainer = document.getElementById('cashapp-results-list');

  if (cashAppSearchDebounce) clearTimeout(cashAppSearchDebounce);

  const trimmed = query.trim();
  if (trimmed === '') {
    if (contactsCard) contactsCard.style.display = 'block';
    if (spinnerWrap) spinnerWrap.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'none';
    if (resultsContainer) resultsContainer.innerHTML = '';
    return;
  }

  // Hide contacts card & results immediately while user is typing
  if (contactsCard) contactsCard.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';

  // Show loading spinner (Screenshot 2)
  if (spinnerWrap) spinnerWrap.style.display = 'flex';

  // Debounce: Only once user finishes typing, show options (Screenshot 3)
  cashAppSearchDebounce = setTimeout(() => {
    if (spinnerWrap) spinnerWrap.style.display = 'none';
    const matches = getFilteredCashAppContacts(trimmed);

    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      matches.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cashapp-result-item';
        row.innerHTML = `
          <div class="cashapp-avatar-circle" style="background-color: ${item.bg};">${item.initial}</div>
          <div class="cashapp-user-info">
            <div class="cashapp-user-name">${item.name}</div>
            <div class="cashapp-user-cashtag">${item.cashtag}</div>
          </div>
        `;
        row.addEventListener('click', () => {
          selectCashAppRecipient(item);
        });
        resultsContainer.appendChild(row);
      });
    }

    if (resultsSection) resultsSection.style.display = 'flex';
  }, 480);
}

function selectCashAppRecipient(recipient) {
  selectedCashAppRecipient = recipient;

  const searchView = document.getElementById('cashapp-view-search');
  const confirmView = document.getElementById('cashapp-view-confirm');
  const backBtn = document.getElementById('cashapp-pay-sheet-back');
  const closeBtn = document.getElementById('cashapp-pay-sheet-close');

  const avatarEl = document.getElementById('cashapp-confirm-avatar');
  const shortNameEl = document.getElementById('cashapp-confirm-short-name');
  const noteInput = document.getElementById('cashapp-note-input');
  const reviewBtn = document.getElementById('cashapp-review-btn');
  const noteDisplay = document.getElementById('cashapp-confirm-note-display');
  const finalPayBox = document.getElementById('cashapp-final-pay-box');

  // Format short name: First name + Last initial (e.g. "Igbibb H." from Screenshot 4)
  const nameParts = recipient.name.split(' ');
  const shortName = nameParts.length > 1
    ? `${nameParts[0]} ${nameParts[1].charAt(0)}.`
    : recipient.name;

  if (avatarEl) {
    avatarEl.textContent = recipient.initial;
    avatarEl.style.backgroundColor = recipient.bg;
  }
  if (shortNameEl) shortNameEl.textContent = shortName;

  // Switch to Step 4 (Note View)
  if (searchView) searchView.style.display = 'none';
  if (confirmView) confirmView.style.display = 'block';
  if (backBtn) backBtn.style.display = 'flex';
  if (closeBtn) closeBtn.style.display = 'none';

  // Reset note & pay box
  if (noteInput) {
    noteInput.value = '';
    setTimeout(() => noteInput.focus(), 150);
  }
  if (reviewBtn) {
    reviewBtn.classList.remove('active');
    reviewBtn.disabled = true;
  }
  if (noteDisplay) {
    noteDisplay.style.display = 'none';
    noteDisplay.textContent = '';
  }
  if (finalPayBox) {
    finalPayBox.style.display = 'none';
  }
}

function handleCashAppNoteSubmit() {
  const noteInput = document.getElementById('cashapp-note-input');
  const noteDisplay = document.getElementById('cashapp-confirm-note-display');
  const finalPayBox = document.getElementById('cashapp-final-pay-box');

  const noteVal = (noteInput ? noteInput.value.trim() : '') || 'MAKE NO MISTAKES';

  if (noteDisplay) {
    noteDisplay.textContent = noteVal.toUpperCase();
    noteDisplay.style.display = 'block';
  }

  // Show Step 5 funding pill & Pay button
  if (finalPayBox) {
    finalPayBox.style.display = 'block';
  }
}

function getCurrentTimeFormatted() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function updateCashAppHomeBalance() {
  const balEl = document.getElementById('cashapp-main-cash-balance');
  const subEl = document.getElementById('cashapp-add-money-sub');
  const formatted = `$${state.cashAppBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (balEl) balEl.textContent = formatted;
  if (subEl) subEl.textContent = `Cash balance ${formatted}`;
  try {
    localStorage.setItem('cashapp_balance', state.cashAppBalance.toString());
  } catch (e) { }
}

function renderCashAppHistory() {
  const emptyEl = document.getElementById('cashapp-history-empty');
  const listEl = document.getElementById('cashapp-history-list');
  if (!emptyEl || !listEl) return;

  if (!state.cashAppHistory || state.cashAppHistory.length === 0) {
    emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    listEl.innerHTML = '';
  } else {
    emptyEl.style.display = 'none';
    listEl.style.display = 'flex';
    listEl.innerHTML = '';

    state.cashAppHistory.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cashapp-history-item';
      row.innerHTML = `
        <div class="cashapp-history-avatar" style="background-color: ${item.bg || '#29b6f6'};">${item.initial || 'I'}</div>
        <div class="cashapp-history-info">
          <div class="cashapp-history-name">${item.name}</div>
          <div class="cashapp-history-note">${item.note}</div>
          <div class="cashapp-history-time">${item.time}</div>
        </div>
        <div class="cashapp-history-amount">-${item.amount}</div>
      `;
      listEl.appendChild(row);
    });
  }
}

function switchCashAppTab(tabName) {
  state.cashAppActiveTab = tabName;

  const phoneContainer = document.getElementById('cashapp-phone-container');
  const viewCashApp = document.getElementById('view-cashapp');
  const tabKeypad = document.getElementById('cashapp-tab-keypad');
  const tabHome = document.getElementById('cashapp-tab-home');
  const tabHistory = document.getElementById('cashapp-tab-history');

  document.querySelectorAll('.cashapp-tab-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cashappTab === tabName);
  });

  if (tabName === 'keypad') {
    if (phoneContainer) {
      phoneContainer.classList.remove('dark-theme');
      phoneContainer.style.backgroundColor = 'rgb(6, 174, 19)';
    }
    if (viewCashApp) viewCashApp.classList.remove('dark-theme');
    if (tabKeypad) tabKeypad.style.display = 'flex';
    if (tabHome) tabHome.style.display = 'none';
    if (tabHistory) tabHistory.style.display = 'none';
  } else if (tabName === 'home') {
    if (phoneContainer) {
      phoneContainer.classList.add('dark-theme');
      phoneContainer.style.backgroundColor = '#000000';
    }
    if (viewCashApp) viewCashApp.classList.add('dark-theme');
    if (tabKeypad) tabKeypad.style.display = 'none';
    if (tabHome) tabHome.style.display = 'block';
    if (tabHistory) tabHistory.style.display = 'none';
    updateCashAppHomeBalance();
  } else if (tabName === 'history') {
    if (phoneContainer) {
      phoneContainer.classList.add('dark-theme');
      phoneContainer.style.backgroundColor = '#000000';
    }
    if (viewCashApp) viewCashApp.classList.add('dark-theme');
    if (tabKeypad) tabKeypad.style.display = 'none';
    if (tabHome) tabHome.style.display = 'none';
    if (tabHistory) tabHistory.style.display = 'block';
    renderCashAppHistory();
  }
}

let selectedAddMoneyAmount = 25;

function openCashAppAddMoneySheet() {
  const sheet = document.getElementById('cashapp-add-money-sheet');
  if (sheet) {
    updateCashAppHomeBalance();
    sheet.style.display = 'flex';
  }
}

function closeCashAppAddMoneySheet() {
  const sheet = document.getElementById('cashapp-add-money-sheet');
  if (sheet) {
    sheet.style.display = 'none';
  }
}

function handleAddMoneySubmit() {
  state.cashAppBalance += selectedAddMoneyAmount;
  updateCashAppHomeBalance();
  closeCashAppAddMoneySheet();

  // Show Big Black Screen for Add Money confirmation
  const successScreen = document.getElementById('cashapp-success-screen');
  const messageEl = document.getElementById('cashapp-success-message');
  if (messageEl) {
    messageEl.textContent = `$${selectedAddMoneyAmount} added to your Cash balance`;
  }
  if (successScreen) {
    successScreen.style.display = 'flex';
  }
}

function executeCashAppPayment() {
  const amount = document.getElementById('pay-sheet-amount')?.textContent || '$99,999';
  const recipientName = selectedCashAppRecipient ? selectedCashAppRecipient.name : 'Igbibb Hayes';
  const noteInput = document.getElementById('cashapp-note-input');
  const noteText = (noteInput ? noteInput.value.trim() : '') || 'MAKE NO MISTAKES';

  closeCashAppPaySheet();

  // Deduct from Home Cash Balance:
  // If balance >= amount sent, subtract amount. If lesser, let it be zero.
  const numericSent = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  if (state.cashAppBalance >= numericSent) {
    state.cashAppBalance -= numericSent;
  } else {
    state.cashAppBalance = 0;
  }
  updateCashAppHomeBalance();

  // Record payment in History (Screenshot 1)
  state.cashAppHistory.unshift({
    name: recipientName,
    note: noteText,
    amount: amount,
    time: getCurrentTimeFormatted(),
    initial: selectedCashAppRecipient ? selectedCashAppRecipient.initial : 'I',
    bg: selectedCashAppRecipient ? selectedCashAppRecipient.bg : '#29b6f6'
  });

  // Show Big Black Screen (Screenshot 6 / User Request)
  const successScreen = document.getElementById('cashapp-success-screen');
  const messageEl = document.getElementById('cashapp-success-message');

  if (messageEl) {
    messageEl.textContent = `You sent ${amount} to ${recipientName}`;
  }
  if (successScreen) {
    successScreen.style.display = 'flex';
  }

  // Reset keypad amount
  state.cashAppAmount = '0';
  updateCashAppDisplay();
}

function closeCashAppSuccessScreen() {
  const successScreen = document.getElementById('cashapp-success-screen');
  if (successScreen) {
    successScreen.style.display = 'none';
  }
}

function triggerCashAppAction(actionType) {
  // Request and Pool buttons do not work per requirement
  if (actionType !== 'pay') return;

  let numVal = parseFloat(state.cashAppAmount);
  if (!numVal || numVal <= 0) {
    numVal = 99999;
    state.cashAppAmount = '99999';
    updateCashAppDisplay();
  }
  const formattedAmount = `$${numVal.toLocaleString('en-US')}`;
  openCashAppPaySheet(formattedAmount);
}

// --------------------------------------------------------------------------
// PHANTOM WALLET LOGIC
// --------------------------------------------------------------------------
function formatPhantomCurrency(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPhantomUI() {
  const walletNameEl = document.getElementById('phantom-display-wallet-name');
  const portfolioValEl = document.getElementById('phantom-portfolio-val');
  const changeAmtEl = document.getElementById('phantom-change-amt');
  const changeBadgeEl = document.getElementById('phantom-change-badge');
  const cashValEl = document.getElementById('phantom-cash-val');
  const tokensListEl = document.getElementById('phantom-tokens-list');

  const wName = state.phantom.walletName || 'Wallet Name';
  if (walletNameEl) {
    walletNameEl.textContent = wName;
  }
  const sideHandle = document.getElementById('phantom-sidebar-handle');
  const sideText = document.getElementById('phantom-sidebar-wallet-text');
  const sideAvatar = document.getElementById('phantom-sidebar-avatar-char');
  if (sideHandle) sideHandle.textContent = `@${wName}`;
  if (sideText) sideText.textContent = wName;
  if (sideAvatar) sideAvatar.textContent = (wName || 'W').charAt(0).toUpperCase();

  // Calculate total balance
  const cashAmt = parseFloat(state.phantom.cash) || 0;
  let totalCrypto = 0;
  Object.entries(state.phantom.tokens).forEach(([k, qty]) => {
    const q = parseFloat(qty) || 0;
    const price = state.phantom.prices[k] || 0;
    totalCrypto += q * price;
  });
  const totalVal = cashAmt + totalCrypto;

  if (portfolioValEl) {
    portfolioValEl.textContent = formatPhantomCurrency(totalVal);
  }
  if (changeAmtEl) {
    changeAmtEl.textContent = '+' + formatPhantomCurrency(totalVal);
  }
  if (changeBadgeEl) {
    changeBadgeEl.textContent = '+0.00%';
  }
  if (cashValEl) {
    cashValEl.textContent = formatPhantomCurrency(cashAmt);
  }

  if (tokensListEl) {
    const tokenDefs = [
      { key: 'btc', name: 'BTC', logo: PHANTOM_COIN_LOGOS.btc, ticker: 'BTC' },
      { key: 'usdt', name: 'USDT', logo: PHANTOM_COIN_LOGOS.usdt, ticker: 'USDT' },
      { key: 'solana', name: 'Solana', logo: PHANTOM_COIN_LOGOS.solana, ticker: 'SOL' },
      { key: 'ethereum', name: 'Ethereum', logo: PHANTOM_COIN_LOGOS.ethereum, ticker: 'ETH' },
      { key: 'usdc', name: 'USDC', logo: PHANTOM_COIN_LOGOS.usdc, ticker: 'USDC' },
      { key: 'polygon', name: 'Polygon', logo: PHANTOM_COIN_LOGOS.polygon, ticker: 'POL' }
    ];

    // Ensure settings modal coin icons also use resolved URLs
    document.querySelectorAll('.phantom-field-icon').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src.includes('bitcoin-logo.png')) img.src = PHANTOM_COIN_LOGOS.btc;
      else if (src.includes('usdt-logo.png')) img.src = PHANTOM_COIN_LOGOS.usdt;
      else if (src.includes('solana-logo.png')) img.src = PHANTOM_COIN_LOGOS.solana;
      else if (src.includes('ethereum-logo.png')) img.src = PHANTOM_COIN_LOGOS.ethereum;
      else if (src.includes('usdc-logo.png')) img.src = PHANTOM_COIN_LOGOS.usdc;
      else if (src.includes('polygon-logo.png')) img.src = PHANTOM_COIN_LOGOS.polygon;
    });

    // Order tokens: positive balances first (sorted by fiat value desc), then the rest in default order
    const tokensWithBalances = [];
    const tokensZero = [];

    tokenDefs.forEach(t => {
      const q = parseFloat(state.phantom.tokens[t.key]) || 0;
      const fiat = q * (state.phantom.prices[t.key] || 0);
      if (q > 0) {
        tokensWithBalances.push({ ...t, qty: q, fiat });
      } else {
        tokensZero.push({ ...t, qty: 0, fiat: 0 });
      }
    });

    tokensWithBalances.sort((a, b) => b.fiat - a.fiat);
    const sortedTokens = [...tokensWithBalances, ...tokensZero];

    tokensListEl.innerHTML = sortedTokens.map(t => {
      const changeStr = t.qty > 0 ? '+' + formatPhantomCurrency(t.fiat) : '$0.00';
      const changeClass = t.qty > 0 ? 'phantom-token-change green' : 'phantom-token-change';
      return `
        <div class="phantom-token-card" data-token="${t.key}">
          <div class="phantom-token-left">
            <img src="${t.logo}" alt="${t.name}" class="phantom-token-logo">
            <div class="phantom-token-info">
              <div class="phantom-token-name-row">
                <span class="phantom-token-symbol">${t.name}</span>
                <span class="phantom-verified-badge" title="Verified Token">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#000000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              </div>
              <div class="phantom-token-qty">${t.qty} ${t.ticker}</div>
            </div>
          </div>
          <div class="phantom-token-right">
            <div class="phantom-token-fiat">${formatPhantomCurrency(t.fiat)}</div>
            <div class="${changeClass}">${changeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function openPhantomSpeedDial() {
  const dial = document.getElementById('phantom-speed-dial');
  if (dial) dial.classList.add('active');
}

function closePhantomSpeedDial() {
  const dial = document.getElementById('phantom-speed-dial');
  if (dial) dial.classList.remove('active');
}

function togglePhantomSidebar(forceState) {
  const drawer = document.getElementById('phantom-sidebar-drawer');
  const backdrop = document.getElementById('phantom-sidebar-backdrop');
  if (!drawer || !backdrop) return;

  const shouldOpen = (typeof forceState === 'boolean')
    ? forceState
    : !drawer.classList.contains('active');

  if (shouldOpen) {
    const wName = state.phantom.walletName || 'Wallet Name';
    const sideHandle = document.getElementById('phantom-sidebar-handle');
    const sideText = document.getElementById('phantom-sidebar-wallet-text');
    const sideAvatar = document.getElementById('phantom-sidebar-avatar-char');
    if (sideHandle) sideHandle.textContent = `@${wName}`;
    if (sideText) sideText.textContent = wName;
    if (sideAvatar) sideAvatar.textContent = (wName || 'W').charAt(0).toUpperCase();

    backdrop.classList.add('active');
    drawer.classList.add('active');
  } else {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  }
}

function openPhantomSettingsModal() {
  const modal = document.getElementById('phantom-settings-modal');
  if (!modal) return;

  const nameInput = document.getElementById('phantom-input-wallet-name');
  const cashInput = document.getElementById('phantom-input-cash');
  const usdtInput = document.getElementById('phantom-input-usdt');
  const solInput = document.getElementById('phantom-input-solana');
  const ethInput = document.getElementById('phantom-input-ethereum');
  const btcInput = document.getElementById('phantom-input-btc');
  const usdcInput = document.getElementById('phantom-input-usdc');
  const polyInput = document.getElementById('phantom-input-polygon');

  if (nameInput) nameInput.value = state.phantom.walletName || 'Wallet Name';
  if (cashInput) cashInput.value = state.phantom.cash !== undefined ? state.phantom.cash : 0;
  if (usdtInput) usdtInput.value = state.phantom.tokens.usdt !== undefined ? state.phantom.tokens.usdt : 0;
  if (solInput) solInput.value = state.phantom.tokens.solana !== undefined ? state.phantom.tokens.solana : 0;
  if (ethInput) ethInput.value = state.phantom.tokens.ethereum !== undefined ? state.phantom.tokens.ethereum : 0;
  if (btcInput) btcInput.value = state.phantom.tokens.btc !== undefined ? state.phantom.tokens.btc : 0;
  if (usdcInput) usdcInput.value = state.phantom.tokens.usdc !== undefined ? state.phantom.tokens.usdc : 0;
  if (polyInput) polyInput.value = state.phantom.tokens.polygon !== undefined ? state.phantom.tokens.polygon : 0;

  modal.classList.add('active');
}

function closePhantomSettingsModal() {
  const modal = document.getElementById('phantom-settings-modal');
  if (modal) modal.classList.remove('active');
}

function resetPhantomSettingsInputs() {
  const cashInput = document.getElementById('phantom-input-cash');
  const usdtInput = document.getElementById('phantom-input-usdt');
  const solInput = document.getElementById('phantom-input-solana');
  const ethInput = document.getElementById('phantom-input-ethereum');
  const btcInput = document.getElementById('phantom-input-btc');
  const usdcInput = document.getElementById('phantom-input-usdc');
  const polyInput = document.getElementById('phantom-input-polygon');

  if (cashInput) cashInput.value = 0;
  if (usdtInput) usdtInput.value = 0;
  if (solInput) solInput.value = 0;
  if (ethInput) ethInput.value = 0;
  if (btcInput) btcInput.value = 0;
  if (usdcInput) usdcInput.value = 0;
  if (polyInput) polyInput.value = 0;

  showToast('Numbers reset to 0. Click Done to apply.');
}

function savePhantomSettings() {
  const nameInput = document.getElementById('phantom-input-wallet-name');
  const cashInput = document.getElementById('phantom-input-cash');
  const usdtInput = document.getElementById('phantom-input-usdt');
  const solInput = document.getElementById('phantom-input-solana');
  const ethInput = document.getElementById('phantom-input-ethereum');
  const btcInput = document.getElementById('phantom-input-btc');
  const usdcInput = document.getElementById('phantom-input-usdc');
  const polyInput = document.getElementById('phantom-input-polygon');

  if (nameInput) state.phantom.walletName = nameInput.value.trim() || 'Wallet Name';
  if (cashInput) state.phantom.cash = parseFloat(cashInput.value) || 0;
  if (usdtInput) state.phantom.tokens.usdt = parseFloat(usdtInput.value) || 0;
  if (solInput) state.phantom.tokens.solana = parseFloat(solInput.value) || 0;
  if (ethInput) state.phantom.tokens.ethereum = parseFloat(ethInput.value) || 0;
  if (btcInput) state.phantom.tokens.btc = parseFloat(btcInput.value) || 0;
  if (usdcInput) state.phantom.tokens.usdc = parseFloat(usdcInput.value) || 0;
  if (polyInput) state.phantom.tokens.polygon = parseFloat(polyInput.value) || 0;

  try {
    localStorage.setItem('larpkit_phantom', JSON.stringify({
      walletName: state.phantom.walletName,
      cash: state.phantom.cash,
      tokens: state.phantom.tokens
    }));
  } catch (e) { }

  renderPhantomUI();
  closePhantomSettingsModal();
  showToast('Balance updated!');
}

// --------------------------------------------------------------------------
// SHOPIFY DESKTOP DASHBOARD LOGIC (Desktop Admin Simulator)
// --------------------------------------------------------------------------
function updateShopifyGreeting() {
  const greetingEl = document.getElementById('shopify-greeting-heading');
  if (!greetingEl) return;
  const hour = new Date().getHours();
  let text = 'Good afternoon!';
  if (hour < 12) text = 'Good morning!';
  else if (hour >= 18) text = 'Good evening!';
  greetingEl.textContent = text;
}

function renderShopifyDesktop() {
  updateShopifyGreeting();

  const storeName = state.shopify.storeName || 'Shop Name';

  // Desktop Store name
  const storeNameDisplay = document.getElementById('shopify-display-store-name');
  if (storeNameDisplay) storeNameDisplay.textContent = storeName;

  // Mobile Store name
  const mobileStoreNameDisplay = document.getElementById('shopify-mobile-store-name');
  if (mobileStoreNameDisplay) mobileStoreNameDisplay.textContent = storeName;

  // Metrics Values
  const salesVal = state.shopify.sales || '$800';
  const salesGrowthVal = state.shopify.salesGrowth || '+0%';
  const ordersVal = state.shopify.orders || '20';
  const ordersGrowthVal = state.shopify.ordersGrowth || '+0%';
  const sessionsVal = state.shopify.sessions || '0';
  const sessionsGrowthVal = state.shopify.sessionsGrowth || '+0%';
  const convVal = state.shopify.conv || '7%';
  const convGrowthVal = state.shopify.convGrowth || '+0%';
  const visitorsVal = state.shopify.visitors || '0';
  const rawFulfill = parseInt(state.shopify.fulfillOrders, 10) || 0;
  const fulfillVal = rawFulfill > 50 ? '50+' : String(rawFulfill);

  // Desktop Metrics
  const salesEl = document.getElementById('shopify-display-sales');
  const salesGrowthEl = document.getElementById('shopify-display-growth-sales');
  const ordersEl = document.getElementById('shopify-display-orders');
  const ordersGrowthEl = document.getElementById('shopify-display-growth-orders');
  const sessionsEl = document.getElementById('shopify-display-sessions');
  const sessionsGrowthEl = document.getElementById('shopify-display-growth-sessions');
  const convEl = document.getElementById('shopify-display-conv');
  const convGrowthEl = document.getElementById('shopify-display-growth-conv');
  const visitorsEl = document.getElementById('shopify-display-visitors');
  const fulfillCountEl = document.getElementById('shopify-display-fulfill-count');
  const sideOrdersBadge = document.getElementById('shopify-side-orders-badge');

  if (salesEl) salesEl.textContent = salesVal;
  if (salesGrowthEl) salesGrowthEl.textContent = salesGrowthVal;
  if (ordersEl) ordersEl.textContent = ordersVal;
  if (ordersGrowthEl) ordersGrowthEl.textContent = ordersGrowthVal;
  if (sessionsEl) sessionsEl.textContent = sessionsVal;
  if (sessionsGrowthEl) sessionsGrowthEl.textContent = sessionsGrowthVal;
  if (convEl) convEl.textContent = convVal;
  if (convGrowthEl) convGrowthEl.textContent = convGrowthVal;
  if (visitorsEl) visitorsEl.textContent = visitorsVal;
  if (fulfillCountEl) fulfillCountEl.textContent = fulfillVal;
  if (sideOrdersBadge) sideOrdersBadge.textContent = ordersVal === '0' ? '4' : ordersVal;

  // Mobile Metrics
  const mobSalesEl = document.getElementById('shopify-mobile-sales');
  const mobSalesGrowthEl = document.getElementById('shopify-mobile-growth-sales');
  const mobOrdersEl = document.getElementById('shopify-mobile-orders');
  const mobOrdersGrowthEl = document.getElementById('shopify-mobile-growth-orders');
  const mobConvEl = document.getElementById('shopify-mobile-conv');
  const mobConvGrowthEl = document.getElementById('shopify-mobile-growth-conv');
  const mobVisitorsEl = document.getElementById('shopify-mobile-visitors');
  const mobFulfillEl = document.getElementById('shopify-mobile-display-fulfill');

  if (mobSalesEl) mobSalesEl.textContent = salesVal;
  if (mobSalesGrowthEl) mobSalesGrowthEl.textContent = salesGrowthVal;
  if (mobOrdersEl) mobOrdersEl.textContent = ordersVal;
  if (mobOrdersGrowthEl) mobOrdersGrowthEl.textContent = ordersGrowthVal;
  if (mobConvEl) mobConvEl.textContent = convVal;
  if (mobConvGrowthEl) mobConvGrowthEl.textContent = convGrowthVal;
  if (mobVisitorsEl) mobVisitorsEl.textContent = visitorsVal;
  if (mobFulfillEl) mobFulfillEl.textContent = fulfillVal;

  renderShopifyStoreProfile();
  updateShopifyNotificationBadge();
  renderShopifyNotificationDropdown();
}

// --------------------------------------------------------------------------
// SHOPIFY REAL-TIME NOTIFICATIONS & LOGO CONTROLLER
// --------------------------------------------------------------------------
let shopifyNotifItems = [];

try {
  const savedNotifItems = localStorage.getItem('larpkit_shopify_notif_items');
  if (savedNotifItems) {
    const parsedItems = JSON.parse(savedNotifItems);
    if (Array.isArray(parsedItems)) shopifyNotifItems = parsedItems;
  }
} catch (e) { }

const defaultOrderTemplates = [
  { customer: 'Emma Watson', city: 'London', product: 'Oversized Vintage Hoodie', amount: '$74.00', itemsCount: 2 },
  { customer: 'Alex Turner', city: 'Sheffield', product: 'Leather Chelsea Boots', amount: '$128.50', itemsCount: 1 },
  { customer: 'Marcus Thomas', city: 'Atlanta', product: 'Minimalist Ceramic Vase', amount: '$42.00', itemsCount: 3 },
  { customer: 'Liam Kelly', city: 'Dublin', product: 'Matte Black Watch', amount: '$95.00', itemsCount: 1 },
  { customer: 'Devin Parker', city: 'Austin', product: 'Heavyweight Cotton Tee', amount: '$38.00', itemsCount: 2 },
  { customer: 'Sarah Jenkins', city: 'Chicago', product: 'Washed Canvas Tote', amount: '$54.00', itemsCount: 2 },
  { customer: 'Michael Chen', city: 'San Francisco', product: 'Corduroy Overshirt', amount: '$86.00', itemsCount: 1 },
  { customer: 'Sophia Miller', city: 'Toronto', product: 'Ribbed Knit Beanie', amount: '$32.00', itemsCount: 2 },
  { customer: 'Ethan Ross', city: 'New York', product: 'Classic Wool Scarf', amount: '$48.00', itemsCount: 1 },
  { customer: 'Chloe Bennett', city: 'Sydney', product: 'Linen Relaxed Shirt', amount: '$68.00', itemsCount: 2 }
];

function ensureShopifyNotifItems(forceReset = false) {
  let targetCount = parseInt(state.shopify.notificationsCount, 10);
  if (isNaN(targetCount) || targetCount <= 0) {
    targetCount = 3;
    state.shopify.notificationsCount = 3;
  }
  const startNum = parseInt(state.shopify.startingOrderNum, 10) || 1042;

  if (forceReset || !Array.isArray(shopifyNotifItems) || shopifyNotifItems.length === 0) {
    shopifyNotifItems = [];
    for (let i = 0; i < targetCount; i++) {
      const t = defaultOrderTemplates[i % defaultOrderTemplates.length];
      // Consecutive serial numbers: newest on top, starting from startNum + targetCount - 1 down to startNum
      const serialNum = startNum + (targetCount - 1 - i);
      shopifyNotifItems.push({
        id: String(serialNum),
        customer: t.customer,
        product: t.product,
        amount: t.amount,
        itemsCount: t.itemsCount,
        time: i === 0 ? 'Just now' : `${(i + 1) * 2}m ago`
      });
    }
  } else if (shopifyNotifItems.length !== targetCount) {
    if (shopifyNotifItems.length < targetCount) {
      const diff = targetCount - shopifyNotifItems.length;
      const existingIds = shopifyNotifItems
        .map(it => parseInt(it.id, 10))
        .filter(n => !isNaN(n) && n > 0);
      let nextSerial = existingIds.length > 0 ? Math.max(...existingIds) + 1 : startNum;
      for (let i = 0; i < diff; i++) {
        const t = defaultOrderTemplates[(shopifyNotifItems.length + i) % defaultOrderTemplates.length];
        shopifyNotifItems.unshift({
          id: String(nextSerial++),
          customer: t.customer,
          product: t.product,
          amount: t.amount,
          itemsCount: t.itemsCount,
          time: 'Just now'
        });
      }
    } else {
      shopifyNotifItems = shopifyNotifItems.slice(0, targetCount);
    }
  }

  try {
    localStorage.setItem('larpkit_shopify_notif_items', JSON.stringify(shopifyNotifItems));
  } catch (e) { }
}

let shopifyAudioCtx = null;
let shopifySoundBuffer = null;
let isShopifySoundLoading = false;

function getShopifyAudioCtx() {
  try {
    if (!shopifyAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) shopifyAudioCtx = new AudioCtx();
    }
    if (shopifyAudioCtx && shopifyAudioCtx.state === 'suspended') {
      shopifyAudioCtx.resume().catch(() => { });
    }
  } catch (e) { }
  return shopifyAudioCtx;
}

async function loadShopifySaleSoundBuffer() {
  if (shopifySoundBuffer || isShopifySoundLoading) return shopifySoundBuffer;
  isShopifySoundLoading = true;
  try {
    const ctx = getShopifyAudioCtx();
    if (!ctx) return null;
    const res = await fetch(SHOPIFY_SALE_SOUND_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    shopifySoundBuffer = await ctx.decodeAudioData(arrayBuffer);
    return shopifySoundBuffer;
  } catch (err) {
    console.warn('Could not decode shopify_sale_sound.mp3 buffer', err);
    return null;
  } finally {
    isShopifySoundLoading = false;
  }
}

function playShopifySaleSound() {
  const ctx = getShopifyAudioCtx();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    // Play decoded audio buffer of user-provided shopify_sale_sound.mp3 (100% immune to setTimeout browser autoplay blocks)
    if (shopifySoundBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = shopifySoundBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch (e) { }
    } else {
      loadShopifySaleSoundBuffer();
    }
  }

  // HTMLAudioElement fallback playing exclusively the user's shopify_sale_sound.mp3
  try {
    const existingAudio = document.getElementById('shopify-sale-sound');
    if (existingAudio) {
      existingAudio.src = SHOPIFY_SALE_SOUND_URL;
      existingAudio.currentTime = 0;
      existingAudio.volume = 1.0;
      existingAudio.play().catch(() => { });
      return;
    }
    const audio = new Audio(SHOPIFY_SALE_SOUND_URL);
    audio.volume = 1.0;
    audio.play().catch(() => { });
  } catch (e) { }
}

function updateShopifyNotificationBadge() {
  const badge = document.getElementById('shopify-notif-badge');
  const mobileBadge = document.getElementById('shopify-mobile-notif-badge');
  const dropdownCount = document.getElementById('shopify-dropdown-count');
  const mobileDropdownCount = document.getElementById('shopify-mobile-dropdown-count');
  const count = parseInt(state.shopify.notificationsCount, 10) || 0;

  [badge, mobileBadge].forEach(b => {
    if (!b) return;
    if (count > 0) {
      b.textContent = count > 9 ? '9+' : count;
      b.style.display = 'flex';
      b.classList.remove('badge-pop');
      void b.offsetWidth;
      b.classList.add('badge-pop');
    } else {
      b.style.display = 'none';
      b.textContent = '0';
    }
  });

  [dropdownCount, mobileDropdownCount].forEach(dc => {
    if (dc) dc.textContent = count;
  });
}

function generateShopifyNotifItemHtml(item, idx, store) {
  const itemsQty = item.itemsCount || 2;
  return `
    <div class="shopify-notif-item" data-notif-idx="${idx}">
      <div class="shopify-order-toast-icon" style="width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;">
        <img src="${SHOPIFY_NOTIF_LOGO}" alt="Shopify" class="shopify-ios-notif-img">
      </div>
      <div class="shopify-notif-item-info">
        <div class="shopify-notif-item-header-row">
          <div class="shopify-notif-item-title">
            Order #<span class="shopify-notif-order-num" contenteditable="true" spellcheck="false" data-idx="${idx}" title="Click to edit order number">${item.id}</span>
          </div>
          <span class="shopify-notif-item-time">${item.time || 'now'}</span>
        </div>
        <div class="shopify-notif-item-desc">${item.amount || '$74.00'}, ${itemsQty} item${itemsQty > 1 ? 's' : ''} from ${store}</div>
      </div>
    </div>
  `;
}

function attachShopifyNotifOrderListeners(container) {
  if (!container) return;
  const editables = container.querySelectorAll('.shopify-notif-order-num');
  editables.forEach(el => {
    el.addEventListener('click', (e) => e.stopPropagation());
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
    const updateId = () => {
      const idx = parseInt(el.dataset.idx, 10);
      const newId = el.textContent.trim().replace(/^#+/, '');
      if (shopifyNotifItems[idx]) {
        shopifyNotifItems[idx].id = newId;
        document.querySelectorAll(`.shopify-notif-order-num[data-idx="${idx}"]`).forEach(sibling => {
          if (sibling !== el && sibling.textContent !== newId) {
            sibling.textContent = newId;
          }
        });
        try {
          localStorage.setItem('larpkit_shopify_notif_items', JSON.stringify(shopifyNotifItems));
        } catch (err) { }
      }
    };
    el.addEventListener('input', updateId);
    el.addEventListener('blur', updateId);
  });
}

function renderShopifyNotificationDropdown() {
  ensureShopifyNotifItems();

  const count = parseInt(state.shopify.notificationsCount, 10) || 0;
  const countEl = document.getElementById('shopify-dropdown-count');
  const mobileCountEl = document.getElementById('shopify-mobile-dropdown-count');
  if (countEl) countEl.textContent = count;
  if (mobileCountEl) mobileCountEl.textContent = count;

  const desktopList = document.getElementById('shopify-notif-dropdown-list');
  const mobileList = document.getElementById('shopify-mobile-notif-dropdown-list');

  const store = (state.shopify && state.shopify.storeName && state.shopify.storeName.trim())
    ? state.shopify.storeName.trim()
    : 'Online Store';

  let html = '';
  if (!shopifyNotifItems.length) {
    html = '<div class="shopify-notif-empty">No unread notifications</div>';
  } else {
    html = shopifyNotifItems.map((item, idx) => generateShopifyNotifItemHtml(item, idx, store)).join('');
  }

  [desktopList, mobileList].forEach(listEl => {
    if (!listEl) return;
    listEl.innerHTML = html;
    attachShopifyNotifOrderListeners(listEl);
  });
}

function spawnShopifyOrderToast(orderNum, customer, product, amount, itemsCount) {
  const stream = document.getElementById('shopify-toast-stream');
  if (!stream) return;

  const store = (state.shopify && state.shopify.storeName && state.shopify.storeName.trim())
    ? state.shopify.storeName.trim()
    : 'Online Store';

  const count = itemsCount || Math.floor(Math.random() * 3 + 1);

  const toast = document.createElement('div');
  toast.className = 'shopify-order-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="shopify-order-toast-icon">
      <img src="${SHOPIFY_NOTIF_LOGO}" alt="Shopify" class="shopify-ios-notif-img">
    </div>
    <div class="shopify-order-toast-content">
      <div class="shopify-order-toast-header-row">
        <span class="shopify-order-toast-title">Order #${orderNum}</span>
        <span class="shopify-order-toast-time">now</span>
      </div>
      <div class="shopify-order-toast-sub">${amount}, ${count} item${count > 1 ? 's' : ''} from ${store}</div>
    </div>
  `;

  // Dismiss on click
  toast.addEventListener('click', () => {
    toast.classList.add('dismissing');
    setTimeout(() => toast.remove(), 250);
  });

  stream.appendChild(toast);

  // Auto remove after 5.5s
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('dismissing');
      setTimeout(() => toast.remove(), 250);
    }
  }, 5500);
}

function triggerShopifyRealtimeNotifications(rawCount) {
  const inputNotifs = document.getElementById('shopify-input-notifs');
  const count = Math.min(Math.max(parseInt(inputNotifs ? inputNotifs.value : rawCount, 10) || 1, 1), 30);

  const inputOrderNum = document.getElementById('shopify-input-order-num');
  let userStartSerial = null;
  if (inputOrderNum && parseInt(inputOrderNum.value, 10) > 0) {
    userStartSerial = parseInt(inputOrderNum.value, 10);
    state.shopify.startingOrderNum = userStartSerial;
  }

  // Pre-unlock and ensure audio is active
  const ctx = getShopifyAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => { });
  }
  loadShopifySaleSoundBuffer();

  closeShopifySettingsModal();
  showToast(`Streaming ${count} live notification${count > 1 ? 's' : ''}...`);

  // Ensure the notifications dropdown is visible on screen so user sees all notifications arriving
  const desktopDropdown = document.getElementById('shopify-notif-dropdown');
  const mobDropdown = document.getElementById('shopify-mobile-notif-dropdown');
  if (window.innerWidth > 768 && desktopDropdown) {
    desktopDropdown.style.display = 'flex';
  } else if (mobDropdown) {
    mobDropdown.style.display = 'flex';
  }

  const customers = [
    { name: 'Emma Watson', city: 'London' },
    { name: 'Alex Turner', city: 'Sheffield' },
    { name: 'Marcus Thomas', city: 'Atlanta' },
    { name: 'Liam Kelly', city: 'Dublin' },
    { name: 'Devin Parker', city: 'Austin' },
    { name: 'Sarah Jenkins', city: 'Chicago' },
    { name: 'Michael Chen', city: 'San Francisco' },
    { name: 'Chloe Bennett', city: 'Sydney' },
    { name: 'Sophia Miller', city: 'Toronto' },
    { name: 'Ethan Ross', city: 'New York' }
  ];

  const items = [
    'Oversized Vintage Hoodie',
    'Leather Chelsea Boots',
    'Minimalist Ceramic Vase',
    'Matte Black Watch',
    'Cashmere Knit Sweater',
    'Heavyweight Cotton Tee',
    'Japanese Denim Jacket'
  ];

  let currentCount = parseInt(state.shopify.notificationsCount, 10) || 0;
  let sent = 0;

  // Determine starting serial number: strictly sequential
  const existingIds = shopifyNotifItems
    .map(it => parseInt(it.id, 10))
    .filter(n => !isNaN(n) && n > 0);
  const maxExisting = existingIds.length > 0 ? Math.max(...existingIds) : null;
  let nextSerial;
  if (userStartSerial !== null && (!maxExisting || userStartSerial > maxExisting)) {
    nextSerial = userStartSerial;
  } else if (maxExisting !== null) {
    nextSerial = maxExisting + 1;
  } else {
    nextSerial = parseInt(state.shopify.startingOrderNum, 10) || 1042;
  }

  function sendNext() {
    if (sent >= count) return;
    sent++;

    const cust = customers[(sent - 1) % customers.length];
    const product = items[(sent - 1) % items.length];
    const orderNum = nextSerial++;
    const amountNum = (Math.random() * 120 + 42).toFixed(2);
    const orderAmount = `$${amountNum}`;
    const itemsCount = Math.floor(Math.random() * 3 + 1);

    // 1. Play real-time cash register chime for EVERY notification
    playShopifySaleSound();

    // 2. Increment badge count and shake bell
    currentCount++;
    state.shopify.notificationsCount = currentCount;
    try {
      localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
    } catch (e) { }
    updateShopifyNotificationBadge();

    const bellBtn = document.getElementById('shopify-notifications-btn');
    const mobBellBtn = document.getElementById('shopify-mobile-bell-btn');
    [bellBtn, mobBellBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.remove('bell-ringing');
      void btn.offsetWidth;
      btn.classList.add('bell-ringing');
      setTimeout(() => btn.classList.remove('bell-ringing'), 600);
    });

    // 3. Add to dropdown history in strictly consecutive serial order
    shopifyNotifItems.unshift({
      id: String(orderNum),
      customer: cust.name,
      product: product,
      amount: orderAmount,
      itemsCount: itemsCount,
      time: 'Just now'
    });
    try {
      localStorage.setItem('larpkit_shopify_notif_items', JSON.stringify(shopifyNotifItems));
    } catch (e) { }
    renderShopifyNotificationDropdown();

    // 4. Spawn floating order toast matching iOS screenshot design
    spawnShopifyOrderToast(orderNum, cust.name, product, orderAmount, itemsCount);

    if (sent < count) {
      setTimeout(sendNext, 950);
    }
  }

  sendNext();
}

function handleShopifyNotifDone() {
  const inputNotifs = document.getElementById('shopify-input-notifs');
  const count = Math.max(0, parseInt(inputNotifs?.value, 10) || 0);
  state.shopify.notificationsCount = count;

  const inputOrderNum = document.getElementById('shopify-input-order-num');
  if (inputOrderNum && parseInt(inputOrderNum.value, 10) > 0) {
    state.shopify.startingOrderNum = parseInt(inputOrderNum.value, 10);
  }

  ensureShopifyNotifItems(true);

  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
    localStorage.setItem('larpkit_shopify_notif_items', JSON.stringify(shopifyNotifItems));
  } catch (e) { }

  updateShopifyNotificationBadge();
  renderShopifyNotificationDropdown();
  showToast(`Notification badge updated to ${count}`);
  closeShopifySettingsModal();
}

function handleShopifyLogoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    state.shopify.storeLogo = e.target.result;
    try {
      localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
    } catch (err) { }
    renderShopifyStoreProfile();
    showToast('Store logo updated!');
  };
  reader.readAsDataURL(file);
}

function handleShopifyLogoRemove() {
  state.shopify.storeLogo = '';
  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
  } catch (err) { }
  renderShopifyStoreProfile();
  showToast('Store logo removed');
}

function renderShopifyStoreProfile() {
  const avatarLetters = document.getElementById('shopify-avatar-letters');
  const avatarImg = document.getElementById('shopify-avatar-img');
  const modalLetters = document.getElementById('shopify-modal-avatar-letters');
  const modalImg = document.getElementById('shopify-modal-avatar-img');
  const removeBtn = document.getElementById('shopify-logo-remove-btn');
  const displayStoreName = document.getElementById('shopify-display-store-name');
  const mobileStoreName = document.getElementById('shopify-mobile-store-name');

  // Mobile Avatar elements
  const mobileAvatarLetters = document.getElementById('shopify-mobile-avatar-letters');
  const mobileAvatarImg = document.getElementById('shopify-mobile-avatar-img');
  const mobileDockLetters = document.getElementById('shopify-mobile-dock-letters');
  const mobileDockImg = document.getElementById('shopify-mobile-dock-img');

  // Compute initials from storeName or state.shopify.initials
  const storeName = state.shopify.storeName || 'Shop Name';
  if (displayStoreName) displayStoreName.textContent = storeName;
  if (mobileStoreName) mobileStoreName.textContent = storeName;

  let initials = state.shopify.initials;
  if (!initials) {
    const parts = storeName.trim().split(/\s+/);
    initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    initials = initials || 'LP';
  }

  if (avatarLetters) avatarLetters.textContent = initials;
  if (modalLetters) modalLetters.textContent = initials;
  if (mobileAvatarLetters) mobileAvatarLetters.textContent = initials;
  if (mobileDockLetters) mobileDockLetters.textContent = initials;

  if (state.shopify.storeLogo) {
    [avatarImg, modalImg, mobileAvatarImg, mobileDockImg].forEach(img => {
      if (img) {
        img.src = state.shopify.storeLogo;
        img.style.display = 'block';
      }
    });
    [avatarLetters, modalLetters, mobileAvatarLetters, mobileDockLetters].forEach(txt => {
      if (txt) txt.style.display = 'none';
    });
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    [avatarImg, modalImg, mobileAvatarImg, mobileDockImg].forEach(img => {
      if (img) {
        img.style.display = 'none';
        img.src = '';
      }
    });
    [avatarLetters, modalLetters, mobileAvatarLetters, mobileDockLetters].forEach(txt => {
      if (txt) txt.style.display = 'block';
    });
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function openShopifySettingsModal() {
  const modal = document.getElementById('shopify-settings-modal');
  if (!modal) return;

  const inputName = document.getElementById('shopify-input-store-name');
  const inputInitials = document.getElementById('shopify-input-initials');
  const inputSales = document.getElementById('shopify-input-sales');
  const inputGrowth = document.getElementById('shopify-input-sales-growth');
  const inputOrders = document.getElementById('shopify-input-orders');
  const inputSessions = document.getElementById('shopify-input-sessions');
  const inputConv = document.getElementById('shopify-input-conv');
  const inputLive = document.getElementById('shopify-input-live');
  const inputFulfill = document.getElementById('shopify-input-fulfill');
  const inputNotifs = document.getElementById('shopify-input-notifs');

  if (inputName) inputName.value = state.shopify.storeName;
  if (inputInitials) inputInitials.value = state.shopify.initials || 'LP';
  if (inputSales) inputSales.value = state.shopify.sales;
  if (inputGrowth) inputGrowth.value = state.shopify.salesGrowth;
  if (inputOrders) inputOrders.value = state.shopify.orders;
  if (inputSessions) inputSessions.value = state.shopify.sessions;
  if (inputConv) inputConv.value = state.shopify.conv;
  if (inputLive) inputLive.value = state.shopify.visitors;
  if (inputFulfill) inputFulfill.value = state.shopify.fulfillOrders;
  if (inputNotifs) inputNotifs.value = state.shopify.notificationsCount !== undefined ? state.shopify.notificationsCount : 3;
  const inputOrderNum = document.getElementById('shopify-input-order-num');
  if (inputOrderNum) inputOrderNum.value = state.shopify.startingOrderNum !== undefined ? state.shopify.startingOrderNum : 1042;

  renderShopifyStoreProfile();

  modal.classList.add('active');
}

function closeShopifySettingsModal() {
  const modal = document.getElementById('shopify-settings-modal');
  if (modal) modal.classList.remove('active');
}

// Dynamic auto-estimation across all Shopify metrics
let isAutoEstimatingFigures = false;

function setupShopifyAutoEstimation() {
  const inputSales = document.getElementById('shopify-input-sales');
  const inputGrowth = document.getElementById('shopify-input-sales-growth');
  const inputOrders = document.getElementById('shopify-input-orders');
  const inputSessions = document.getElementById('shopify-input-sessions');
  const inputConv = document.getElementById('shopify-input-conv');
  const inputLive = document.getElementById('shopify-input-live');
  const inputFulfill = document.getElementById('shopify-input-fulfill');

  if (!inputSales || !inputOrders) return;

  const parseNum = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (val) => {
    return '$' + Math.round(val).toLocaleString();
  };

  const formatNumber = (val) => {
    return Math.round(val).toLocaleString();
  };

  // 1. Sales changed
  inputSales.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      const sales = parseNum(inputSales.value);
      if (sales <= 0) {
        if (inputOrders) inputOrders.value = 0;
        if (inputSessions) inputSessions.value = 0;
        if (inputConv) inputConv.value = '0%';
        if (inputLive) inputLive.value = 0;
        if (inputFulfill) inputFulfill.value = 0;
      } else {
        const aov = 85; // Standard benchmark Average Order Value ($85)
        const orders = Math.max(1, Math.round(sales / aov));
        const convRate = 0.032; // Standard ~3.2% conversion rate
        const sessions = Math.max(orders, Math.round(orders / convRate));
        const live = Math.max(1, Math.round(sessions * 0.012));
        const fulfill = Math.max(1, Math.min(orders, Math.round(orders * 0.2)));

        if (inputOrders) inputOrders.value = orders;
        if (inputSessions) inputSessions.value = formatNumber(sessions);
        if (inputConv && (!inputConv.value || inputConv.value === '0%')) inputConv.value = '3.2%';
        if (inputLive) inputLive.value = live;
        if (inputFulfill) inputFulfill.value = fulfill;
        if (inputGrowth && (!inputGrowth.value || inputGrowth.value === '0%' || inputGrowth.value === '0')) {
          inputGrowth.value = '+14.2%';
        }
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // 2. Orders changed
  inputOrders.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      const orders = parseNum(inputOrders.value);
      if (orders <= 0) {
        if (inputSales) inputSales.value = '$0';
        if (inputSessions) inputSessions.value = 0;
        if (inputConv) inputConv.value = '0%';
        if (inputLive) inputLive.value = 0;
        if (inputFulfill) inputFulfill.value = 0;
      } else {
        const aov = 85;
        const sales = orders * aov;
        const convRate = 0.032;
        const sessions = Math.max(orders, Math.round(orders / convRate));
        const live = Math.max(1, Math.round(sessions * 0.012));
        const fulfill = Math.max(1, Math.min(orders, Math.round(orders * 0.2)));

        if (inputSales) inputSales.value = formatCurrency(sales);
        if (inputSessions) inputSessions.value = formatNumber(sessions);
        if (inputConv && (!inputConv.value || inputConv.value === '0%')) inputConv.value = '3.2%';
        if (inputLive) inputLive.value = live;
        if (inputFulfill) inputFulfill.value = fulfill;
        if (inputGrowth && (!inputGrowth.value || inputGrowth.value === '0%' || inputGrowth.value === '0')) {
          inputGrowth.value = '+14.2%';
        }
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // 3. Sessions changed
  inputSessions.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      const sessions = parseNum(inputSessions.value);
      if (sessions <= 0) {
        if (inputSales) inputSales.value = '$0';
        if (inputOrders) inputOrders.value = 0;
        if (inputConv) inputConv.value = '0%';
        if (inputLive) inputLive.value = 0;
        if (inputFulfill) inputFulfill.value = 0;
      } else {
        const convRate = 0.032;
        const orders = Math.max(1, Math.round(sessions * convRate));
        const aov = 85;
        const sales = orders * aov;
        const live = Math.max(1, Math.round(sessions * 0.012));
        const fulfill = Math.max(1, Math.min(orders, Math.round(orders * 0.2)));

        if (inputSales) inputSales.value = formatCurrency(sales);
        if (inputOrders) inputOrders.value = orders;
        if (inputConv && (!inputConv.value || inputConv.value === '0%')) inputConv.value = '3.2%';
        if (inputLive) inputLive.value = live;
        if (inputFulfill) inputFulfill.value = fulfill;
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // 4. Conversion Rate changed
  inputConv.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      let cr = parseNum(inputConv.value);
      if (cr > 0) {
        const rate = cr / 100;
        let currentSessions = parseNum(inputSessions.value);
        if (!currentSessions || currentSessions <= 0) currentSessions = 500;
        const orders = Math.max(1, Math.round(currentSessions * rate));
        const sales = orders * 85;
        const live = Math.max(1, Math.round(currentSessions * 0.012));
        const fulfill = Math.max(1, Math.min(orders, Math.round(orders * 0.2)));

        if (inputSales) inputSales.value = formatCurrency(sales);
        if (inputOrders) inputOrders.value = orders;
        if (inputSessions && parseNum(inputSessions.value) === 0) inputSessions.value = formatNumber(currentSessions);
        if (inputLive) inputLive.value = live;
        if (inputFulfill) inputFulfill.value = fulfill;
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // 5. Live Visitors changed
  inputLive.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      const live = parseNum(inputLive.value);
      if (live > 0) {
        const sessions = Math.max(50, Math.round(live / 0.012));
        const orders = Math.max(1, Math.round(sessions * 0.032));
        const sales = orders * 85;
        const fulfill = Math.max(1, Math.min(orders, Math.round(orders * 0.2)));

        if (inputSales) inputSales.value = formatCurrency(sales);
        if (inputOrders) inputOrders.value = orders;
        if (inputSessions) inputSessions.value = formatNumber(sessions);
        if (inputConv && (!inputConv.value || inputConv.value === '0%')) inputConv.value = '3.2%';
        if (inputFulfill) inputFulfill.value = fulfill;
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // 6. Orders to Fulfill changed
  inputFulfill.addEventListener('input', () => {
    if (isAutoEstimatingFigures) return;
    isAutoEstimatingFigures = true;
    try {
      const fulfill = parseNum(inputFulfill.value);
      const currentOrders = parseNum(inputOrders.value);
      if (fulfill > currentOrders) {
        const orders = Math.round(fulfill / 0.2);
        const sales = orders * 85;
        const sessions = Math.round(orders / 0.032);
        const live = Math.max(1, Math.round(sessions * 0.012));

        if (inputOrders) inputOrders.value = orders;
        if (inputSales) inputSales.value = formatCurrency(sales);
        if (inputSessions) inputSessions.value = formatNumber(sessions);
        if (inputLive) inputLive.value = live;
      }
    } finally {
      isAutoEstimatingFigures = false;
    }
  });

  // Clean blur formatters
  inputSales.addEventListener('blur', () => {
    const s = parseNum(inputSales.value);
    if (s > 0 && !inputSales.value.includes('$')) {
      inputSales.value = formatCurrency(s);
    }
  });

  inputConv.addEventListener('blur', () => {
    const c = parseNum(inputConv.value);
    if (c > 0 && !inputConv.value.includes('%')) {
      inputConv.value = c.toFixed(1) + '%';
    }
  });

  inputGrowth.addEventListener('blur', () => {
    const g = parseNum(inputGrowth.value);
    if (g > 0 && !inputGrowth.value.includes('%')) {
      inputGrowth.value = '+' + g.toFixed(1) + '%';
    }
  });
}

function saveShopifySettings() {
  const inputName = document.getElementById('shopify-input-store-name');
  const inputInitials = document.getElementById('shopify-input-initials');
  const inputSales = document.getElementById('shopify-input-sales');
  const inputGrowth = document.getElementById('shopify-input-sales-growth');
  const inputOrders = document.getElementById('shopify-input-orders');
  const inputSessions = document.getElementById('shopify-input-sessions');
  const inputConv = document.getElementById('shopify-input-conv');
  const inputLive = document.getElementById('shopify-input-live');
  const inputFulfill = document.getElementById('shopify-input-fulfill');

  if (inputName && inputName.value.trim()) state.shopify.storeName = inputName.value.trim();
  if (inputInitials && inputInitials.value.trim()) state.shopify.initials = inputInitials.value.trim().toUpperCase();
  if (inputSales) {
    let s = inputSales.value.trim();
    if (s && !s.startsWith('$')) s = '$' + s;
    state.shopify.sales = s || '$800';
  }
  if (inputGrowth) {
    let g = inputGrowth.value.trim() || '0%';
    if (g && !g.endsWith('%')) g = g + '%';
    state.shopify.salesGrowth = g;
    state.shopify.ordersGrowth = g;
    state.shopify.sessionsGrowth = g;
    state.shopify.convGrowth = g;
  }
  if (inputOrders) state.shopify.orders = inputOrders.value.trim() || '20';
  if (inputSessions) state.shopify.sessions = inputSessions.value.trim() || '0';
  if (inputConv) {
    let c = inputConv.value.trim() || '0%';
    if (c && !c.endsWith('%')) c = c + '%';
    state.shopify.conv = c;
  }
  if (inputLive) state.shopify.visitors = inputLive.value.trim() || '0';
  if (inputFulfill) state.shopify.fulfillOrders = parseInt(inputFulfill.value, 10) || 0;
  const inputNotifs = document.getElementById('shopify-input-notifs');
  if (inputNotifs) {
    state.shopify.notificationsCount = Math.max(0, parseInt(inputNotifs.value, 10) || 0);
  }
  const inputOrderNum = document.getElementById('shopify-input-order-num');
  if (inputOrderNum && parseInt(inputOrderNum.value, 10) > 0) {
    state.shopify.startingOrderNum = parseInt(inputOrderNum.value, 10);
  }
  ensureShopifyNotifItems();

  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
    localStorage.setItem('larpkit_shopify_notif_items', JSON.stringify(shopifyNotifItems));
  } catch (e) { }

  renderShopifyDesktop();
  renderShopifyNotificationDropdown();
  closeShopifySettingsModal();
  showToast('Shopify figures updated!');
}

function resetShopifySettings() {
  state.shopify = {
    storeName: 'Shop Name',
    initials: 'LP',
    sales: '$800',
    salesGrowth: '+0%',
    orders: '20',
    ordersGrowth: '+0%',
    sessions: '0',
    sessionsGrowth: '0%',
    conv: '7%',
    convGrowth: '+0%',
    visitors: '0',
    fulfillOrders: 0,
    notificationsCount: 3,
    startingOrderNum: 1042,
    storeLogo: ''
  };
  ensureShopifyNotifItems(true);
  try {
    localStorage.removeItem('larpkit_shopify');
    localStorage.removeItem('larpkit_shopify_notif_items');
  } catch (e) { }
  renderShopifyDesktop();
  renderShopifyNotificationDropdown();
  closeShopifySettingsModal();
  showToast('Shopify figures reset to defaults');
}

// --------------------------------------------------------------------------
// EVENT LISTENERS BINDING
// --------------------------------------------------------------------------
function setupShopifyListeners() {
  const shopifyTriggers = [
    'shopify-profile-trigger',
    'shopify-settings-trigger-btn',
    'shopify-kpi-sales-click',
    'shopify-kpi-orders-click',
    'shopify-kpi-sessions-click',
    'shopify-kpi-conv-click',
    'shopify-kpi-live-click',
    'shopify-fulfill-trigger',
    // Mobile Triggers
    'shopify-mobile-avatar-btn',
    'shopify-mobile-brand-trigger',
    'shopify-mobile-sales-click',
    'shopify-mobile-orders-click',
    'shopify-mobile-conv-click',
    'shopify-mobile-live-click',
    'shopify-mobile-chart-trigger',
    'shopify-mobile-fulfill-trigger',
    'shopify-mobile-editions-trigger',
    'shopify-mobile-pill-today',
    'shopify-mobile-pill-report',
    'shopify-mobile-dock-profile-btn'
  ];
  shopifyTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        openShopifySettingsModal();
      });
    }
  });
}

// --------------------------------------------------------------------------
// EVENT LISTENERS INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Buttons on Cards
  document.querySelectorAll('[data-navigate]').forEach(elem => {
    elem.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = elem.dataset.navigate;
      if (['cashapp', 'phantom', 'shopify'].includes(target) && !state.isLoggedIn) {
        state.pendingDestination = target;
        openAuthModal('login', true);
        return;
      }
      navigateTo(target);
    });
  });

  // Context Menu Buttons
  const menuBackBtn = document.getElementById('menu-item-back');
  if (menuBackBtn) {
    menuBackBtn.addEventListener('click', () => {
      if (state.currentView !== 'landing') {
        navigateTo('landing');
      } else {
        window.history.back();
      }
    });
  }

  const menuForwardBtn = document.getElementById('menu-item-forward');
  if (menuForwardBtn) {
    menuForwardBtn.addEventListener('click', () => {
      window.history.forward();
    });
  }

  const menuReloadBtn = document.getElementById('menu-item-reload');
  if (menuReloadBtn) {
    menuReloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Cash App Keypad Clicks
  document.querySelectorAll('[data-cashkey]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleCashAppKeyPress(btn.dataset.cashkey);
    });
  });

  // Cash App Physical Keyboard Support (Numbers, Decimal, Backspace)
  window.addEventListener('keydown', (e) => {
    if (state.currentView !== 'cashapp') return;
    const keypadTab = document.getElementById('cashapp-tab-keypad');
    if (!keypadTab || keypadTab.style.display === 'none') return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleCashAppKeyPress(e.key);
      const btn = document.querySelector(`[data-cashkey="${e.key}"]`);
      if (btn) {
        btn.classList.add('cashapp-key-pressed');
        setTimeout(() => btn.classList.remove('cashapp-key-pressed'), 200);
      }
    } else if (e.key === '.' || e.key === ',') {
      e.preventDefault();
      handleCashAppKeyPress('.');
      const btn = document.querySelector('[data-cashkey="."]');
      if (btn) {
        btn.classList.add('cashapp-key-pressed');
        setTimeout(() => btn.classList.remove('cashapp-key-pressed'), 200);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleCashAppKeyPress('backspace');
      const btn = document.querySelector('[data-cashkey="backspace"]');
      if (btn) {
        btn.classList.add('cashapp-key-pressed');
        setTimeout(() => btn.classList.remove('cashapp-key-pressed'), 200);
      }
    }
  });

  // Cash App Pay / Request / Pool (Request and Pool disabled per requirement)
  const payBtn = document.getElementById('cashapp-pay-btn');
  if (payBtn) payBtn.addEventListener('click', () => triggerCashAppAction('pay'));

  const reqBtn = document.getElementById('cashapp-req-btn');
  if (reqBtn) {
    reqBtn.setAttribute('disabled', 'true');
    reqBtn.setAttribute('tabindex', '-1');
    reqBtn.style.pointerEvents = 'none';
    reqBtn.style.cursor = 'default';
  }

  const poolBtn = document.getElementById('cashapp-pool-btn');
  if (poolBtn) {
    poolBtn.setAttribute('disabled', 'true');
    poolBtn.setAttribute('tabindex', '-1');
    poolBtn.style.pointerEvents = 'none';
    poolBtn.style.cursor = 'default';
  }

  // Phantom FAB (+) Button -> Opens Speed Dial
  const phantomFabBtn = document.getElementById('phantom-fab-btn');
  if (phantomFabBtn) {
    phantomFabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPhantomSpeedDial();
    });
  }

  // Phantom Speed Dial Close Button & Backdrop
  const phantomDialCloseBtn = document.getElementById('phantom-dial-close-btn');
  if (phantomDialCloseBtn) {
    phantomDialCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhantomSpeedDial();
    });
  }

  const phantomDialBackdrop = document.getElementById('phantom-dial-backdrop');
  if (phantomDialBackdrop) {
    phantomDialBackdrop.addEventListener('click', () => {
      closePhantomSpeedDial();
    });
  }

  // Speed Dial: Add Cash Button (The only functional action) -> Opens Settings Modal
  const phantomDialAddCash = document.getElementById('phantom-dial-add-cash');
  if (phantomDialAddCash) {
    phantomDialAddCash.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhantomSpeedDial();
      openPhantomSettingsModal();
    });
  }

  // Wallet Name Dropdown Trigger & Hero Balance click -> Also allow opening Settings Modal
  const phantomWalletTrigger = document.getElementById('phantom-wallet-name-trigger');
  if (phantomWalletTrigger) {
    phantomWalletTrigger.addEventListener('click', () => {
      openPhantomSettingsModal();
    });
  }

  const phantomHeroBal = document.getElementById('phantom-portfolio-val');
  if (phantomHeroBal) {
    phantomHeroBal.addEventListener('click', () => {
      openPhantomSettingsModal();
    });
  }

  // Settings Modal Close Buttons & Backdrop
  const phantomSettingsCloseBtn = document.getElementById('phantom-settings-close-btn');
  if (phantomSettingsCloseBtn) {
    phantomSettingsCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhantomSettingsModal();
    });
  }

  const phantomSettingsBackdrop = document.getElementById('phantom-settings-backdrop');
  if (phantomSettingsBackdrop) {
    phantomSettingsBackdrop.addEventListener('click', () => {
      closePhantomSettingsModal();
    });
  }

  // Settings Reset Button
  const phantomSettingsResetBtn = document.getElementById('phantom-settings-reset-btn');
  if (phantomSettingsResetBtn) {
    phantomSettingsResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetPhantomSettingsInputs();
    });
  }

  // Settings Done Button
  const phantomSettingsDoneBtn = document.getElementById('phantom-settings-done-btn');
  if (phantomSettingsDoneBtn) {
    phantomSettingsDoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      savePhantomSettings();
    });
  }

  // Cash Card click -> Opens Settings Modal
  const phantomCashCard = document.querySelector('.phantom-cash-card');
  if (phantomCashCard) {
    phantomCashCard.addEventListener('click', () => {
      openPhantomSettingsModal();
    });
  }

  // Phantom Sidebar Drawer Listeners (Opens on Lock Icon Click)
  const phantomLockBtn = document.getElementById('phantom-top-lock-btn');
  if (phantomLockBtn) {
    phantomLockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePhantomSidebar();
    });
  }

  const phantomSidebarLockBtn = document.getElementById('phantom-sidebar-lock-btn');
  if (phantomSidebarLockBtn) {
    phantomSidebarLockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePhantomSidebar(false);
    });
  }

  const phantomSidebarBackdrop = document.getElementById('phantom-sidebar-backdrop');
  if (phantomSidebarBackdrop) {
    phantomSidebarBackdrop.addEventListener('click', () => {
      togglePhantomSidebar(false);
    });
  }

  const phantomSidebarCopyBtn = document.getElementById('phantom-sidebar-copy-btn');
  if (phantomSidebarCopyBtn) {
    phantomSidebarCopyBtn.addEventListener('click', () => {
      const mockAddr = '7xKX' + Math.random().toString(36).substring(2, 8).toUpperCase() + '4p9Q';
      try {
        navigator.clipboard.writeText(mockAddr);
      } catch (err) { }
      showToast(`Wallet address (${mockAddr.slice(0, 4)}...${mockAddr.slice(-4)}) copied!`);
    });
  }

  const phantomSidebarWalletTrigger = document.getElementById('phantom-sidebar-wallet-trigger');
  if (phantomSidebarWalletTrigger) {
    phantomSidebarWalletTrigger.addEventListener('click', () => {
      togglePhantomSidebar(false);
      openPhantomSettingsModal();
    });
  }

  const phantomNavProfile = document.getElementById('phantom-sidebar-nav-profile');
  if (phantomNavProfile) {
    phantomNavProfile.addEventListener('click', () => {
      togglePhantomSidebar(false);
      openPhantomSettingsModal();
    });
  }

  const phantomNavChats = document.getElementById('phantom-sidebar-nav-chats');
  if (phantomNavChats) {
    phantomNavChats.addEventListener('click', () => {
      togglePhantomSidebar(false);
      showToast('Chats: No unread messages');
    });
  }

  const phantomNavHistory = document.getElementById('phantom-sidebar-nav-history');
  if (phantomNavHistory) {
    phantomNavHistory.addEventListener('click', () => {
      togglePhantomSidebar(false);
      showToast('Activity history is up to date');
    });
  }

  // Render initial Phantom UI
  renderPhantomUI();

  // Shopify Simulator Event Listeners (Desktop & Mobile)
  setupShopifyListeners();

  const shopifyModalClose = document.getElementById('shopify-modal-close-btn');
  if (shopifyModalClose) shopifyModalClose.addEventListener('click', closeShopifySettingsModal);

  const shopifyModalBackdrop = document.getElementById('shopify-modal-backdrop');
  if (shopifyModalBackdrop) shopifyModalBackdrop.addEventListener('click', closeShopifySettingsModal);

  const shopifyModalDone = document.getElementById('shopify-modal-done-btn');
  if (shopifyModalDone) shopifyModalDone.addEventListener('click', saveShopifySettings);

  const shopifyModalReset = document.getElementById('shopify-modal-reset-btn');
  if (shopifyModalReset) shopifyModalReset.addEventListener('click', resetShopifySettings);

  // Shopify Notification & Logo Controls
  const btnNotifDone = document.getElementById('shopify-btn-notif-done');
  if (btnNotifDone) btnNotifDone.addEventListener('click', handleShopifyNotifDone);

  const btnGetNotifs = document.getElementById('shopify-btn-get-notifs');
  if (btnGetNotifs) {
    btnGetNotifs.addEventListener('click', async () => {
      const ctx = getShopifyAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { }
      }
      loadShopifySaleSoundBuffer();
      const input = document.getElementById('shopify-input-notifs');
      const val = input ? input.value : 3;
      triggerShopifyRealtimeNotifications(val);
    });
  }

  const notifBellBtn = document.getElementById('shopify-notifications-btn');
  const notifDropdown = document.getElementById('shopify-notif-dropdown');
  if (notifBellBtn && notifDropdown) {
    notifBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifDropdown.style.display === 'flex';
      notifDropdown.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) renderShopifyNotificationDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.shopify-notif-wrap')) {
        notifDropdown.style.display = 'none';
      }
    });
  }

  const mobNotifBellBtn = document.getElementById('shopify-mobile-bell-btn');
  const mobNotifDropdown = document.getElementById('shopify-mobile-notif-dropdown');
  if (mobNotifBellBtn && mobNotifDropdown) {
    mobNotifBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = mobNotifDropdown.style.display === 'flex';
      mobNotifDropdown.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) renderShopifyNotificationDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.shopify-mobile-notif-wrap')) {
        mobNotifDropdown.style.display = 'none';
      }
    });
  }

  const logoUploadInput = document.getElementById('shopify-logo-upload-input');
  if (logoUploadInput) {
    logoUploadInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleShopifyLogoUpload(e.target.files[0]);
      }
    });
  }

  const logoRemoveBtn = document.getElementById('shopify-logo-remove-btn');
  if (logoRemoveBtn) logoRemoveBtn.addEventListener('click', handleShopifyLogoRemove);

  // Initialize dynamic auto-estimation across all editable metrics
  setupShopifyAutoEstimation();

  // Fulfill orders quick button
  const fulfillBtn = document.getElementById('shopify-fulfill-trigger');
  if (fulfillBtn) {
    fulfillBtn.addEventListener('click', () => {
      if (state.shopify.fulfillOrders > 0) {
        state.shopify.fulfillOrders = Math.max(0, state.shopify.fulfillOrders - 1);
        const countEl = document.getElementById('shopify-display-fulfill-count');
        if (countEl) countEl.textContent = state.shopify.fulfillOrders;
        showToast('1 order marked as fulfilled!');
      } else {
        showToast('All orders fulfilled!');
      }
    });
  }

  // Shopify Magic AI Assistant Bar
  const magicInput = document.getElementById('shopify-magic-input');
  const magicSubmit = document.getElementById('shopify-magic-submit-btn');
  const handleMagicQuery = () => {
    if (magicInput && magicInput.value.trim()) {
      const q = magicInput.value.trim();
      magicInput.value = '';
      showToast(`Sidekick: Processing "${q}"...`);
    }
  };
  if (magicSubmit) magicSubmit.addEventListener('click', handleMagicQuery);
  if (magicInput) {
    magicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleMagicQuery();
    });
  }

  // Initial render of Shopify Desktop UI & Notifications
  ensureShopifyNotifItems();
  renderShopifyDesktop();
  renderShopifyNotificationDropdown();
  loadShopifySaleSoundBuffer();

  // Unlock audio on first user gesture anywhere
  window.addEventListener('pointerdown', () => {
    getShopifyAudioCtx();
    loadShopifySaleSoundBuffer();
  }, { once: true });

  // Cash App Pay Sheet Listeners
  const paySheetCloseBtn = document.getElementById('cashapp-pay-sheet-close');
  if (paySheetCloseBtn) {
    paySheetCloseBtn.addEventListener('click', closeCashAppPaySheet);
  }

  const paySheetBackBtn = document.getElementById('cashapp-pay-sheet-back');
  if (paySheetBackBtn) {
    paySheetBackBtn.addEventListener('click', () => {
      const searchView = document.getElementById('cashapp-view-search');
      const confirmView = document.getElementById('cashapp-view-confirm');
      const backBtn = document.getElementById('cashapp-pay-sheet-back');
      const closeBtn = document.getElementById('cashapp-pay-sheet-close');
      if (searchView) searchView.style.display = 'block';
      if (confirmView) confirmView.style.display = 'none';
      if (backBtn) backBtn.style.display = 'none';
      if (closeBtn) closeBtn.style.display = 'flex';
    });
  }

  const paySheetOverlay = document.getElementById('cashapp-pay-sheet');
  if (paySheetOverlay) {
    paySheetOverlay.addEventListener('click', (e) => {
      if (e.target === paySheetOverlay) {
        closeCashAppPaySheet();
      }
    });
  }

  const recipientInput = document.getElementById('cashapp-recipient-input');
  if (recipientInput) {
    recipientInput.addEventListener('input', (e) => {
      handleCashAppSearchInput(e.target.value);
    });
  }

  const noteInput = document.getElementById('cashapp-note-input');
  const reviewBtn = document.getElementById('cashapp-review-btn');
  if (noteInput && reviewBtn) {
    noteInput.addEventListener('input', (e) => {
      const hasText = e.target.value.trim().length > 0;
      reviewBtn.disabled = !hasText;
      reviewBtn.classList.toggle('active', hasText);
    });

    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCashAppNoteSubmit();
      }
    });

    reviewBtn.addEventListener('click', () => {
      handleCashAppNoteSubmit();
    });
  }

  const finalPayBtn = document.getElementById('cashapp-final-pay-btn');
  if (finalPayBtn) {
    finalPayBtn.addEventListener('click', () => {
      executeCashAppPayment();
    });
  }

  const successCloseBtn = document.getElementById('cashapp-success-close-btn');
  if (successCloseBtn) {
    successCloseBtn.addEventListener('click', closeCashAppSuccessScreen);
  }

  const successDoneBtn = document.getElementById('cashapp-success-done-btn');
  if (successDoneBtn) {
    successDoneBtn.addEventListener('click', closeCashAppSuccessScreen);
  }

  const syncContactsBtn = document.getElementById('cashapp-sync-contacts-btn');
  if (syncContactsBtn) {
    syncContactsBtn.addEventListener('click', () => {
      const input = document.getElementById('cashapp-recipient-input');
      if (input) {
        input.value = 'igbibb';
        handleCashAppSearchInput('igbibb');
        input.focus();
      }
    });
  }

  const qrBtn = document.getElementById('cashapp-qr-btn');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      showToast('QR scanner active');
    });
  }

  // Cash App Bottom Nav Tab Buttons (Home, Keypad, History)
  const cashAppTabBtns = document.querySelectorAll('.cashapp-tab-nav-btn');
  if (cashAppTabBtns.length > 0) {
    cashAppTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchCashAppTab(btn.dataset.cashappTab);
      });
    });
    switchCashAppTab('keypad');
  }

  // Cash App Editable Username in Home View
  const usernameEl = document.getElementById('cashapp-peek-username');
  if (usernameEl) {
    try {
      const savedUser = localStorage.getItem('cashapp_username');
      if (savedUser) {
        usernameEl.textContent = savedUser;
      }
    } catch (e) { }

    usernameEl.addEventListener('blur', () => {
      let val = usernameEl.textContent.trim();
      if (!val) val = '$username';
      if (!val.startsWith('$')) val = '$' + val;
      usernameEl.textContent = val;
      try {
        localStorage.setItem('cashapp_username', val);
      } catch (e) { }
    });

    usernameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        usernameEl.blur();
      }
    });
  }

  // Restore Cash App Balance & Setup Editing
  try {
    const savedBal = localStorage.getItem('cashapp_balance');
    if (savedBal !== null && !isNaN(parseFloat(savedBal))) {
      state.cashAppBalance = parseFloat(savedBal);
      updateCashAppHomeBalance();
    }
  } catch (e) { }

  const balEl = document.getElementById('cashapp-main-cash-balance');
  if (balEl) {
    balEl.addEventListener('blur', () => {
      const raw = balEl.textContent.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(raw);
      state.cashAppBalance = isNaN(parsed) ? 0 : parsed;
      updateCashAppHomeBalance();
    });
    balEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        balEl.blur();
      }
    });
  }

  // Cash App Add Money Listeners (Screenshot 5)
  const homeAddMoneyBtn = document.getElementById('cashapp-home-add-money-btn');
  if (homeAddMoneyBtn) {
    homeAddMoneyBtn.addEventListener('click', openCashAppAddMoneySheet);
  }

  const addMoneySheet = document.getElementById('cashapp-add-money-sheet');
  if (addMoneySheet) {
    addMoneySheet.addEventListener('click', (e) => {
      if (e.target === addMoneySheet) {
        closeCashAppAddMoneySheet();
      }
    });
  }

  document.querySelectorAll('.cashapp-preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cashapp-preset-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.dataset.addAmount;
      if (val === 'custom') {
        const custom = prompt('Enter amount to add:', '50');
        const num = parseFloat(custom);
        if (num && num > 0) {
          selectedAddMoneyAmount = num;
        }
      } else {
        selectedAddMoneyAmount = parseInt(val, 10) || 25;
      }
    });
  });

  const submitAddMoneyBtn = document.getElementById('cashapp-submit-add-money-btn');
  if (submitAddMoneyBtn) {
    submitAddMoneyBtn.addEventListener('click', handleAddMoneySubmit);
  }

  // --------------------------------------------------------------------------
  // MODERN AUTH MODAL & SIMULATOR GATING CONTROLLER
  // --------------------------------------------------------------------------
  const authModal = document.getElementById('auth-modal');
  const authCard = document.getElementById('auth-modal-card');
  const stepCredentials = document.getElementById('auth-step-credentials');
  const stepCard = document.getElementById('auth-step-card');
  const emailInput = document.getElementById('auth-email-input');
  const passwordInput = document.getElementById('auth-password-input');
  const pwToggle = document.getElementById('auth-pw-toggle');
  const switchBtn = document.getElementById('auth-switch-btn');
  const backToStep1 = document.getElementById('auth-back-to-step1');
  const formCredentials = document.getElementById('auth-form-credentials');
  const formCard = document.getElementById('auth-form-card');
  const cardNumberInput = document.getElementById('card-number-input');
  const cardExpInput = document.getElementById('card-exp-input');
  const authModalClose = document.getElementById('auth-modal-close-btn');

  // Update nav state initially
  updateUserNavUI();

  // Real-time password validation on typing
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (currentAuthMode === 'signup') {
        checkPasswordRules(passwordInput.value);
      }
      document.getElementById('wrap-auth-password')?.classList.remove('has-error');
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      document.getElementById('wrap-auth-email')?.classList.remove('has-error');
    });
  }

  // Password Visibility Toggle
  if (pwToggle && passwordInput) {
    pwToggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      pwToggle.style.color = isPassword ? '#ffffff' : '#71717a';
    });
  }

  // Close modal handlers
  if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAuthModal();
  });

  // Switch between Sign up and Log in modes inside modal
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      const authGateNotice = document.getElementById('auth-gate-notice');
      const targetMode = currentAuthMode === 'signup' ? 'login' : 'signup';
      openAuthModal(targetMode, authGateNotice && authGateNotice.style.display === 'flex');
    });
  }

  // Form Step 1 Submit (Credentials)
  if (formCredentials) {
    formCredentials.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      // Basic email check
      if (!email || !email.includes('@')) {
        document.getElementById('wrap-auth-email')?.classList.add('has-error');
        showToast('Please enter a valid email address.');
        emailInput?.focus();
        return;
      }

      if (currentAuthMode === 'login') {
        // Log in mode: requires email & password
        if (!password) {
          document.getElementById('wrap-auth-password')?.classList.add('has-error');
          showToast('Please enter your password.');
          passwordInput?.focus();
          return;
        }

        completeAuthentication(email, false);
      } else {
        // Sign up mode: must follow password rules
        const rulesPassed = checkPasswordRules(password);
        if (!rulesPassed) {
          document.getElementById('wrap-auth-password')?.classList.add('has-error');
          showToast('Password must include 8+ chars, uppercase, lowercase, and a number.');
          passwordInput?.focus();
          return;
        }

        // Transition to Step 2: Wider card asking for card details
        if (authCard) authCard.classList.add('wider');
        if (stepCredentials) stepCredentials.style.display = 'none';
        if (stepCard) stepCard.style.display = 'block';

        const nameInput = document.getElementById('card-name-input');
        if (nameInput) {
          nameInput.value = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    });
  }

  // Back from Step 2 to Step 1
  if (backToStep1) {
    backToStep1.addEventListener('click', () => {
      if (authCard) authCard.classList.remove('wider');
      if (stepCard) stepCard.style.display = 'none';
      if (stepCredentials) stepCredentials.style.display = 'block';
    });
  }

  // Card formatting helpers
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').slice(0, 16);
      val = val.replace(/(.{4})/g, '$1 ').trim();
      e.target.value = val;

      const badge = document.getElementById('card-brand-badge');
      if (badge) {
        if (val.startsWith('4')) badge.textContent = 'VISA';
        else if (val.startsWith('5')) badge.textContent = 'MC';
        else if (val.startsWith('3')) badge.textContent = 'AMEX';
        else badge.textContent = 'CARD';
      }
    });
  }

  if (cardExpInput) {
    cardExpInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
      if (val.length >= 2) {
        val = val.slice(0, 2) + ' / ' + val.slice(2);
      }
      e.target.value = val;
    });
  }

  // Form Step 2 Submit (Card Details)
  if (formCard) {
    formCard.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : 'creator@larpkit.io';
      completeAuthentication(email, true);
    });
  }

  // Forgot password click
  const forgotLink = document.getElementById('auth-forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', () => {
      showToast('Password reset link sent to your email.');
    });
  }

  // --------------------------------------------------------------------------
  // DIRECT USER ACTION BUTTONS (HERO, NAV, CARDS, CTAs)
  // --------------------------------------------------------------------------
  // Hero CTA buttons
  const heroBtnSignup = document.getElementById('hero-btn-signup');
  if (heroBtnSignup) {
    heroBtnSignup.addEventListener('click', () => openAuthModal('signup', false));
  }

  const heroBtnLogin = document.getElementById('hero-btn-login');
  if (heroBtnLogin) {
    heroBtnLogin.addEventListener('click', () => openAuthModal('login', false));
  }

  // Nav user profile trigger & dropdown toggle
  const navUserBtn = document.getElementById('nav-user-btn');
  const navUserWrap = document.getElementById('nav-user-wrap');
  if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.isLoggedIn) {
        openAuthModal('signup', false);
      } else {
        if (navUserWrap) navUserWrap.classList.toggle('open');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (navUserWrap && !navUserWrap.contains(e.target)) {
      navUserWrap.classList.remove('open');
    }
  });

  // Nav user dropdown buttons
  const navBtnSignup = document.getElementById('nav-btn-signup');
  if (navBtnSignup) navBtnSignup.addEventListener('click', () => openAuthModal('signup', false));

  const navBtnLogin = document.getElementById('nav-btn-login');
  if (navBtnLogin) navBtnLogin.addEventListener('click', () => openAuthModal('login', false));

  // Log Out button
  const navBtnLogout = document.getElementById('nav-btn-logout');
  if (navBtnLogout) {
    navBtnLogout.addEventListener('click', () => {
      state.isLoggedIn = false;
      state.userEmail = '';
      try {
        localStorage.removeItem('larpkit_user');
      } catch (e) { }
      updateUserNavUI();
      showToast('Logged out successfully.');
      if (['phantom', 'shopify', 'cashapp'].includes(state.currentView)) {
        navigateTo('landing');
      }
    });
  }

  // Simulator preview card clicks (launch or prompt auth)
  document.querySelectorAll('.sim-preview-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.navigate || (card.querySelector('[data-navigate]') && card.querySelector('[data-navigate]').dataset.navigate);
      if (target) {
        if (['cashapp', 'phantom', 'shopify'].includes(target) && !state.isLoggedIn) {
          state.pendingDestination = target;
          openAuthModal('login', true);
        } else {
          navigateTo(target);
        }
      }
    });
  });

  // Section CTA buttons
  const ctaBtnSignup = document.getElementById('cta-btn-signup');
  if (ctaBtnSignup) ctaBtnSignup.addEventListener('click', () => openAuthModal('signup', false));

  // Pricing checkout button
  const pricingCheckoutBtn = document.getElementById('pricing-checkout-btn');
  if (pricingCheckoutBtn) {
    pricingCheckoutBtn.addEventListener('click', () => {
      openAuthModal('signup', false);
    });
  }

  // FAQ Accordion
  document.querySelectorAll('.faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // SCROLL-TRIGGERED UNBLUR & SCROLL-UP ANIMATION OBSERVER
  // --------------------------------------------------------------------------
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    if (!revealElements.length) return;

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => observer.observe(el));
  }

  initScrollReveal();

  // Floating Back to Top Button & Scroll-Up Behavior
  const floatingScrollTop = document.getElementById('floating-scroll-top');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (floatingScrollTop) {
      if (scrollY > 320) {
        floatingScrollTop.classList.add('visible');
      } else {
        floatingScrollTop.classList.remove('visible');
      }
    }
  }, { passive: true });

  if (floatingScrollTop) {
    floatingScrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --------------------------------------------------------------------------
  // HERO HEADING SEQUENTIAL LETTER UNBLUR REVEAL
  // --------------------------------------------------------------------------
  function initHeroLetterUnblur() {
    const titleEl = document.querySelector('.hero-title');
    const subtitleEl = document.querySelector('.hero-subtitle');
    if (!titleEl) return;

    const fullText = "You don't need to pinterest your figures like these cars anymore.";

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      titleEl.textContent = fullText;
      if (subtitleEl) subtitleEl.classList.add('is-visible');
      return;
    }

    titleEl.innerHTML = '';
    const words = fullText.split(' ');
    let charCount = 0;
    const charDelayMs = 25;
    const totalLetters = fullText.replace(/\s+/g, '').length;
    let animatedLetterCount = 0;

    words.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'hero-word-wrap';

      for (let i = 0; i < word.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'hero-char-unblur';
        charSpan.textContent = word[i];
        charSpan.style.animationDelay = `${charCount * charDelayMs}ms`;
        wordSpan.appendChild(charSpan);
        charCount++;
        animatedLetterCount++;

        // Once the final letter completes its unblur animation, reveal description
        if (animatedLetterCount === totalLetters) {
          charSpan.addEventListener('animationend', () => {
            if (subtitleEl) subtitleEl.classList.add('is-visible');
          }, { once: true });
        }
      }

      titleEl.appendChild(wordSpan);

      if (wIdx < words.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'hero-char-space';
        spaceSpan.innerHTML = '&nbsp;';
        titleEl.appendChild(spaceSpan);
        charCount++;
      }
    });

    // Safety fallback to guarantee subtitle reveals even if animationend event is blocked
    setTimeout(() => {
      if (subtitleEl) subtitleEl.classList.add('is-visible');
    }, (charCount * charDelayMs) + 550);
  }

  initHeroLetterUnblur();

  // Check initial hash route
  handleHashChange();

  // -----------------------------------------------------------------------
  // SERVICE WORKER REGISTRATION (PWA)
  // -----------------------------------------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // -----------------------------------------------------------------------
  // DOWNLOAD APPS — PROFILE DROPDOWN LOGIC
  // -----------------------------------------------------------------------

  // Track selected simulators across both panels
  const selectedSims = new Set();

  // Wire up both toggle buttons + panels
  const downloadToggles = [
    { toggleId: 'guest-download-toggle', panelId: 'guest-download-panel', btnId: 'guest-dl-selected-btn' },
    { toggleId: 'auth-download-toggle',  panelId: 'auth-download-panel',  btnId: 'auth-dl-selected-btn' },
  ];

  function syncAllPanelsSelection() {
    // Sync circle UI across both panels to match selectedSims
    document.querySelectorAll('.dl-sim-row').forEach(row => {
      const sim = row.dataset.sim;
      if (selectedSims.has(sim)) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    });
    // Enable / disable download buttons
    document.querySelectorAll('.dl-download-selected-btn').forEach(btn => {
      btn.disabled = selectedSims.size === 0;
      btn.textContent = selectedSims.size > 0
        ? `Download ${selectedSims.size === 1 ? '1 App' : `${selectedSims.size} Apps`}`
        : 'Download Selected';
    });
  }

  downloadToggles.forEach(({ toggleId, panelId }) => {
    const toggleBtn = document.getElementById(toggleId);
    const panel     = document.getElementById(panelId);
    if (!toggleBtn || !panel) return;

    // Expand / collapse the sub-panel
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.toggle('open');
      toggleBtn.classList.toggle('open', isOpen);
    });

    // Circle row click — toggle selected state
    panel.querySelectorAll('.dl-sim-row').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const sim = row.dataset.sim;
        if (selectedSims.has(sim)) {
          selectedSims.delete(sim);
        } else {
          selectedSims.add(sim);
        }
        syncAllPanelsSelection();
      });
    });
  });

  // Download Selected button handler
  document.querySelectorAll('.dl-download-selected-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      let delay = 0;
      selectedSims.forEach(sim => {
        setTimeout(() => downloadSimulatorFile(sim), delay);
        delay += 300;
      });
      // Deselect after download
      selectedSims.clear();
      syncAllPanelsSelection();
      // Close dropdown
      document.querySelectorAll('.dropdown-download-panel').forEach(p => p.classList.remove('open'));
      document.querySelectorAll('.dropdown-download-toggle').forEach(t => t.classList.remove('open'));
      // Close outer dropdown
      const menu = document.getElementById('nav-user-menu');
      if (menu) menu.classList.remove('open');
    });
  });

  // -----------------------------------------------------------------------
  // SIMULATOR APP INSTALLER & LAUNCHER
  // -----------------------------------------------------------------------
  function downloadSimulatorFile(simKey) {
    const installPages = {
      shopify: './shopify-simulator',
      phantom: './phantom-wallet-simulator',
      cashapp: './cashapp-simulator',
    };

    const appNames = {
      shopify: 'Shopify',
      phantom: 'Phantom Wallet',
      cashapp: 'Cash App',
    };

    const page = installPages[simKey];
    if (!page) return;

    window.open(page, '_blank', 'noopener');
    showToast(`📲 Opening ${appNames[simKey]} standalone app…`);
  }

  function downloadDesktopLauncher(simKey) {
    const filenames = {
      shopify: 'Launch-Shopify-App.bat',
      phantom: 'Launch-Phantom-Wallet.bat',
      cashapp: 'Launch-Cash-App.bat'
    };
    const htmlFiles = {
      shopify: 'shopify-simulator',
      phantom: 'phantom-wallet-simulator',
      cashapp: 'cashapp-simulator'
    };
    const appTitles = {
      shopify: 'Shopify Store Admin',
      phantom: 'Phantom Wallet',
      cashapp: 'Cash App'
    };

    const fileName = filenames[simKey] || 'Launch-App.bat';
    const cleanRoute = htmlFiles[simKey] || '';
    const appTitle = appTitles[simKey] || 'App';

    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname.replace(/\/[^/]*\.html$/, '/').replace(/\/[^/]*$/, '/');
    const fullAppUrl = `${currentOrigin}${currentPath}${cleanRoute}`;

    const batContent = `@echo off
title Launching ${appTitle} Window...
echo Starting ${appTitle} in standalone app window...
start "" chrome.exe --app="${fullAppUrl}" 2>nul || start "" msedge.exe --app="${fullAppUrl}" 2>nul || start "" "${fullAppUrl}"
`;

    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`⚡ Downloaded ${fileName}! Double-click to launch standalone window.`);
  }

  // Handle Download Modal Buttons
  document.querySelectorAll('[data-action="download-file"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sim = btn.dataset.sim;
      if (sim) downloadSimulatorFile(sim);
    });
  });

  document.querySelectorAll('[data-action="download-launcher"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sim = btn.dataset.sim;
      if (sim) downloadDesktopLauncher(sim);
    });
  });

  // Expose for any call sites
  window.downloadSimulatorFile = downloadSimulatorFile;
  window.downloadDesktopLauncher = downloadDesktopLauncher;
});
