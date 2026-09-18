// ==========================================================================
// MULTI-SIMULATOR HUB APP CONTROLLER
// Supports Dashboard, Phantom Wallet, Shopify Admin, and Cash App
// ==========================================================================

// Global App State
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
    sales: '$0',
    salesGrowth: '0%',
    orders: '0',
    ordersGrowth: '0%',
    sessions: '0',
    sessionsGrowth: '0%',
    conv: '0%',
    convGrowth: '0%',
    visitors: '0',
    fulfillOrders: 2,
    notificationsCount: 0,
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
} catch (e) {}

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
} catch (e) {}

// Restore Shopify state
try {
  const savedShopify = localStorage.getItem('larpkit_shopify');
  if (savedShopify) {
    const parsedS = JSON.parse(savedShopify);
    if (parsedS) {
      state.shopify = { ...state.shopify, ...parsedS };
    }
  }
} catch (e) {}

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
        const simNames = { phantom: 'Phantom Wallet', shopify: 'Shopify Admin', cashapp: 'Cash App' };
        authGateText.textContent = `Please sign in to launch ${simNames[state.pendingDestination] || 'this simulator'}.`;
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
  } catch (e) {}

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

  // Gate simulators behind login
  if (['cashapp', 'phantom', 'shopify'].includes(viewName) && !state.isLoggedIn) {
    state.pendingDestination = viewName;
    openAuthModal('login', true);
    return;
  }

  // Update URL hash
  if (pushHistory) {
    window.location.hash = viewName === 'landing' ? '' : `#${viewName}`;
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
    // If an anchor like #simulators is in the hash on reload, clean it so browser never jumps to white gap
    if (['simulators', 'pricing', 'faq'].includes(hash)) {
      history.replaceState(null, null, window.location.pathname);
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
    const len = formatted.length;
    let targetSize = '91.8px';
    if (len >= 8) {
      targetSize = '56px';
    } else if (len >= 6) {
      targetSize = '68px';
    } else if (len >= 4) {
      targetSize = '80px';
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
    if (tabKeypad) tabKeypad.style.display = 'flex';
    if (tabHome) tabHome.style.display = 'none';
    if (tabHistory) tabHistory.style.display = 'none';
  } else if (tabName === 'home') {
    if (phoneContainer) {
      phoneContainer.classList.add('dark-theme');
      phoneContainer.style.backgroundColor = '#000000';
    }
    if (tabKeypad) tabKeypad.style.display = 'none';
    if (tabHome) tabHome.style.display = 'block';
    if (tabHistory) tabHistory.style.display = 'none';
    updateCashAppHomeBalance();
  } else if (tabName === 'history') {
    if (phoneContainer) {
      phoneContainer.classList.add('dark-theme');
      phoneContainer.style.backgroundColor = '#000000';
    }
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
  if (actionType === 'pay') {
    let numVal = parseFloat(state.cashAppAmount);
    if (!numVal || numVal <= 0) {
      numVal = 99999;
      state.cashAppAmount = '99999';
      updateCashAppDisplay();
    }
    const formattedAmount = `$${numVal.toLocaleString('en-US')}`;
    openCashAppPaySheet(formattedAmount);
  } else if (actionType === 'request') {
    let numVal = parseFloat(state.cashAppAmount);
    if (!numVal || numVal <= 0) {
      numVal = 99999;
      state.cashAppAmount = '99999';
      updateCashAppDisplay();
    }
    const formattedAmount = `$${numVal.toLocaleString('en-US')}`;
    showSimModal({
      iconSvg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D54B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
      iconBg: 'rgba(0, 213, 75, 0.15)',
      title: `Requested ${formattedAmount}`,
      desc: `A payment link request has been dispatched.`,
      actionText: 'Done'
    });
    state.cashAppAmount = '0';
    updateCashAppDisplay();
  } else if (actionType === 'pool') {
    const numVal = parseFloat(state.cashAppAmount) || 99999;
    showToast(`Pool feature ready for $${numVal.toLocaleString('en-US')}`);
  }
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

  if (walletNameEl) {
    walletNameEl.textContent = state.phantom.walletName || 'Wallet Name';
  }

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
      { key: 'btc', name: 'BTC', logo: './bitcoin-logo.png', ticker: 'BTC' },
      { key: 'usdt', name: 'USDT', logo: './usdt-logo.png', ticker: 'USDT' },
      { key: 'solana', name: 'Solana', logo: './solana-logo.png', ticker: 'SOL' },
      { key: 'ethereum', name: 'Ethereum', logo: './ethereum-logo.png', ticker: 'ETH' },
      { key: 'usdc', name: 'USDC', logo: './usdc-logo.png', ticker: 'USDC' },
      { key: 'polygon', name: 'Polygon', logo: './polygon-logo.png', ticker: 'POL' }
    ];

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
  } catch (e) {}

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

  // Store name and avatar initials
  const storeNameDisplay = document.getElementById('shopify-display-store-name');
  const avatarLetters = document.getElementById('shopify-avatar-letters');
  const storeName = state.shopify.storeName || 'Shop Name';

  if (storeNameDisplay) storeNameDisplay.textContent = storeName;
  if (avatarLetters) {
    const parts = storeName.trim().split(/\s+/);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    avatarLetters.textContent = initials || 'SN';
  }

  // Metrics
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

  if (salesEl) salesEl.textContent = state.shopify.sales;
  if (salesGrowthEl) salesGrowthEl.textContent = state.shopify.salesGrowth;
  if (ordersEl) ordersEl.textContent = state.shopify.orders;
  if (ordersGrowthEl) ordersGrowthEl.textContent = state.shopify.ordersGrowth;
  if (sessionsEl) sessionsEl.textContent = state.shopify.sessions;
  if (sessionsGrowthEl) sessionsGrowthEl.textContent = state.shopify.sessionsGrowth;
  if (convEl) convEl.textContent = state.shopify.conv;
  if (convGrowthEl) convGrowthEl.textContent = state.shopify.convGrowth;
  if (visitorsEl) visitorsEl.textContent = state.shopify.visitors;
  if (fulfillCountEl) fulfillCountEl.textContent = state.shopify.fulfillOrders;
  if (sideOrdersBadge) sideOrdersBadge.textContent = state.shopify.orders === '0' ? '4' : state.shopify.orders;

  renderShopifyStoreProfile();
  updateShopifyNotificationBadge();
}

// --------------------------------------------------------------------------
// SHOPIFY REAL-TIME NOTIFICATIONS & LOGO CONTROLLER
// --------------------------------------------------------------------------
let shopifyNotifItems = [];

// Synthesize authentic Shopify Cash Register Cha-Ching sound via Web Audio API
function playShopifyChaChing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 1. Mechanical clink / latch
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(3200, now + 0.07);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // 2. High metallic "Ching!" brass bell chime (E7)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2489.02, now + 0.05);
    gain2.gain.setValueAtTime(0.35, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.65);

    // 3. Shimmer overtone (B7)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(3951.07, now + 0.07);
    gain3.gain.setValueAtTime(0.22, now + 0.07);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.07);
    osc3.stop(now + 0.7);
  } catch (e) {
    // AudioContext silenced or not supported
  }
}

let shopifyAudioInstance = null;
try {
  shopifyAudioInstance = new Audio('./shopify_sale_sound.mp3');
  shopifyAudioInstance.preload = 'auto';
} catch (e) {
  shopifyAudioInstance = null;
}

function playShopifySaleSound() {
  try {
    const sound = shopifyAudioInstance ? shopifyAudioInstance.cloneNode() : new Audio('./shopify_sale_sound.mp3');
    sound.volume = 1.0;
    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playShopifyChaChing();
      });
    }
  } catch (e) {
    playShopifyChaChing();
  }
}

function updateShopifyNotificationBadge() {
  const badge = document.getElementById('shopify-notif-badge');
  const dropdownCount = document.getElementById('shopify-dropdown-count');
  const count = parseInt(state.shopify.notificationsCount, 10) || 0;

  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
      badge.classList.remove('badge-pop');
      void badge.offsetWidth;
      badge.classList.add('badge-pop');
    } else {
      badge.style.display = 'none';
      badge.textContent = '0';
    }
  }
  if (dropdownCount) {
    dropdownCount.textContent = count;
  }
}

function renderShopifyNotificationDropdown() {
  const listEl = document.getElementById('shopify-notif-dropdown-list');
  const countEl = document.getElementById('shopify-dropdown-count');
  if (!listEl) return;

  const count = parseInt(state.shopify.notificationsCount, 10) || 0;
  if (countEl) countEl.textContent = count;

  if (!shopifyNotifItems.length) {
    listEl.innerHTML = '<div class="shopify-notif-empty">No unread notifications</div>';
    return;
  }

  const store = (state.shopify && state.shopify.storeName && state.shopify.storeName.trim())
    ? state.shopify.storeName.trim()
    : 'Online Store';

  listEl.innerHTML = shopifyNotifItems.map(item => `
    <div class="shopify-notif-item">
      <div class="shopify-order-toast-icon" style="width: 32px; height: 32px; border-radius: 8px;">
        <img src="./shopify green logo.webp" alt="Shopify" class="shopify-ios-notif-img">
      </div>
      <div class="shopify-notif-item-info">
        <div class="shopify-notif-item-title">Order #${item.id}</div>
        <div class="shopify-notif-item-desc">${item.amount}, ${item.itemsCount || 3} items from ${store}</div>
      </div>
    </div>
  `).join('');
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
      <img src="./shopify green logo.webp" alt="Shopify" class="shopify-ios-notif-img">
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
  const count = Math.min(Math.max(parseInt(rawCount, 10) || 1, 1), 30);

  closeShopifySettingsModal();
  showToast(`Streaming ${count} live notification${count > 1 ? 's' : ''}...`);

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

  function sendNext() {
    if (sent >= count) return;
    sent++;

    const cust = customers[Math.floor(Math.random() * customers.length)];
    const product = items[Math.floor(Math.random() * items.length)];
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const amountNum = (Math.random() * 180 + 35).toFixed(2);
    const orderAmount = `$${amountNum}`;
    const itemsCount = Math.floor(Math.random() * 3 + 1);

    // 1. Play real-time cash register chime from mp3
    playShopifySaleSound();

    // 2. Increment badge count and shake bell
    currentCount++;
    state.shopify.notificationsCount = currentCount;
    try {
      localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
    } catch (e) {}
    updateShopifyNotificationBadge();

    const bellBtn = document.getElementById('shopify-notifications-btn');
    if (bellBtn) {
      bellBtn.classList.remove('bell-ringing');
      void bellBtn.offsetWidth;
      bellBtn.classList.add('bell-ringing');
      setTimeout(() => bellBtn.classList.remove('bell-ringing'), 600);
    }

    // 3. Add to dropdown history
    shopifyNotifItems.unshift({
      id: orderNum,
      customer: cust.name,
      product: product,
      amount: orderAmount,
      itemsCount: itemsCount,
      time: 'Just now'
    });
    renderShopifyNotificationDropdown();

    // 4. Spawn floating order toast matching iOS screenshot design
    spawnShopifyOrderToast(orderNum, cust.name, product, orderAmount, itemsCount);

    if (sent < count) {
      const delay = Math.floor(Math.random() * 350 + 700);
      setTimeout(sendNext, delay);
    }
  }

  sendNext();
}

function handleShopifyNotifDone() {
  const inputNotifs = document.getElementById('shopify-input-notifs');
  const count = Math.max(0, parseInt(inputNotifs?.value, 10) || 0);
  state.shopify.notificationsCount = count;
  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
  } catch (e) {}
  updateShopifyNotificationBadge();
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
    } catch (err) {}
    renderShopifyStoreProfile();
    showToast('Store logo updated!');
  };
  reader.readAsDataURL(file);
}

function handleShopifyLogoRemove() {
  state.shopify.storeLogo = '';
  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
  } catch (err) {}
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

  // Compute initials from storeName
  const storeName = state.shopify.storeName || 'Shop Name';
  if (displayStoreName) displayStoreName.textContent = storeName;

  const parts = storeName.trim().split(/\s+/);
  let initials = parts[0] ? parts[0].charAt(0).toUpperCase() : 'S';
  if (parts.length > 1 && parts[1]) {
    initials += parts[1].charAt(0).toUpperCase();
  }

  if (avatarLetters) avatarLetters.textContent = initials;
  if (modalLetters) modalLetters.textContent = initials;

  if (state.shopify.storeLogo) {
    if (avatarImg) {
      avatarImg.src = state.shopify.storeLogo;
      avatarImg.style.display = 'block';
    }
    if (avatarLetters) avatarLetters.style.display = 'none';

    if (modalImg) {
      modalImg.src = state.shopify.storeLogo;
      modalImg.style.display = 'block';
    }
    if (modalLetters) modalLetters.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    if (avatarImg) {
      avatarImg.style.display = 'none';
      avatarImg.src = '';
    }
    if (avatarLetters) avatarLetters.style.display = 'block';

    if (modalImg) {
      modalImg.style.display = 'none';
      modalImg.src = '';
    }
    if (modalLetters) modalLetters.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function openShopifySettingsModal() {
  const modal = document.getElementById('shopify-settings-modal');
  if (!modal) return;

  const inputName = document.getElementById('shopify-input-store-name');
  const inputSales = document.getElementById('shopify-input-sales');
  const inputGrowth = document.getElementById('shopify-input-sales-growth');
  const inputOrders = document.getElementById('shopify-input-orders');
  const inputSessions = document.getElementById('shopify-input-sessions');
  const inputConv = document.getElementById('shopify-input-conv');
  const inputLive = document.getElementById('shopify-input-live');
  const inputFulfill = document.getElementById('shopify-input-fulfill');
  const inputNotifs = document.getElementById('shopify-input-notifs');

  if (inputName) inputName.value = state.shopify.storeName;
  if (inputSales) inputSales.value = state.shopify.sales;
  if (inputGrowth) inputGrowth.value = state.shopify.salesGrowth;
  if (inputOrders) inputOrders.value = state.shopify.orders;
  if (inputSessions) inputSessions.value = state.shopify.sessions;
  if (inputConv) inputConv.value = state.shopify.conv;
  if (inputLive) inputLive.value = state.shopify.visitors;
  if (inputFulfill) inputFulfill.value = state.shopify.fulfillOrders;
  if (inputNotifs) inputNotifs.value = state.shopify.notificationsCount !== undefined ? state.shopify.notificationsCount : 3;

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
  const inputSales = document.getElementById('shopify-input-sales');
  const inputGrowth = document.getElementById('shopify-input-sales-growth');
  const inputOrders = document.getElementById('shopify-input-orders');
  const inputSessions = document.getElementById('shopify-input-sessions');
  const inputConv = document.getElementById('shopify-input-conv');
  const inputLive = document.getElementById('shopify-input-live');
  const inputFulfill = document.getElementById('shopify-input-fulfill');

  if (inputName && inputName.value.trim()) state.shopify.storeName = inputName.value.trim();
  if (inputSales) {
    let s = inputSales.value.trim();
    if (s && !s.startsWith('$')) s = '$' + s;
    state.shopify.sales = s || '$0';
  }
  if (inputGrowth) {
    let g = inputGrowth.value.trim() || '0%';
    if (g && !g.endsWith('%')) g = g + '%';
    state.shopify.salesGrowth = g;
    state.shopify.ordersGrowth = g;
    state.shopify.sessionsGrowth = g;
    state.shopify.convGrowth = g;
  }
  if (inputOrders) state.shopify.orders = inputOrders.value.trim() || '0';
  if (inputSessions) state.shopify.sessions = inputSessions.value.trim() || '0';
  if (inputConv) {
    let c = inputConv.value.trim() || '0%';
    if (c && !c.endsWith('%')) c = c + '%';
    state.shopify.conv = c;
  }
  if (inputLive) state.shopify.visitors = inputLive.value.trim() || '0';
  if (inputFulfill) state.shopify.fulfillOrders = parseInt(inputFulfill.value, 10) || 2;
  const inputNotifs = document.getElementById('shopify-input-notifs');
  if (inputNotifs) {
    state.shopify.notificationsCount = Math.max(0, parseInt(inputNotifs.value, 10) || 0);
  }

  try {
    localStorage.setItem('larpkit_shopify', JSON.stringify(state.shopify));
  } catch (e) {}

  renderShopifyDesktop();
  closeShopifySettingsModal();
  showToast('Shopify figures updated!');
}

function resetShopifySettings() {
  state.shopify = {
    storeName: 'Shop Name',
    sales: '$0',
    salesGrowth: '0%',
    orders: '0',
    ordersGrowth: '0%',
    sessions: '0',
    sessionsGrowth: '0%',
    conv: '0%',
    convGrowth: '0%',
    visitors: '0',
    fulfillOrders: 2,
    notificationsCount: 0,
    storeLogo: ''
  };
  try {
    localStorage.removeItem('larpkit_shopify');
  } catch (e) {}
  renderShopifyDesktop();
  closeShopifySettingsModal();
  showToast('Shopify figures reset to zero');
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

  // Cash App Pay / Request / Pool
  const payBtn = document.getElementById('cashapp-pay-btn');
  if (payBtn) payBtn.addEventListener('click', () => triggerCashAppAction('pay'));

  const reqBtn = document.getElementById('cashapp-req-btn');
  if (reqBtn) reqBtn.addEventListener('click', () => triggerCashAppAction('request'));

  const poolBtn = document.getElementById('cashapp-pool-btn');
  if (poolBtn) poolBtn.addEventListener('click', () => triggerCashAppAction('pool'));

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

  // Render initial Phantom UI
  renderPhantomUI();

  // Shopify Desktop Simulator Event Listeners
  const shopifyTriggers = [
    'shopify-profile-trigger',
    'shopify-settings-trigger-btn',
    'shopify-kpi-sales-click',
    'shopify-kpi-orders-click',
    'shopify-kpi-sessions-click',
    'shopify-kpi-conv-click',
    'shopify-kpi-live-click'
  ];
  shopifyTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        openShopifySettingsModal();
      });
    }
  });

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
    btnGetNotifs.addEventListener('click', () => {
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

  // Initial render of Shopify Desktop UI
  renderShopifyDesktop();

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
  document.querySelectorAll('.cashapp-tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchCashAppTab(btn.dataset.cashappTab);
    });
  });

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
      } catch (e) {}
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

  // Footer links
  const footerTerms = document.getElementById('footer-terms-btn');
  if (footerTerms) {
    footerTerms.addEventListener('click', () => {
      showToast('LarpKit License: Single-seat developer and simulator use.');
    });
  }

  const footerPrivacy = document.getElementById('footer-privacy-btn');
  if (footerPrivacy) {
    footerPrivacy.addEventListener('click', () => {
      showToast('Privacy Policy: All simulator data stays strictly in your browser.');
    });
  }

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
});
