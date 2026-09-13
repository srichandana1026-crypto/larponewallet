// ==========================================================================
// MULTI-SIMULATOR HUB APP CONTROLLER
// Supports Dashboard, Phantom Wallet, Shopify Admin, and Cash App
// ==========================================================================

// Global App State
const state = {
  currentView: 'dashboard',
  cashAppAmount: '0',
  cashAppHistory: [
    { name: 'Sarah Jenkins', tag: '$sarahj22', amount: '+$75.00', date: 'Today at 11:42 AM', type: 'received' },
    { name: 'Spotify Premium', tag: '$spotify', amount: '-$14.99', date: 'Yesterday', type: 'sent' },
    { name: 'Marcus Bell', tag: '$mbell_tech', amount: '+$350.00', date: 'Mar 11', type: 'received' },
    { name: 'Uber Technologies', tag: '$uber', amount: '-$32.50', date: 'Mar 10', type: 'sent' }
  ],
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
  }
};

// --------------------------------------------------------------------------
// ROUTER & NAVIGATION
// --------------------------------------------------------------------------
function navigateTo(viewName, pushHistory = true) {
  const validViews = ['dashboard', 'cashapp', 'phantom', 'shopify'];
  if (!validViews.includes(viewName)) {
    viewName = 'dashboard';
  }

  // Update URL hash
  if (pushHistory) {
    window.location.hash = viewName === 'dashboard' ? '' : `#${viewName}`;
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
    else themeMeta.setAttribute('content', '#0a0b10');
  }
}

// Handle Browser Back / Forward & Initial Hash
function handleHashChange() {
  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (['cashapp', 'phantom', 'shopify'].includes(hash)) {
    navigateTo(hash, false);
  } else {
    navigateTo('dashboard', false);
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
  }, 450);

  if (navigator.vibrate) {
    try {
      navigator.vibrate([40, 30, 40]);
    } catch (e) {}
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

function getFilteredCashAppContacts(query) {
  const q = query.trim().toLowerCase().replace('$', '');
  if (!q) return [];

  // If query starts with allm or is allmigt, return the 4 exact contacts from Screenshot 2
  if (q === 'allmigt' || q.startsWith('allm')) {
    return [
      { name: 'Aaron Brooks', cashtag: '$allmigt', initial: 'A', bg: '#e85656' },
      { name: 'Marcus Thomas', cashtag: '$allmigt2', initial: 'M', bg: '#e85656' },
      { name: 'Alex Lewis', cashtag: '$allmigtt', initial: 'A', bg: '#d87498' },
      { name: 'Devin Parker', cashtag: '$allmi5', initial: 'D', bg: '#e86b59' }
    ];
  }

  // Match existing contacts
  let matches = cashAppContacts.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.cashtag.toLowerCase().includes(q)
  );

  // If less than 4 matches, dynamically generate contacts tailored for this word so results appear for ANY word typed
  if (matches.length < 4) {
    const capitalized = q.charAt(0).toUpperCase() + q.slice(1);
    const dynamicNames = [
      { name: `${capitalized} Brooks`, cashtag: `$${q}`, initial: capitalized.charAt(0) || 'A', bg: '#e85656' },
      { name: `Marcus ${capitalized}`, cashtag: `$${q}2`, initial: 'M', bg: '#e85656' },
      { name: `Alex ${capitalized}`, cashtag: `$${q}tt`, initial: 'A', bg: '#d87498' },
      { name: `Devin ${capitalized}`, cashtag: `$${q}5`, initial: 'D', bg: '#e86b59' }
    ];

    for (const d of dynamicNames) {
      if (!matches.some(m => m.cashtag.toLowerCase() === d.cashtag.toLowerCase())) {
        matches.push(d);
      }
      if (matches.length >= 4) break;
    }
  }

  return matches;
}

function openCashAppPaySheet(amountText) {
  const sheet = document.getElementById('cashapp-pay-sheet');
  const amountEl = document.getElementById('pay-sheet-amount');
  const input = document.getElementById('cashapp-recipient-input');
  const contactsCard = document.getElementById('cashapp-contacts-card');
  const resultsSection = document.getElementById('cashapp-results-section');
  const resultsContainer = document.getElementById('cashapp-results-list');

  if (!sheet) return;

  if (amountEl) amountEl.textContent = amountText;
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
  if (contactsCard) contactsCard.style.display = 'block';
  if (resultsSection) resultsSection.style.display = 'none';
  if (resultsContainer) resultsContainer.innerHTML = '';

  sheet.classList.add('active');
}

function closeCashAppPaySheet() {
  const sheet = document.getElementById('cashapp-pay-sheet');
  if (sheet) sheet.classList.remove('active');
}

function renderCashAppSearchResults(query) {
  const resultsContainer = document.getElementById('cashapp-results-list');
  const contactsCard = document.getElementById('cashapp-contacts-card');
  const resultsSection = document.getElementById('cashapp-results-section');
  if (!resultsContainer || !contactsCard || !resultsSection) return;

  const trimmed = query.trim();
  if (trimmed === '') {
    contactsCard.style.display = 'block';
    resultsSection.style.display = 'none';
    resultsContainer.innerHTML = '';
    return;
  }

  contactsCard.style.display = 'none';
  resultsSection.style.display = 'flex';

  const matches = getFilteredCashAppContacts(trimmed);
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

function selectCashAppRecipient(recipient) {
  const currentAmount = document.getElementById('pay-sheet-amount')?.textContent || '$99,999';
  closeCashAppPaySheet();

  showSimModal({
    iconSvg: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    iconBg: 'rgba(34, 197, 94, 0.15)',
    title: `Sent ${currentAmount}`,
    desc: `Payment successfully sent to ${recipient.name} (${recipient.cashtag}) with instant settlement.`,
    actionText: 'Done'
  });

  state.cashAppAmount = '0';
  updateCashAppDisplay();
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
  navigator.clipboard.writeText(state.phantom.fullAddress).catch(() => {});
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
      navigateTo(target);
    });
  });

  // Context Menu Buttons
  const menuBackBtn = document.getElementById('menu-item-back');
  if (menuBackBtn) {
    menuBackBtn.addEventListener('click', () => {
      if (state.currentView !== 'dashboard') {
        navigateTo('dashboard');
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
      renderCashAppSearchResults(e.target.value);
    });
  }

  const syncContactsBtn = document.getElementById('cashapp-sync-contacts-btn');
  if (syncContactsBtn) {
    syncContactsBtn.addEventListener('click', () => {
      showToast('Contacts synced from address book');
      const input = document.getElementById('cashapp-recipient-input');
      if (input) {
        input.value = 'a';
        renderCashAppSearchResults('a');
        input.select();
      }
    });
  }

  const qrBtn = document.getElementById('cashapp-qr-btn');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      showToast('QR scanner active');
    });
  }

  // Check initial hash route
  handleHashChange();
});
