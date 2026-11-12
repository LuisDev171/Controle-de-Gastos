'use strict';

const STORAGE_KEY = 'verde_gastos_accounts_v1';
const SESSION_KEY = 'verde_gastos_session_v1';
const PASSWORD_ITERATIONS = 180000;

const GROUPS = {
  cartao: { label: 'Cartão', icon: '💳', color: '#31835a', types: ['Fatura do cartão', 'Compra parcelada', 'Anuidade', 'Outros'] },
  casa: { label: 'Casa', icon: '🏠', color: '#77a96b', types: ['Aluguel', 'Água', 'Luz', 'IPTU', 'Internet', 'Outros'] },
  carro: { label: 'Carro', icon: '🚗', color: '#d7a64d', types: ['IPVA', 'Seguro', 'Mecânico', 'Lavador', 'Combustível', 'Outros'] },
  cachorro: { label: 'Cachorro', icon: '🐶', color: '#8b83c8', types: ['Pet shop', 'Banho', 'Creche', 'Vacinas', 'Veterinário', 'Outros'] }
};
const SECTION_ORDER = ['total', ...Object.keys(GROUPS)];
const PALETTE = ['#31835a', '#77a96b', '#d7a64d', '#8b83c8', '#4d9db0', '#d47c69', '#9ba9a0', '#c08cba'];

const $ = (selector) => document.querySelector(selector);
const authView = $('#auth-view');
const appView = $('#app-view');
const authForm = $('#auth-form');
const authMessage = $('#auth-message');
const expenseModal = $('#expense-modal');
let authMode = 'login';
let currentEmail = null;
let currentSection = 'total';
let selectedMonth = getCurrentMonth();
let toastTimer = null;

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Não foi possível ler os dados locais:', error);
    return {};
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    console.error('Não foi possível salvar os dados locais:', error);
    showToast('Não foi possível salvar. Verifique o espaço disponível no dispositivo.');
    return false;
  }
}

function getCurrentAccount() {
  if (!currentEmail) return null;
  return loadAccounts()[currentEmail] || null;
}

function updateCurrentAccount(updater) {
  if (!currentEmail) return false;
  const accounts = loadAccounts();
  const account = accounts[currentEmail];
  if (!account) return false;
  updater(account);
  return saveAccounts(accounts);
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hashPassword(password, saltBase64) {
  if (!window.crypto?.subtle) {
    throw new Error('O login protegido precisa que o aplicativo seja aberto por HTTPS. Publique pelo GitHub Pages ou use localhost.');
  }
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
  return { hash: bytesToBase64(new Uint8Array(bits)), salt: bytesToBase64(salt) };
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';
  $('#login-tab').classList.toggle('active', !isRegister);
  $('#register-tab').classList.toggle('active', isRegister);
  $('#login-tab').setAttribute('aria-selected', String(!isRegister));
  $('#register-tab').setAttribute('aria-selected', String(isRegister));
  $('#name-field').hidden = !isRegister;
  $('#auth-name').required = isRegister;
  $('#auth-password').autocomplete = isRegister ? 'new-password' : 'current-password';
  $('#auth-submit').textContent = isRegister ? 'Criar minha conta' : 'Entrar';
  $('#password-help').textContent = isRegister ? 'Use pelo menos 8 caracteres.' : 'Digite sua senha.';
  authMessage.textContent = '';
}

function showAuth(message = '') {
  authView.hidden = false;
  appView.hidden = true;
  expenseModal.hidden = true;
  authMessage.textContent = message;
  currentEmail = null;
}

function showApp(email) {
  currentEmail = email;
  currentSection = 'total';
  selectedMonth = getCurrentMonth();
  authView.hidden = true;
  appView.hidden = false;
  const account = getCurrentAccount();
  if (!account) return showAuth('Não encontramos essa conta neste dispositivo. Crie uma nova conta.');
  const displayName = account.name || email.split('@')[0];
  $('#sidebar-user-name').textContent = displayName;
  $('#sidebar-user-email').textContent = email;
  $('#user-avatar').textContent = displayName.trim().charAt(0).toUpperCase() || 'V';
  renderNavigation();
  renderMonthOptions();
  renderApp();
  try {
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  } catch (_) { /* Recurso opcional do navegador. */ }
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function formatMonth(monthKey) {
  if (monthKey === 'all') return 'Todos os meses';
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function getAllExpenses() {
  const account = getCurrentAccount();
  return Array.isArray(account?.expenses) ? account.expenses : [];
}

function getPeriodExpenses() {
  const expenses = getAllExpenses();
  return selectedMonth === 'all' ? expenses : expenses.filter((item) => item.date?.slice(0, 7) === selectedMonth);
}

function getVisibleExpenses() {
  const expenses = getPeriodExpenses();
  return currentSection === 'total' ? expenses : expenses.filter((item) => item.group === currentSection);
}

function sumExpenses(expenses) {
  return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function renderNavigation() {
  const navMarkup = SECTION_ORDER.map((key) => {
    const item = key === 'total' ? { label: 'Total', icon: '◉' } : GROUPS[key];
    return `<button class="nav-link ${currentSection === key ? 'active' : ''}" type="button" data-section="${key}" aria-current="${currentSection === key ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span>${key === 'total' ? '<span class="nav-total">GERAL</span>' : ''}</button>`;
  }).join('');
  $('#desktop-nav').innerHTML = navMarkup;
  $('#mobile-nav').innerHTML = navMarkup;
}

function renderMonthOptions() {
  const months = new Set([getCurrentMonth()]);
  getAllExpenses().forEach((item) => {
    if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) months.add(item.date.slice(0, 7));
  });
  const options = [...months].sort((a, b) => b.localeCompare(a));
  options.unshift('all');
  $('#month-filter').innerHTML = options.map((month) => `<option value="${month}">${month === 'all' ? 'Todos os meses' : escapeHtml(capitalize(formatMonth(month)))}</option>`).join('');
  $('#month-filter').value = selectedMonth;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function capitalize(value) { return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1); }

function renderApp() {
  const account = getCurrentAccount();
  if (!account) return showAuth();
  const displayName = account.name || currentEmail.split('@')[0];
  const firstName = displayName.trim().split(/\s+/)[0];
  const periodLabel = selectedMonth === 'all' ? 'em todo o período' : `em ${formatMonth(selectedMonth)}`;
  $('#greeting-title').textContent = `Olá, ${firstName}!`;
  $('#greeting-subtitle').textContent = `Aqui está o resumo dos seus gastos ${periodLabel}.`;
  $('#month-filter').value = selectedMonth;

  const periodExpenses = getPeriodExpenses();
  const total = sumExpenses(periodExpenses);
  const summaries = [
    { key: 'total', label: 'Total', icon: '◉', amount: total },
    ...Object.entries(GROUPS).map(([key, value]) => ({ key, label: value.label, icon: value.icon, amount: sumExpenses(periodExpenses.filter((item) => item.group === key)) }))
  ];
  $('#summary-cards').innerHTML = summaries.map((item) => `<article class="summary-card ${item.key === 'total' ? 'total-card' : ''}"><div class="summary-label"><span class="summary-symbol" aria-hidden="true">${item.icon}</span>${item.label}</div><strong>${money(item.amount)}</strong><div class="summary-foot">${selectedMonth === 'all' ? 'Acumulado geral' : 'No mês selecionado'}</div></article>`).join('');

  const section = currentSection === 'total' ? null : GROUPS[currentSection];
  $('#topbar-eyebrow').textContent = currentSection === 'total' ? 'VISÃO GERAL' : `CATEGORIA · ${section.label.toLocaleUpperCase('pt-BR')}`;
  $('#section-eyebrow').textContent = currentSection === 'total' ? 'SEU RESUMO' : 'RESUMO DA CATEGORIA';
  $('#section-title').textContent = currentSection === 'total' ? 'Todos os gastos' : `Gastos com ${section.label.toLocaleLowerCase('pt-BR')}`;
  $('#section-description').textContent = currentSection === 'total' ? 'Acompanhe suas despesas por categoria.' : `Veja os lançamentos e os tipos de gasto de ${section.label.toLocaleLowerCase('pt-BR')}.`;
  const visibleExpenses = getVisibleExpenses();
  $('#section-total-label').textContent = currentSection === 'total' ? 'Total no período' : `Total em ${section.label.toLocaleLowerCase('pt-BR')}`;
  $('#section-total-value').textContent = money(sumExpenses(visibleExpenses));
  $('#chart-title').textContent = currentSection === 'total' ? 'Distribuição dos gastos' : `Gastos com ${section.label.toLocaleLowerCase('pt-BR')}`;
  $('#chart-subtitle').textContent = currentSection === 'total' ? 'Por categoria principal' : 'Por tipo de gasto';
  $('#breakdown-title').textContent = currentSection === 'total' ? 'Resumo por categoria' : 'Resumo por tipo';
  $('#transactions-caption').textContent = currentSection === 'total' ? 'Todas as categorias' : `Categoria: ${section.label}`;
  $('#transaction-count').textContent = `${visibleExpenses.length} ${visibleExpenses.length === 1 ? 'lançamento' : 'lançamentos'}`;

  renderChart(visibleExpenses);
  renderBreakdown(visibleExpenses);
  renderExpenseList(visibleExpenses);
  renderNavigation();
}

function getChartSegments(expenses) {
  if (currentSection === 'total') {
    return Object.entries(GROUPS).map(([key, group]) => ({ label: group.label, color: group.color, amount: sumExpenses(expenses.filter((item) => item.group === key)) })).filter((item) => item.amount > 0);
  }
  const group = GROUPS[currentSection];
  return group.types.map((type, index) => ({ label: type, color: PALETTE[index % PALETTE.length], amount: sumExpenses(expenses.filter((item) => item.type === type)) })).filter((item) => item.amount > 0);
}

function renderChart(expenses) {
  const canvas = $('#expense-chart');
  const ctx = canvas.getContext('2d');
  const segments = getChartSegments(expenses);
  const total = segments.reduce((sum, item) => sum + item.amount, 0);
  const cssWidth = Math.max(220, canvas.clientWidth || 260);
  const cssHeight = window.innerWidth <= 760 ? 195 : 225;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  canvas.style.height = `${cssHeight}px`;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  const centerX = cssWidth / 2;
  const centerY = cssHeight / 2;
  const radius = Math.min(cssWidth * .39, cssHeight * .43);

  if (!total) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#edf2ee';
    ctx.fill();
    $('#chart-empty').hidden = false;
  } else {
    $('#chart-empty').hidden = true;
    let angle = -Math.PI / 2;
    segments.forEach((segment) => {
      const slice = (segment.amount / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      angle += slice;
    });
  }
  $('#chart-legend').innerHTML = segments.length ? segments.map((item) => `<div class="legend-item"><span class="legend-dot" style="background:${item.color}"></span><span class="legend-name">${escapeHtml(item.label)}</span><strong class="legend-value">${money(item.amount)}</strong></div>`).join('') : '<div class="empty-state">Nenhum gasto para exibir no gráfico.</div>';
}

function renderBreakdown(expenses) {
  let rows;
  if (currentSection === 'total') {
    rows = Object.entries(GROUPS).map(([key, group]) => ({ label: group.label, icon: group.icon, color: group.color, amount: sumExpenses(expenses.filter((item) => item.group === key)) }));
  } else {
    const group = GROUPS[currentSection];
    rows = group.types.map((type, index) => ({ label: type, icon: '•', color: PALETTE[index % PALETTE.length], amount: sumExpenses(expenses.filter((item) => item.type === type)) }));
  }
  const total = sumExpenses(expenses);
  $('#category-breakdown').innerHTML = rows.map((item) => {
    const percent = total > 0 ? (item.amount / total) * 100 : 0;
    return `<div class="breakdown-row"><div class="breakdown-top"><span class="breakdown-name"><span aria-hidden="true">${item.icon}</span>${escapeHtml(item.label)}</span><strong class="breakdown-value">${money(item.amount)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${percent.toFixed(2)}%;background:${item.color}"></div></div></div>`;
  }).join('');
}

function renderExpenseList(expenses) {
  const sorted = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  if (!sorted.length) {
    $('#expense-list').innerHTML = '<div class="empty-state"><strong>Nenhum gasto registrado por aqui.</strong>Toque em “Novo gasto” para adicionar seu primeiro lançamento.</div>';
    return;
  }
  $('#expense-list').innerHTML = sorted.map((item) => {
    const group = GROUPS[item.group] || GROUPS.casa;
    const installmentText = item.installments > 1 ? ` · ${item.installments} parcelas informadas` : '';
    return `<div class="expense-row"><div class="expense-main"><div class="expense-symbol" aria-hidden="true">${group.icon}</div><div class="expense-main-copy"><strong>${escapeHtml(item.description)}</strong><span>${escapeHtml(group.label)} · ${escapeHtml(item.type)}${installmentText}</span></div></div><span class="expense-meta">${escapeHtml(item.type)}</span><span class="expense-date">${formatDate(item.date)}</span><strong class="expense-value">${money(item.amount)}</strong><button class="delete-expense" type="button" data-delete="${escapeHtml(item.id)}" aria-label="Excluir gasto ${escapeHtml(item.description)}" title="Excluir">×</button></div>`;
  }).join('');
}

function updateTypeOptions(preferredType = '') {
  const groupKey = $('#expense-group').value;
  const types = GROUPS[groupKey]?.types || [];
  $('#expense-type').innerHTML = types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
  if (types.includes(preferredType)) $('#expense-type').value = preferredType;
  $('#installments-field').hidden = $('#expense-type').value !== 'Compra parcelada';
}

function openExpenseModal() {
  const form = $('#expense-form');
  form.reset();
  $('#expense-message').textContent = '';
  const groupKey = currentSection === 'total' ? 'cartao' : currentSection;
  $('#expense-group').innerHTML = Object.entries(GROUPS).map(([key, group]) => `<option value="${key}">${group.icon} ${group.label}</option>`).join('');
  $('#expense-group').value = groupKey;
  updateTypeOptions();
  $('#expense-date').value = localDateString();
  $('#expense-installments').value = '1';
  expenseModal.hidden = false;
  setTimeout(() => $('#expense-description').focus(), 30);
}

function closeExpenseModal() {
  expenseModal.hidden = true;
  $('#expense-message').textContent = '';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  authMessage.textContent = '';
  const email = $('#auth-email').value.trim().toLowerCase();
  const password = $('#auth-password').value;
  const name = $('#auth-name').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authMessage.textContent = 'Digite um endereço de e-mail válido.';
    return;
  }
  if (password.length < 8) {
    authMessage.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }
  const submit = $('#auth-submit');
  submit.disabled = true;
  submit.textContent = authMode === 'register' ? 'Criando conta...' : 'Verificando...';
  try {
    const accounts = loadAccounts();
    if (authMode === 'register') {
      if (!name) throw new Error('Informe seu nome.');
      if (accounts[email]) throw new Error('Já existe uma conta com este e-mail neste dispositivo.');
      const credentials = await hashPassword(password);
      accounts[email] = { name, salt: credentials.salt, passwordHash: credentials.hash, expenses: [], createdAt: Date.now() };
      if (!saveAccounts(accounts)) throw new Error('Não foi possível salvar a conta neste dispositivo.');
      localStorage.setItem(SESSION_KEY, email);
      showApp(email);
    } else {
      const account = accounts[email];
      if (!account) throw new Error('Conta não encontrada neste dispositivo. Confira o e-mail ou crie uma conta.');
      const credentials = await hashPassword(password, account.salt);
      if (credentials.hash !== account.passwordHash) throw new Error('Senha incorreta. Tente novamente.');
      localStorage.setItem(SESSION_KEY, email);
      showApp(email);
    }
  } catch (error) {
    authMessage.textContent = error.message || 'Não foi possível concluir o acesso.';
  } finally {
    submit.disabled = false;
    submit.textContent = authMode === 'register' ? 'Criar minha conta' : 'Entrar';
  }
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const message = $('#expense-message');
  message.textContent = '';
  const group = $('#expense-group').value;
  const type = $('#expense-type').value;
  const description = $('#expense-description').value.trim();
  const amount = Number($('#expense-amount').value);
  const date = $('#expense-date').value;
  const installments = type === 'Compra parcelada' ? Number($('#expense-installments').value) : 1;
  if (!GROUPS[group] || !GROUPS[group].types.includes(type)) return message.textContent = 'Selecione uma categoria e um tipo de gasto válidos.';
  if (!description) return message.textContent = 'Preencha a descrição do gasto.';
  if (!Number.isFinite(amount) || amount <= 0) return message.textContent = 'Informe um valor maior que zero.';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return message.textContent = 'Selecione uma data válida.';
  if (type === 'Compra parcelada' && (!Number.isInteger(installments) || installments < 1 || installments > 120)) return message.textContent = 'Informe uma quantidade de parcelas entre 1 e 120.';

  const expense = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`, group, type, description, amount: Math.round(amount * 100) / 100, date, installments, createdAt: Date.now() };
  const saved = updateCurrentAccount((account) => {
    if (!Array.isArray(account.expenses)) account.expenses = [];
    account.expenses.push(expense);
  });
  if (!saved) {
    message.textContent = 'Não foi possível salvar o lançamento. Tente novamente.';
    return;
  }
  selectedMonth = date.slice(0, 7);
  closeExpenseModal();
  renderMonthOptions();
  renderApp();
  showToast('Gasto salvo com sucesso!');
}

function deleteExpense(id) {
  const account = getCurrentAccount();
  const expense = account?.expenses?.find((item) => item.id === id);
  if (!expense) return;
  const confirmed = window.confirm(`Excluir o lançamento “${expense.description}”?`);
  if (!confirmed) return;
  const saved = updateCurrentAccount((current) => { current.expenses = current.expenses.filter((item) => item.id !== id); });
  if (saved) {
    renderMonthOptions();
    renderApp();
    showToast('Lançamento excluído.');
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  showAuth();
  authForm.reset();
  setAuthMode('login');
  showToast('Você saiu da sua conta. Seus lançamentos continuam salvos neste dispositivo.');
}

function initEvents() {
  $('#login-tab').addEventListener('click', () => setAuthMode('login'));
  $('#register-tab').addEventListener('click', () => setAuthMode('register'));
  authForm.addEventListener('submit', handleAuthSubmit);
  $('#desktop-nav').addEventListener('click', handleNavigationClick);
  $('#mobile-nav').addEventListener('click', handleNavigationClick);
  $('#month-filter').addEventListener('change', (event) => { selectedMonth = event.target.value; renderApp(); });
  $('#add-expense-button').addEventListener('click', openExpenseModal);
  $('#close-modal').addEventListener('click', closeExpenseModal);
  $('#cancel-modal').addEventListener('click', closeExpenseModal);
  $('#expense-form').addEventListener('submit', handleExpenseSubmit);
  $('#expense-group').addEventListener('change', () => updateTypeOptions());
  $('#expense-type').addEventListener('change', () => { $('#installments-field').hidden = $('#expense-type').value !== 'Compra parcelada'; });
  $('#expense-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete]');
    if (button) deleteExpense(button.dataset.delete);
  });
  $('#logout-button').addEventListener('click', logout);
  expenseModal.addEventListener('click', (event) => { if (event.target === expenseModal) closeExpenseModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !expenseModal.hidden) closeExpenseModal(); });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!appView.hidden) renderChart(getVisibleExpenses()); }, 120); });
}

function handleNavigationClick(event) {
  const button = event.target.closest('[data-section]');
  if (!button) return;
  currentSection = button.dataset.section;
  renderApp();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => console.warn('Service worker não registrado:', error));
    });
  }
}

function boot() {
  initEvents();
  registerServiceWorker();
  const savedEmail = localStorage.getItem(SESSION_KEY);
  if (savedEmail && loadAccounts()[savedEmail]) {
    showApp(savedEmail);
  } else {
    localStorage.removeItem(SESSION_KEY);
    showAuth();
  }
}

boot();
