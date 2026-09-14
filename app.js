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
    balance: '$42,891.45',
    activeTab: 'tokens'
  },
  shopify: {
    timeframe: 'today',
    visitors: 38,
    data: {
      today: { sales: '$18,429.50', growth: '↑ 28.4%', orders: '142', conv: '4.52%', aov: '$129.78', sessions: '3,140' },
      yesterday: { sales: '$14,350.00', growth: '↑ 14.2%', orders: '112', conv: '3.98%', aov: '$128.12', sessions: '2,810' },
      week: { sales: '$96,480.00', growth: '↑ 32.8%', orders: '754', conv: '4.21%', aov: '$127.95', sessions: '17,910' },
      month: { sales: '$384,150.00', growth: '↑ 41.5%', orders: '3,024', conv: '4.35%', aov: '$127.03', sessions: '69,500' }
    }
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
    else if (viewName === 'shopify') themeMeta.setAttribute('content', '#1a1a1a');
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
    navigateTo('landing', false);
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

function updateCashAppDisplay() {
  const displayVal = document.getElementById('cashapp-amount-display');
  const hiddenMeasure = document.getElementById('cashapp-measure-display');
  const minWarning = document.getElementById('cashapp-min-warning');

  const formatted = formatCashAppAmount(state.cashAppAmount);

  if (displayVal) {
    displayVal.innerHTML = `<span>$</span><span>${formatted}</span>`;
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
  }

  updateCashAppDisplay();
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
function switchPhantomTab(tabName) {
  state.phantom.activeTab = tabName;
  document.querySelectorAll('.phantom-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  const tokensSection = document.getElementById('phantom-tokens-section');
  const nftsSection = document.getElementById('phantom-nfts-section');
  const activitySection = document.getElementById('phantom-activity-section');

  if (tokensSection) tokensSection.style.display = tabName === 'tokens' ? 'block' : 'none';
  if (nftsSection) nftsSection.style.display = tabName === 'nfts' ? 'block' : 'none';
  if (activitySection) activitySection.style.display = tabName === 'activity' ? 'block' : 'none';
}

function copyPhantomAddress() {
  navigator.clipboard.writeText(state.phantom.fullAddress).catch(() => { });
  showToast('Copied Phantom address to clipboard!');
}

function promptEditPhantomBalance() {
  const newBal = prompt('Enter custom portfolio balance:', state.phantom.balance);
  if (newBal && newBal.trim() !== '') {
    state.phantom.balance = newBal.startsWith('$') ? newBal : `$${newBal}`;
    const balEl = document.getElementById('phantom-portfolio-val');
    if (balEl) balEl.textContent = state.phantom.balance;
    showToast('Balance updated');
  }
}

// --------------------------------------------------------------------------
// SHOPIFY DASHBOARD LOGIC
// --------------------------------------------------------------------------
function setShopifyTimeframe(timeframe) {
  state.shopify.timeframe = timeframe;
  const d = state.shopify.data[timeframe] || state.shopify.data.today;

  document.querySelectorAll('.shopify-date-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.timeframe === timeframe);
  });

  const salesAmountEl = document.getElementById('shopify-sales-amount');
  const salesGrowthEl = document.getElementById('shopify-sales-growth');
  const kpiSessionsEl = document.getElementById('shopify-kpi-sessions');
  const kpiOrdersEl = document.getElementById('shopify-kpi-orders');
  const kpiConvEl = document.getElementById('shopify-kpi-conv');
  const kpiAovEl = document.getElementById('shopify-kpi-aov');

  if (salesAmountEl) salesAmountEl.textContent = d.sales;
  if (salesGrowthEl) salesGrowthEl.textContent = d.growth;
  if (kpiSessionsEl) kpiSessionsEl.textContent = d.sessions;
  if (kpiOrdersEl) kpiOrdersEl.textContent = d.orders;
  if (kpiConvEl) kpiConvEl.textContent = d.conv;
  if (kpiAovEl) kpiAovEl.textContent = d.aov;

  // Render randomized dynamic curve for SVG chart
  renderShopifyChart(timeframe);
}

function renderShopifyChart(timeframe) {
  const chartPath = document.getElementById('shopify-chart-path');
  const chartArea = document.getElementById('shopify-chart-area');
  if (!chartPath || !chartArea) return;

  const curves = {
    today: {
      line: 'M0,90 Q50,75 100,82 T200,45 T300,55 T400,18',
      area: 'M0,90 Q50,75 100,82 T200,45 T300,55 T400,18 L400,120 L0,120 Z'
    },
    yesterday: {
      line: 'M0,95 Q50,85 100,70 T200,60 T300,40 T400,30',
      area: 'M0,95 Q50,85 100,70 T200,60 T300,40 T400,30 L400,120 L0,120 Z'
    },
    week: {
      line: 'M0,80 Q50,65 100,45 T200,70 T300,30 T400,10',
      area: 'M0,80 Q50,65 100,45 T200,70 T300,30 T400,10 L400,120 L0,120 Z'
    },
    month: {
      line: 'M0,100 Q50,90 100,60 T200,50 T300,25 T400,5',
      area: 'M0,100 Q50,90 100,60 T200,50 T300,25 T400,5 L400,120 L0,120 Z'
    }
  };

  const selected = curves[timeframe] || curves.today;
  chartPath.setAttribute('d', selected.line);
  chartArea.setAttribute('d', selected.area);
}

// Live visitor pulse simulator
setInterval(() => {
  const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
  state.shopify.visitors = Math.max(24, Math.min(68, state.shopify.visitors + delta));
  const visCountEl = document.getElementById('shopify-visitor-count');
  if (visCountEl) {
    visCountEl.textContent = state.shopify.visitors;
  }
}, 4000);

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

  // Cash App Pay / Request / Pool
  const payBtn = document.getElementById('cashapp-pay-btn');
  if (payBtn) payBtn.addEventListener('click', () => triggerCashAppAction('pay'));

  const reqBtn = document.getElementById('cashapp-req-btn');
  if (reqBtn) reqBtn.addEventListener('click', () => triggerCashAppAction('request'));

  const poolBtn = document.getElementById('cashapp-pool-btn');
  if (poolBtn) poolBtn.addEventListener('click', () => triggerCashAppAction('pool'));

  // Phantom Wallet Tabs
  document.querySelectorAll('.phantom-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPhantomTab(btn.dataset.tab);
    });
  });

  // Phantom Action Buttons (Send, Receive, Swap, Buy)
  document.querySelectorAll('.phantom-action-item').forEach(item => {
    item.addEventListener('click', () => {
      const act = item.dataset.phantomAction;
      if (act === 'receive') {
        showSimModal({
          iconSvg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab9ff2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/></svg>',
          iconBg: 'rgba(171, 159, 242, 0.15)',
          title: 'Receive Crypto',
          desc: `Deposit Solana or SPL tokens to your address:\n\n${state.phantom.fullAddress}`,
          actionText: 'Copy Address & Close'
        });
      } else if (act === 'send') {
        showSimModal({
          iconSvg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab9ff2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
          iconBg: 'rgba(171, 159, 242, 0.15)',
          title: 'Send Tokens',
          desc: 'Select token and enter recipient Solana address to simulate transfer.',
          actionText: 'Close'
        });
      } else if (act === 'swap') {
        showSimModal({
          iconSvg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ab9ff2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',
          iconBg: 'rgba(171, 159, 242, 0.15)',
          title: 'Phantom Instant Swap',
          desc: 'Simulate cross-token swaps on Jupiter liquidity aggregator with 0% slippage.',
          actionText: 'Done'
        });
      } else if (act === 'buy') {
        showToast('Redirecting to Onramper fiat gateway...');
      }
    });
  });

  // Copy Phantom Address Pill
  const phantomCopyPill = document.getElementById('phantom-copy-address');
  if (phantomCopyPill) phantomCopyPill.addEventListener('click', copyPhantomAddress);

  const phantomBalHero = document.getElementById('phantom-portfolio-val');
  if (phantomBalHero) {
    phantomBalHero.addEventListener('click', promptEditPhantomBalance);
  }

  // Shopify Date Filter Buttons
  document.querySelectorAll('.shopify-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setShopifyTimeframe(btn.dataset.timeframe);
    });
  });

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

  // Check initial hash route
  handleHashChange();
});
