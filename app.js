const STORAGE_KEY = 'meu-superdia.v1';

const starterState = {
  version: 2,
  profileComplete: false,
  child: { name: 'Clara', age: 8, avatar: '🦊' },
  parentPin: '',
  points: 0,
  tasks: [
    { id: 'arrumar-cama', title: 'Arrumar a cama', icon: '🛏️', category: 'Meu quarto', points: 10, status: 'open' },
    { id: 'escovar-dentes', title: 'Escovar os dentes', icon: '🪥', category: 'Cuidar de mim', points: 10, status: 'open' },
    { id: 'organizar-mochila', title: 'Organizar a mochila', icon: '🎒', category: 'Escola', points: 20, status: 'open' },
    { id: 'guardar-prato', title: 'Levar o prato para a pia', icon: '🍽️', category: 'Ajudar em casa', points: 10, status: 'open' },
  ],
  rewards: [
    { id: 'escolher-filme', title: 'Escolher o filme da família', icon: '🎬', cost: 25, status: 'available' },
    { id: 'brincadeira-especial', title: '30 minutos de brincadeira especial', icon: '🧩', cost: 40, status: 'available' },
    { id: 'sobremesa-domingo', title: 'Escolher a sobremesa de domingo', icon: '🍓', cost: 60, status: 'available' },
    { id: 'passeio-parque', title: 'Escolher o passeio no parque', icon: '🌳', cost: 90, status: 'available' },
  ],
  history: [],
  lastRewardApproved: null,
};

const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
let state = loadState();
let currentView = state.profileComplete ? 'child' : 'onboarding';
let childTab = 'today';
let parentTab = 'approvals';
let modal = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return clone(starterState);
    if (stored.version === starterState.version) return stored;
    if (stored.version === 1) {
      return {
        ...stored,
        version: starterState.version,
        profileComplete: true,
        child: {
          ...stored.child,
          name: stored.child?.name === 'Lulu' ? 'Clara' : (stored.child?.name || 'Clara'),
        },
        parentPin: stored.parentPin || '2468',
      };
    }
    return clone(starterState);
  } catch {
    return clone(starterState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `tarefa-${Date.now()}`;
}

function render() {
  const screens = {
    onboarding: renderOnboarding,
    chooser: renderChooser,
    'parent-login': renderParentLogin,
    child: renderChild,
    parent: renderParent,
  };
  app.innerHTML = screens[currentView]();
  if (modal) renderModal();
}

function brand() {
  return `
    <div class="brand-mark" aria-label="Meu Superdia">
      <span class="brand-symbol" aria-hidden="true">★</span>
      <span>Meu Superdia</span>
    </div>`;
}

function renderOnboarding() {
  const ageOptions = Array.from({ length: 6 }, (_, index) => index + 5)
    .map((age) => `<option value="${age}" ${age === state.child.age ? 'selected' : ''}>${age} anos</option>`)
    .join('');
  const avatars = [
    ['🦊', 'Raposa'],
    ['🐰', 'Coelho'],
    ['🐼', 'Panda'],
    ['🦁', 'Leão'],
    ['🐨', 'Coala'],
    ['🦄', 'Unicórnio'],
  ];
  return `
    <div class="app-shell">
      <section class="onboarding-screen" aria-labelledby="onboarding-title">
        <div class="onboarding-intro">
          ${brand()}
          <p class="eyebrow">Primeiro acesso</p>
          <h1 id="onboarding-title">Vamos criar o perfil da criança.</h1>
          <p class="lead">O nome e as conquistas ficarão salvos neste tablet, inclusive quando estiver sem internet.</p>
          <div class="privacy-note">
            <strong>Cadastro familiar e privado</strong>
            <span>Sem anúncios, chat, compras ou envio de dados para terceiros.</span>
          </div>
        </div>
        <form id="onboarding-form" class="onboarding-card">
          <div class="field">
            <label for="child-name">Nome da criança</label>
            <input id="child-name" name="childName" value="${esc(state.child.name)}" minlength="2" maxlength="30" autocomplete="given-name" required>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="child-age">Idade</label>
              <select id="child-age" name="childAge">${ageOptions}</select>
            </div>
            <div class="field">
              <label for="child-avatar">Avatar</label>
              <select id="child-avatar" name="childAvatar">${avatars.map(([emoji, label]) => `<option value="${emoji}" ${emoji === state.child.avatar ? 'selected' : ''}>${emoji} ${label}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field">
            <label for="create-pin">Crie um PIN do responsável</label>
            <input id="create-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required>
            <span class="field-help">Use de 4 a 6 números que a criança não conheça.</span>
          </div>
          <div class="field">
            <label for="confirm-pin">Confirme o PIN</label>
            <input id="confirm-pin" name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required>
          </div>
          <p id="onboarding-error" class="error-message" role="alert"></p>
          <button class="primary-button onboarding-submit" type="submit">Começar</button>
        </form>
      </section>
    </div>`;
}

function renderChooser() {
  return `
    <div class="app-shell">
      <section class="mode-screen" aria-labelledby="mode-title">
        <div class="mode-copy">
          ${brand()}
          <p class="eyebrow">Pequenas ações, grandes conquistas</p>
          <h1 id="mode-title">Hoje é um ótimo dia para crescer.</h1>
          <div class="doodle-line" aria-hidden="true"></div>
          <p class="lead">Tarefas simples viram pontos. Pontos viram momentos especiais em família.</p>
        </div>
        <div class="mode-actions" aria-label="Escolha como entrar">
          <button class="mode-button child" data-action="enter-child">
            <span class="mode-emoji" aria-hidden="true">${state.child.avatar}</span>
            <span>
              <span class="mode-label">Sou criança</span>
              <span class="mode-helper">Ver minhas tarefas e recompensas</span>
            </span>
            <span class="mode-arrow" aria-hidden="true">→</span>
          </button>
          <button class="mode-button parent" data-action="open-parent-login">
            <span class="mode-emoji" aria-hidden="true">🔐</span>
            <span>
              <span class="mode-label">Área do responsável</span>
              <span class="mode-helper">Criar tarefas e aprovar conquistas</span>
            </span>
            <span class="mode-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>`;
}

function topbar({ parent = false } = {}) {
  return `
    <header class="topbar">
      ${brand()}
      <div class="top-actions">
        ${parent ? `<button class="ghost-button" data-action="view-as-child">Ver como ${esc(state.child.name)}</button>` : ''}
        <button class="ghost-button" data-action="switch-profile">Trocar perfil</button>
      </div>
    </header>`;
}

function renderParentLogin() {
  return `
    <div class="app-shell">
      <header class="topbar">
        ${brand()}
        <button class="ghost-button" data-action="switch-profile">Voltar</button>
      </header>
      <section class="login-card" aria-labelledby="login-title">
        <div class="login-lock" aria-hidden="true">🔐</div>
        <p class="eyebrow">Área protegida</p>
        <h1 id="login-title">Olá, responsável.</h1>
        <p class="lead">Digite seu PIN para aprovar tarefas e cuidar das recompensas.</p>
        <form id="parent-login-form">
          <div class="field">
            <label for="parent-pin">PIN do responsável</label>
            <input id="parent-pin" name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required>
          </div>
          <p id="pin-error" class="error-message" role="alert"></p>
          <button class="primary-button" type="submit">Entrar</button>
        </form>
        <p class="demo-note"><strong>Protótipo:</strong> use o PIN 2468. Em produção, ele será definido pelo responsável no primeiro acesso.</p>
      </section>
    </div>`;
}

function pointsStrip() {
  const nextReward = state.rewards
    .filter((reward) => reward.status === 'available' && reward.cost > state.points)
    .sort((a, b) => a.cost - b.cost)[0];
  const goal = nextReward
    ? `Faltam ${nextReward.cost - state.points} pontos para “${esc(nextReward.title)}”.`
    : 'Você já pode escolher uma recompensa!';
  return `
    <section class="points-strip" aria-label="Saldo de pontos">
      <span class="points-star" aria-hidden="true">★</span>
      <div>
        <span class="points-label">Meus pontos</span>
        <strong class="points-value" data-testid="points-balance">${state.points}</strong>
      </div>
      <span class="points-goal">${goal}</span>
    </section>`;
}

function renderChild() {
  const content = childTab === 'today'
    ? renderToday()
    : childTab === 'rewards'
      ? renderRewards()
      : renderChildProgress();
  return `
    <div class="app-shell">
      ${topbar()}
      <section class="hero-row">
        <div>
          <p class="eyebrow">Seu dia começa aqui</p>
          <h1>Olá, ${esc(state.child.name)}!</h1>
          <p class="lead">${state.child.age} anos · Escolha uma missão e faça no seu ritmo.</p>
        </div>
        <div class="avatar" aria-label="Avatar ${esc(state.child.name)}">${state.child.avatar}</div>
      </section>
      ${pointsStrip()}
      ${state.lastRewardApproved ? `
        <aside class="celebration-banner">
          <span class="celebration-icon" aria-hidden="true">🎉</span>
          <div><strong>Recompensa aprovada!</strong><span>${esc(state.lastRewardApproved)}</span></div>
        </aside>` : ''}
      ${content}
      ${renderChildNav()}
    </div>`;
}

function renderToday() {
  const remaining = state.tasks.filter((task) => task.status !== 'approved').length;
  return `
    <section aria-labelledby="today-title">
      <div class="section-heading">
        <div><p class="eyebrow">Missões de hoje</p><h2 id="today-title">Um passo de cada vez</h2></div>
        <p class="muted small">${remaining} ${remaining === 1 ? 'missão restante' : 'missões restantes'}</p>
      </div>
      <div class="task-list">
        ${state.tasks.map(renderTaskCard).join('')}
      </div>
    </section>`;
}

function renderTaskCard(task) {
  const status = task.status === 'pending'
    ? '<span class="status-pill pending">⌛ Esperando aprovação</span>'
    : task.status === 'approved'
      ? '<span class="status-pill approved">✓ Concluída</span>'
      : `<button class="task-action" data-action="request-task" data-id="${esc(task.id)}">Marcar como feita</button>`;
  return `
    <article class="task-card ${task.status}" data-testid="task-${esc(task.id)}">
      <div class="task-icon" aria-hidden="true">${task.icon}</div>
      <div class="task-main">
        <div class="task-title-row">
          <h3>${esc(task.title)}</h3>
          <span class="points-chip">+${task.points}</span>
        </div>
        <p class="task-meta">${esc(task.category)}</p>
        <div class="task-actions">
          ${status}
          <button class="speak-button" data-action="speak-task" data-id="${esc(task.id)}" aria-label="Ouvir tarefa: ${esc(task.title)}">🔊 Ouvir</button>
        </div>
      </div>
    </article>`;
}

function renderRewards() {
  return `
    <section aria-labelledby="rewards-title">
      <div class="section-heading">
        <div><p class="eyebrow">Loja de momentos</p><h2 id="rewards-title">Recompensas</h2></div>
        <p class="muted small">Sem dinheiro, só pontos.</p>
      </div>
      <div class="reward-grid">
        ${state.rewards.map(renderRewardCard).join('')}
      </div>
    </section>`;
}

function renderRewardCard(reward) {
  const canRequest = state.points >= reward.cost && reward.status === 'available';
  let button = `<button class="reward-action" data-action="request-reward" data-id="${esc(reward.id)}" ${canRequest ? '' : 'disabled'}>${canRequest ? 'Pedir recompensa' : `Faltam ${Math.max(0, reward.cost - state.points)} pontos`}</button>`;
  if (reward.status === 'pending') button = '<span class="status-pill pending">⌛ Pedido enviado</span>';
  if (reward.status === 'approved') button = '<span class="status-pill approved">✓ Aproveitada</span>';
  return `
    <article class="reward-card ${canRequest ? '' : 'locked'}" data-testid="reward-${esc(reward.id)}">
      <div class="reward-icon" aria-hidden="true">${reward.icon}</div>
      <h3>${esc(reward.title)}</h3>
      <p class="reward-cost">★ ${reward.cost} pontos</p>
      ${button}
    </article>`;
}

function renderChildProgress() {
  const completed = state.tasks.filter((task) => task.status === 'approved').length;
  const percent = state.tasks.length ? Math.round((completed / state.tasks.length) * 100) : 0;
  return `
    <section aria-labelledby="progress-title">
      <div class="section-heading"><div><p class="eyebrow">Minhas conquistas</p><h2 id="progress-title">Progresso</h2></div></div>
      <div class="parent-panel">
        <h3>Hoje</h3>
        <p class="lead">${completed} de ${state.tasks.length} missões concluídas.</p>
        <div class="progress-track" aria-label="${percent}% concluído"><div class="progress-fill" style="width:${percent}%"></div></div>
      </div>
      <div class="empty-state" style="margin-top:14px">
        <p class="eyebrow">Gentileza também conta</p>
        <h2>Crescer não é competir.</h2>
        <p class="muted">Seu progresso é comparado apenas com o seu próprio dia. Não há ranking entre crianças.</p>
      </div>
    </section>`;
}

function renderChildNav() {
  const items = [
    ['today', 'Hoje'],
    ['rewards', 'Recompensas'],
    ['progress', 'Progresso'],
  ];
  return `<nav class="bottom-nav" aria-label="Navegação da criança">${items.map(([id, label]) => `
    <button class="nav-button ${childTab === id ? 'active' : ''}" data-action="child-tab" data-tab="${id}" ${childTab === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>`;
}

function renderParent() {
  const pendingTasks = state.tasks.filter((task) => task.status === 'pending');
  const pendingRewards = state.rewards.filter((reward) => reward.status === 'pending');
  const completed = state.tasks.filter((task) => task.status === 'approved').length;
  return `
    <div class="app-shell">
      ${topbar({ parent: true })}
      <section class="hero-row">
        <div><p class="eyebrow">Visão do responsável</p><h1>Painel da família</h1><p class="lead">Acompanhe sem transformar cuidado em cobrança.</p></div>
        <button class="primary-button" data-action="open-task-modal">+ Nova tarefa</button>
      </section>
      <section class="parent-summary" aria-label="Resumo da família">
        <div class="summary-item"><strong class="summary-number">${state.points}</strong><span class="summary-label">pontos disponíveis</span></div>
        <div class="summary-item"><strong class="summary-number">${pendingTasks.length + pendingRewards.length}</strong><span class="summary-label">itens aguardando</span></div>
        <div class="summary-item"><strong class="summary-number">${completed}</strong><span class="summary-label">tarefas concluídas</span></div>
      </section>
      <nav class="parent-tabs" aria-label="Seções do painel">
        ${[['approvals', 'Aprovações'], ['tasks', 'Tarefas'], ['progress', 'Progresso'], ['settings', 'Segurança']].map(([id, label]) => `<button class="parent-tab ${parentTab === id ? 'active' : ''}" data-action="parent-tab" data-tab="${id}" ${parentTab === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}
      </nav>
      ${renderParentContent(pendingTasks, pendingRewards)}
    </div>`;
}

function renderParentContent(pendingTasks, pendingRewards) {
  if (parentTab === 'tasks') return renderTaskManagement();
  if (parentTab === 'progress') return renderParentProgress();
  if (parentTab === 'settings') return renderSettings();
  const hasPending = pendingTasks.length || pendingRewards.length;
  return `
    <section aria-labelledby="approvals-title">
      <div class="section-heading"><div><p class="eyebrow">Validação</p><h2 id="approvals-title">Aguardando você</h2></div></div>
      <div class="approval-list">
        ${hasPending ? '' : '<div class="empty-state"><h3>Tudo em dia</h3><p class="muted">Nenhuma tarefa ou recompensa aguardando aprovação.</p></div>'}
        ${pendingTasks.map(renderTaskApproval).join('')}
        ${pendingRewards.map(renderRewardApproval).join('')}
      </div>
    </section>`;
}

function renderTaskApproval(task) {
  return `
    <article class="approval-card" data-testid="approval-${esc(task.id)}">
      <div class="approval-head"><div><p class="eyebrow">Tarefa concluída</p><h3>${esc(task.title)}</h3><p class="muted small">${esc(state.child.name)} pediu a validação.</p></div><span class="points-chip">+${task.points}</span></div>
      <div class="approval-actions">
        <button class="approve-button" data-action="approve-task" data-id="${esc(task.id)}">Aprovar</button>
        <button class="reject-button" data-action="reject-task" data-id="${esc(task.id)}">Pedir para conferir</button>
      </div>
    </article>`;
}

function renderRewardApproval(reward) {
  return `
    <article class="approval-card" data-testid="reward-approval-${esc(reward.id)}">
      <div class="approval-head"><div><p class="eyebrow">Pedido de recompensa</p><h3>${esc(reward.title)}</h3><p class="muted small">Custa ${reward.cost} pontos.</p></div><span aria-hidden="true" style="font-size:2rem">${reward.icon}</span></div>
      <div class="approval-actions">
        <button class="approve-button" data-action="approve-reward" data-id="${esc(reward.id)}">Aprovar</button>
        <button class="reject-button" data-action="reject-reward" data-id="${esc(reward.id)}">Agora não</button>
      </div>
    </article>`;
}

function renderTaskManagement() {
  return `
    <section aria-labelledby="manage-title">
      <div class="section-heading"><div><p class="eyebrow">Rotina</p><h2 id="manage-title">Tarefas cadastradas</h2></div><button class="secondary-button" data-action="open-task-modal">Nova tarefa</button></div>
      <div class="approval-list">
        ${state.tasks.map((task) => `<article class="approval-card"><div class="approval-head"><div><h3>${task.icon} ${esc(task.title)}</h3><p class="muted small">${esc(task.category)} · ${task.points} pontos</p></div><span class="status-pill ${task.status === 'approved' ? 'approved' : task.status === 'pending' ? 'pending' : ''}">${task.status === 'approved' ? 'Concluída' : task.status === 'pending' ? 'Aguardando' : 'Disponível'}</span></div></article>`).join('')}
      </div>
    </section>`;
}

function renderParentProgress() {
  const approved = state.tasks.filter((task) => task.status === 'approved').length;
  const percent = state.tasks.length ? Math.round((approved / state.tasks.length) * 100) : 0;
  return `
    <section aria-labelledby="family-progress-title">
      <div class="section-heading"><div><p class="eyebrow">Acompanhamento leve</p><h2 id="family-progress-title">Progresso de ${esc(state.child.name)}</h2></div></div>
      <div class="parent-panel">
        <div class="week-row"><strong>Hoje</strong><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><span>${percent}%</span></div>
        <p class="muted small">O histórico registra apenas tarefas, pontos e recompensas neste aparelho.</p>
      </div>
      <div class="parent-panel" style="margin-top:14px">
        <h3>Últimos registros</h3>
        ${state.history.length ? `<ul>${state.history.slice(-5).reverse().map((item) => `<li>${esc(item.label)}</li>`).join('')}</ul>` : '<p class="muted">Ainda não há registros.</p>'}
      </div>
    </section>`;
}

function renderSettings() {
  return `
    <section aria-labelledby="settings-title">
      <div class="section-heading"><div><p class="eyebrow">Privacidade</p><h2 id="settings-title">Segurança</h2></div></div>
      <div class="parent-panel">
        <h3>Dados somente neste aparelho</h3>
        <p class="muted">O protótipo não envia nomes, tarefas ou hábitos para nenhum servidor.</p>
        <ul>
          <li>Sem anúncios ou rastreadores</li>
          <li>Sem chat ou contato com desconhecidos</li>
          <li>Sem compras ou dinheiro real</li>
          <li>Sem ranking público</li>
        </ul>
      </div>
      <div class="parent-panel" style="margin-top:14px">
        <h3>Restaurar demonstração</h3>
        <p class="muted">Apaga apenas os dados do Meu Superdia neste navegador.</p>
        <button class="danger-button" data-action="reset-app">Restaurar dados</button>
      </div>
    </section>`;
}

function renderModal() {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head"><div><p class="eyebrow">Nova rotina</p><h2 id="modal-title">Criar tarefa</h2></div><button class="icon-button" data-action="close-modal" aria-label="Fechar">×</button></div>
      <form id="task-form">
        <div class="field"><label for="task-title">Nome da tarefa</label><input id="task-title" name="title" maxlength="60" required placeholder="Ex.: Guardar os brinquedos"></div>
        <div class="form-row">
          <div class="field"><label for="task-points">Quantos pontos</label><input id="task-points" name="points" type="number" min="1" max="100" value="10" required></div>
          <div class="field"><label for="task-category">Categoria</label><select id="task-category" name="category"><option>Meu quarto</option><option>Cuidar de mim</option><option>Escola</option><option>Ajudar em casa</option><option>Gentileza</option></select></div>
        </div>
        <div class="field"><label for="task-icon">Símbolo</label><select id="task-icon" name="icon"><option>⭐</option><option>🧸</option><option>🧹</option><option>📚</option><option>🌱</option><option>🐾</option></select></div>
        <div class="form-actions"><button class="ghost-button" type="button" data-action="close-modal">Cancelar</button><button class="primary-button" type="submit">Salvar tarefa</button></div>
      </form>
    </section>`;
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => document.querySelector('#task-title')?.focus());
}

function showToast(message) {
  toastRegion.innerHTML = `<div class="toast" role="status">${esc(message)}</div>`;
  window.setTimeout(() => { toastRegion.innerHTML = ''; }, 2800);
}

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#f5b642', '#0f6b57', '#e66a4e', '#3b82a0'];
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement('span');
    piece.style.left = `${(i * 37) % 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${(i % 8) * 0.06}s`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1800);
}

function addHistory(label) {
  state.history.push({ label, at: new Date().toISOString() });
  state.history = state.history.slice(-50);
}

function updateTask(id, updater) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return null;
  updater(task);
  saveState();
  return task;
}

function updateReward(id, updater) {
  const reward = state.rewards.find((item) => item.id === id);
  if (!reward) return null;
  updater(reward);
  saveState();
  return reward;
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, id, tab } = target.dataset;

  if (action === 'enter-child' || action === 'view-as-child') {
    currentView = 'child';
    render();
  }
  if (action === 'open-parent-login') {
    currentView = 'parent-login';
    render();
    requestAnimationFrame(() => document.querySelector('#parent-pin')?.focus());
  }
  if (action === 'switch-profile') {
    currentView = 'chooser';
    modal = null;
    document.querySelector('.modal-backdrop')?.remove();
    render();
  }
  if (action === 'child-tab') {
    childTab = tab;
    render();
  }
  if (action === 'parent-tab') {
    parentTab = tab;
    render();
  }
  if (action === 'request-task') {
    const task = updateTask(id, (item) => { item.status = 'pending'; });
    if (task) {
      addHistory(`${state.child.name} concluiu “${task.title}” e pediu aprovação.`);
      saveState();
      render();
      showToast('Pedido enviado ao responsável.');
    }
  }
  if (action === 'approve-task') {
    const task = updateTask(id, (item) => {
      if (item.status !== 'pending') return;
      item.status = 'approved';
      state.points += item.points;
    });
    if (task) {
      addHistory(`“${task.title}” aprovada: +${task.points} pontos.`);
      saveState();
      render();
      confetti();
      showToast(`${task.points} pontos liberados.`);
    }
  }
  if (action === 'reject-task') {
    const task = updateTask(id, (item) => { item.status = 'open'; });
    render();
    showToast(task ? 'Tarefa devolvida para conferência.' : 'Tarefa não encontrada.');
  }
  if (action === 'speak-task') {
    const task = state.tasks.find((item) => item.id === id);
    if (task && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(task.title);
      speech.lang = 'pt-BR';
      speech.rate = 0.9;
      speechSynthesis.speak(speech);
    } else {
      showToast('A leitura em voz alta não está disponível neste aparelho.');
    }
  }
  if (action === 'request-reward') {
    const reward = state.rewards.find((item) => item.id === id);
    if (!reward || reward.status !== 'available' || state.points < reward.cost) return;
    reward.status = 'pending';
    addHistory(`${state.child.name} pediu a recompensa “${reward.title}”.`);
    saveState();
    render();
    showToast('Pedido enviado ao responsável.');
  }
  if (action === 'approve-reward') {
    const reward = state.rewards.find((item) => item.id === id);
    if (!reward || reward.status !== 'pending' || state.points < reward.cost) return;
    reward.status = 'approved';
    state.points -= reward.cost;
    state.lastRewardApproved = reward.title;
    addHistory(`Recompensa “${reward.title}” aprovada: -${reward.cost} pontos.`);
    saveState();
    render();
    confetti();
    showToast('Recompensa aprovada.');
  }
  if (action === 'reject-reward') {
    const reward = updateReward(id, (item) => { item.status = 'available'; });
    render();
    showToast(reward ? 'Recompensa devolvida para a loja.' : 'Recompensa não encontrada.');
  }
  if (action === 'open-task-modal') {
    modal = 'task';
    renderModal();
  }
  if (action === 'close-modal') {
    modal = null;
    document.querySelector('.modal-backdrop')?.remove();
  }
  if (action === 'reset-app') {
    state = clone(starterState);
    saveState();
    currentView = 'onboarding';
    parentTab = 'approvals';
    render();
    showToast('Cadastro local apagado.');
  }
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'onboarding-form') {
    const form = new FormData(event.target);
    const childName = String(form.get('childName') || '').trim();
    const childAge = Number(form.get('childAge'));
    const childAvatar = String(form.get('childAvatar') || '🦊');
    const pin = String(form.get('pin') || '');
    const confirmPin = String(form.get('confirmPin') || '');
    const error = document.querySelector('#onboarding-error');

    if (childName.length < 2 || childName.length > 30) {
      error.textContent = 'Digite um nome com 2 a 30 caracteres.';
      return;
    }
    if (!Number.isInteger(childAge) || childAge < 5 || childAge > 10) {
      error.textContent = 'Escolha uma idade entre 5 e 10 anos.';
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      error.textContent = 'O PIN deve ter de 4 a 6 números.';
      return;
    }
    if (pin !== confirmPin) {
      error.textContent = 'Os dois PINs precisam ser iguais.';
      return;
    }

    state.child = { name: childName, age: childAge, avatar: childAvatar };
    state.parentPin = pin;
    state.profileComplete = true;
    addHistory(`Perfil de ${childName} criado neste aparelho.`);
    saveState();
    currentView = 'child';
    childTab = 'today';
    render();
    showToast(`Perfil de ${childName} salvo neste tablet.`);
    return;
  }
  if (event.target.id === 'parent-login-form') {
    const form = new FormData(event.target);
    if (form.get('pin') !== state.parentPin) {
      document.querySelector('#pin-error').textContent = 'PIN incorreto. Tente novamente.';
      return;
    }
    currentView = 'parent';
    parentTab = 'approvals';
    render();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'task-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const title = String(form.get('title') || '').trim();
  const points = Number(form.get('points'));
  if (!title || !Number.isFinite(points) || points < 1 || points > 100) return;
  const baseId = slugify(title);
  let id = baseId;
  let suffix = 2;
  while (state.tasks.some((task) => task.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  state.tasks.push({
    id,
    title,
    icon: String(form.get('icon') || '⭐'),
    category: String(form.get('category') || 'Ajudar em casa'),
    points: Math.round(points),
    status: 'open',
  });
  addHistory(`Tarefa “${title}” criada pelo responsável.`);
  saveState();
  modal = null;
  document.querySelector('.modal-backdrop')?.remove();
  render();
  showToast('Tarefa criada.');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal) {
    modal = null;
    document.querySelector('.modal-backdrop')?.remove();
  }
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

render();
