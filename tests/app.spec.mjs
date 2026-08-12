import { test, expect } from '@playwright/test';

async function resetApp(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  });
  await page.reload();
}

async function registerFamily(page, childName = 'Clara') {
  await expect(page.getByRole('heading', { name: /criar o perfil da criança/i })).toBeVisible();
  await page.getByLabel(/nome da criança/i).fill(childName);
  await page.getByLabel(/idade/i).selectOption('8');
  await page.getByLabel(/avatar/i).selectOption('🦊');
  await page.getByLabel(/^crie um pin/i).fill('2468');
  await page.getByLabel(/confirme o pin/i).fill('2468');
  await page.getByRole('button', { name: /começar/i }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`olá, ${childName}`, 'i') })).toBeVisible();
}

async function openFreshApp(page, childName = 'Clara') {
  await resetApp(page);
  await registerFamily(page, childName);
}

async function enterParentMode(page) {
  await page.getByRole('button', { name: /trocar perfil/i }).click();
  await page.getByRole('button', { name: /área do responsável/i }).click();
  await page.getByLabel(/pin do responsável/i).fill('2468');
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await expect(page.getByRole('heading', { name: /painel da família/i })).toBeVisible();
}

test('cadastro permite configurar Clara e permanece após fechar e abrir', async ({ page }) => {
  await resetApp(page);
  await registerFamily(page, 'Clara');
  await page.reload();
  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
  await expect(page.getByText(/8 anos/i)).toBeVisible();
});

test('atualização preserva o cadastro e os pontos existentes da Clara', async ({ page }) => {
  await openFreshApp(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('meu-superdia.v1'));
    stored.version = 2;
    stored.points = 30;
    delete stored.gamePasses;
    delete stored.gameStats;
    localStorage.setItem('meu-superdia.v1', JSON.stringify(stored));
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
  await expect(page.getByTestId('points-balance')).toHaveText('30');
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
});

test('estado versão 3 sem estatística de padrões é normalizado ao carregar', async ({ page }) => {
  await openFreshApp(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('meu-superdia.v1'));
    delete stored.gameStats.patternGames;
    localStorage.setItem('meu-superdia.v1', JSON.stringify(stored));
  });

  await page.reload();

  const patternGames = await page.evaluate(() => (
    JSON.parse(localStorage.getItem('meu-superdia.v1')).gameStats.patternGames
  ));
  expect(patternGames).toBe(0);
  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
});

test('rotina inicial cobre manhã, tarde e noite com quinze tarefas', async ({ page }) => {
  await openFreshApp(page);

  await expect(page.getByRole('heading', { name: 'Manhã', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tarde', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Noite', exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="task-"]')).toHaveCount(15);
  await expect(page.locator('.day-period.morning [data-testid^="task-"]')).toHaveCount(5);
  await expect(page.locator('.day-period.afternoon [data-testid^="task-"]')).toHaveCount(5);
  await expect(page.locator('.day-period.night [data-testid^="task-"]')).toHaveCount(5);
  await expect(page.getByTestId('task-tomar-cafe-da-manha')).toContainText(/tomar o café da manhã/i);
  await expect(page.getByTestId('task-fazer-a-licao')).toContainText(/fazer a lição/i);
  await expect(page.getByTestId('task-separar-roupa-de-amanha')).toContainText(/separar a roupa de amanhã/i);
  await expect(page.getByText(/15 missões restantes/i)).toBeVisible();
});

test('atualização acrescenta novas tarefas sem apagar progresso nem tarefas personalizadas', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /nova tarefa/i }).first().click();
  await page.getByLabel(/nome da tarefa/i).fill('Regar minha plantinha');
  await page.getByRole('button', { name: /salvar tarefa/i }).click();
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('meu-superdia.v1'));
    stored.version = 3;
    stored.tasks = stored.tasks.filter((task) => ['arrumar-cama', 'escovar-dentes', 'organizar-mochila', 'guardar-prato', 'regar-minha-plantinha'].includes(task.id));
    delete stored.tasks.find((task) => task.id === 'regar-minha-plantinha').period;
    localStorage.setItem('meu-superdia.v1', JSON.stringify(stored));
  });

  await page.reload();

  await expect(page.getByTestId('points-balance')).toHaveText('10');
  await expect(page.getByTestId('task-arrumar-cama')).toContainText(/concluída/i);
  await expect(page.getByTestId('task-regar-minha-plantinha')).toBeVisible();
  await expect(page.locator('[data-testid^="task-"]')).toHaveCount(16);
  await expect(page.getByRole('heading', { name: /qualquer hora/i })).toBeVisible();
});

test('migração preserva tarefa personalizada que colide com uma nova tarefa padrão', async ({ page }) => {
  await openFreshApp(page);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('meu-superdia.v1'));
    stored.version = 3;
    stored.points = 37;
    stored.gamePasses = 2;
    stored.tasks = stored.tasks.filter((task) => ['arrumar-cama', 'escovar-dentes', 'organizar-mochila', 'guardar-prato'].includes(task.id));
    stored.tasks.push({ id: 'tomar-banho', title: 'Tomar banho', icon: '⭐', category: 'Missão da família', points: 33, status: 'approved' });
    stored.history.push({ label: 'Tarefa personalizada “Tomar banho” concluída.', at: '2026-08-10T12:00:00.000Z' });
    localStorage.setItem('meu-superdia.v1', JSON.stringify(stored));
  });

  await page.reload();

  const bathTasks = page.getByRole('heading', { name: 'Tomar banho', exact: true });
  await expect(bathTasks).toHaveCount(2);
  const custom = page.locator('.day-period.anytime').getByText('Tomar banho', { exact: true });
  await expect(custom).toBeVisible();
  await expect(page.locator('.day-period.night').getByText('Tomar banho', { exact: true })).toBeVisible();
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('meu-superdia.v1')));
  const customTask = migrated.tasks.find((task) => task.title === 'Tomar banho' && task.points === 33);
  expect(customTask.id).not.toBe('tomar-banho');
  expect(customTask.period).toBe('anytime');
  expect(customTask.status).toBe('approved');
  expect(migrated.history.some((entry) => entry.label.includes('personalizada'))).toBe(true);
  expect(migrated.points).toBe(37);
  expect(migrated.gamePasses).toBe(2);
});

test('criança solicita aprovação e só recebe pontos após validação do responsável', async ({ page }) => {
  await openFreshApp(page);

  await expect(page.getByTestId('points-balance')).toHaveText('0');
  const task = page.getByTestId('task-arrumar-cama');
  await task.getByRole('button', { name: /marcar como feita/i }).click();
  await expect(task).toContainText(/esperando aprovação/i);
  await expect(page.getByTestId('points-balance')).toHaveText('0');

  await enterParentMode(page);
  await expect(page.getByText(/arrumar a cama/i).first()).toBeVisible();
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();

  await page.getByRole('button', { name: /ver como clara/i }).click();
  await expect(page.getByTestId('points-balance')).toHaveText('10');
  await expect(page.getByTestId('task-arrumar-cama')).toContainText(/concluída/i);
});

test('aprovar uma tarefa libera e consome um passe para jogar', async ({ page }) => {
  await openFreshApp(page);

  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
  await expect(page.getByRole('button', { name: /jogar caça-estrelas/i })).toBeDisabled();

  await page.getByRole('button', { name: /^hoje$/i }).click();
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();

  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('1');
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
  await expect(page.getByRole('heading', { name: /caça-estrelas/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /navegação da criança/i })).toBeHidden();
  await expect(page.getByRole('button', { name: /voltar aos jogos/i })).toBeVisible();
});

test('caça-estrelas começa com três fases e contagem regressiva', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  await expect(page.getByText(/fase 1 de 3/i)).toBeVisible();
  await expect(page.getByText(/sequência alvo/i)).toBeVisible();
  await expect(page.locator('.sky-item.target')).toHaveCount(0);
  const initialTime = Number(await page.getByTestId('star-time').textContent());
  await expect.poll(async () => Number(await page.getByTestId('star-time').textContent())).toBeLessThan(initialTime);
});

test('caça-estrelas penaliza escolhas fora da sequência', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  const timeBefore = Number(await page.getByTestId('star-time').textContent());
  await page.getByRole('button', { name: 'Escolher 🌙' }).first().click();

  await expect(page.getByTestId('star-mistakes')).toHaveText('1');
  await expect.poll(async () => Number(await page.getByTestId('star-time').textContent())).toBeLessThanOrEqual(timeBefore - 3);
  await expect(page.getByTestId('star-target')).toHaveText('⭐');
});

test('caça-estrelas permite repetir a fase quando o tempo acaba', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.clock.install();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  await page.clock.runFor(36_000);

  await expect(page.getByRole('heading', { name: /tempo esgotado/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /tentar a fase de novo/i })).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');

  await page.getByRole('button', { name: /tentar a fase de novo/i }).click();
  await expect(page.getByText(/fase 1 de 3/i)).toBeVisible();
  await expect(page.getByTestId('star-time')).toHaveText('35');
});

test('penalidade que zera o relógio encerra a fase imediatamente', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.clock.install();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();
  await page.clock.runFor(34_000);
  await expect(page.getByTestId('star-time')).toHaveText('1');

  await page.getByRole('button', { name: 'Escolher 🌙', exact: true }).first().click();

  expect(await page.getByRole('heading', { name: /tempo esgotado/i }).count()).toBe(1);
  expect(await page.getByText(/fase 1 de 3/i).count()).toBeGreaterThan(0);
  expect(await page.getByRole('button', { name: /tentar a fase de novo/i }).count()).toBe(1);
});

test('caça-estrelas avança de fase ao completar a sequência', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  for (const symbol of ['⭐', '🌟', '⭐']) {
    await page.locator(`button[aria-label="Escolher ${symbol}"]:not([disabled])`).first().click();
  }

  await expect(page.getByText(/fase 2 de 3/i)).toBeVisible();
  await expect(page.getByTestId('star-target')).toHaveText('✨');
  await expect(page.getByTestId('star-time')).toHaveText('30');
});

test('caça-estrelas termina com uma conquista visível', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  for (const sequence of [
    ['⭐', '🌟', '⭐'],
    ['✨', '🌟', '💫', '✨'],
    ['⭐', '✨', '🌟', '💫', '⭐'],
  ]) {
    for (const symbol of sequence) {
      await page.locator(`button[aria-label="Escolher ${symbol}"]:not([disabled])`).first().click();
    }
  }

  await expect(page.getByRole('heading', { name: /partida concluída/i })).toBeVisible();
  await expect(page.getByText(/completou as três fases/i)).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
});

test('passes acumulam e liberam o jogo da memória', async ({ page }) => {
  await openFreshApp(page);

  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }
  await enterParentMode(page);
  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();

  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('2');
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('1');
  await expect(page.getByRole('heading', { name: /memória dos animais/i })).toBeVisible();
});

test('memória começa mostrando as cartas e o limite de jogadas', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();

  await expect(page.getByText(/fase 1 de 3/i)).toBeVisible();
  await expect(page.getByText(/memorize as posições/i)).toBeVisible();
  await expect(page.getByTestId('memory-moves')).toHaveText('0/10');
  await expect(page.getByRole('button', { name: /esconder cartas e começar/i })).toBeVisible();

  await page.getByRole('button', { name: /esconder cartas e começar/i }).click();
  await expect(page.getByRole('button', { name: /carta fechada/i })).toHaveCount(8);
});

test('memória aumenta para seis pares na segunda fase', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await page.getByRole('button', { name: /esconder cartas e começar/i }).click();

  for (const [first, second] of [[0, 6], [1, 4], [2, 7], [3, 5]]) {
    await page.getByTestId(`memory-card-${first}`).click();
    await page.getByTestId(`memory-card-${second}`).click();
  }

  await expect(page.getByText(/fase 2 de 3/i)).toBeVisible();
  await expect(page.getByTestId('memory-moves')).toHaveText('0/18');
  await expect(page.locator('[data-testid^="memory-card-"]')).toHaveCount(12);
  await expect(page.getByRole('button', { name: /esconder cartas e começar/i })).toBeVisible();
});

test('memória permite repetir a fase ao atingir o limite de jogadas', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.clock.install();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await page.getByRole('button', { name: /esconder cartas e começar/i }).click();

  for (let move = 0; move < 9; move += 1) {
    await page.getByTestId('memory-card-0').click();
    await page.getByTestId('memory-card-1').click();
    await page.clock.runFor(700);
  }
  await page.getByTestId('memory-card-0').click();
  await page.getByTestId('memory-card-6').click();

  await expect(page.getByRole('heading', { name: /limite de jogadas/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /tentar a fase novamente/i })).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');

  await page.getByRole('button', { name: /tentar a fase novamente/i }).click();
  await expect(page.getByText(/memorize as posições/i)).toBeVisible();
  await expect(page.getByTestId('memory-moves')).toHaveText('0/10');
});

test('callback antigo da memória não altera uma nova partida', async ({ page }) => {
  await openFreshApp(page);
  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }
  await enterParentMode(page);
  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.clock.install();
  await page.getByRole('button', { name: /^jogos$/i }).click();

  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await page.getByRole('button', { name: /esconder cartas e começar/i }).click();
  await page.getByTestId('memory-card-0').click();
  await page.getByTestId('memory-card-1').click();
  await page.getByRole('button', { name: /voltar aos jogos/i }).click();

  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await page.getByRole('button', { name: /esconder cartas e começar/i }).click();
  await page.getByTestId('memory-card-0').click();
  await page.clock.runFor(700);

  expect(await page.getByTestId('memory-card-0').textContent()).toBe('🐶');
  await expect(page.getByTestId('memory-card-0')).toHaveAttribute('aria-label', 'Carta 🐶');
});

test('memória dos animais termina após três fases progressivas', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();

  const levelPairs = [
    [[0, 6], [1, 4], [2, 7], [3, 5]],
    [[0, 8], [1, 6], [2, 11], [3, 10], [4, 9], [5, 7]],
    [[0, 9], [1, 14], [2, 7], [3, 12], [4, 11], [5, 15], [6, 10], [8, 13]],
  ];

  for (const pairs of levelPairs) {
    await page.getByRole('button', { name: /esconder cartas e começar/i }).click();
    for (const [first, second] of pairs) {
      await page.getByTestId(`memory-card-${first}`).click();
      await page.getByTestId(`memory-card-${second}`).click();
    }
  }

  await expect(page.getByRole('heading', { name: /partida concluída/i })).toBeVisible();
  await expect(page.getByText(/18 pares em três fases/i)).toBeVisible();
});

test('laboratório de padrões consome um passe e abre seis desafios', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();

  await expect(page.getByRole('button', { name: /jogar laboratório de padrões/i })).toBeVisible();
  await page.getByRole('button', { name: /jogar laboratório de padrões/i }).click();

  await expect(page.getByRole('heading', { name: /laboratório de padrões/i })).toBeVisible();
  await expect(page.getByText(/desafio 1 de 6/i)).toBeVisible();
  await expect(page.getByTestId('pattern-lives')).toHaveText('3');
  await expect(page.getByTestId('game-passes')).toHaveText('0');
});

test('laboratório de padrões perde uma vida e mantém o desafio após um erro', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar laboratório de padrões/i }).click();

  await page.getByRole('button', { name: 'Escolher 🐱' }).click();

  await expect(page.getByTestId('pattern-lives')).toHaveText('2');
  await expect(page.getByText(/desafio 1 de 6/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escolher 🐱' })).toBeDisabled();
});

test('laboratório de padrões conclui os seis desafios progressivos', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar laboratório de padrões/i }).click();

  for (const answer of ['🐶', '🍓', '⭐', '8', '▲▲▲▲', '14']) {
    await page.getByRole('button', { name: `Escolher ${answer}`, exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: /partida concluída/i })).toBeVisible();
  await expect(page.getByText(/seis padrões/i)).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
});

test('laboratório de padrões permite recomeçar ao perder as três vidas', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar laboratório de padrões/i }).click();

  await page.getByRole('button', { name: 'Escolher 🐱', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher 🦊', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher 🐶', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher 🍌', exact: true }).click();

  await expect(page.getByRole('heading', { name: /desafio pausado/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /recomeçar laboratório/i })).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');

  await page.getByRole('button', { name: /recomeçar laboratório/i }).click();
  await expect(page.getByText(/desafio 1 de 6/i)).toBeVisible();
  await expect(page.getByTestId('pattern-lives')).toHaveText('3');
});

test('responsável cria uma tarefa para um período específico do dia', async ({ page }) => {
  await openFreshApp(page);
  await enterParentMode(page);
  await page.getByRole('button', { name: /nova tarefa/i }).first().click();
  await page.getByLabel(/nome da tarefa/i).fill('Ajudar a preparar o jantar');
  await page.getByLabel(/período do dia/i).selectOption('night');
  await page.getByRole('button', { name: /salvar tarefa/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();

  const night = page.locator('.day-period.night');
  await expect(night.getByTestId('task-ajudar-a-preparar-o-jantar')).toBeVisible();
  await expect(page.locator('.day-period.morning').getByTestId('task-ajudar-a-preparar-o-jantar')).toHaveCount(0);
});

test('responsável cria uma tarefa e ela aparece imediatamente para a criança', async ({ page }) => {
  await openFreshApp(page);
  await enterParentMode(page);

  await page.getByRole('button', { name: /nova tarefa/i }).click();
  await page.getByLabel(/nome da tarefa/i).fill('Guardar os brinquedos');
  await page.getByLabel(/quantos pontos/i).fill('12');
  await page.getByRole('button', { name: /salvar tarefa/i }).click();
  await expect(page.getByText(/tarefa criada/i)).toBeVisible();

  await page.getByRole('button', { name: /ver como clara/i }).click();
  const createdTask = page.getByTestId('task-guardar-os-brinquedos');
  await expect(createdTask).toContainText('Guardar os brinquedos');
  await expect(createdTask).toContainText('+12');
});

test('pontos acumulados mostram o progresso até a recompensa', async ({ page }) => {
  await openFreshApp(page);
  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }
  await enterParentMode(page);
  for (const id of ['arrumar-cama', 'escovar-dentes']) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await expect(page.getByTestId('points-balance')).toHaveText('20');

  await page.getByRole('button', { name: /^recompensas$/i }).click();
  const reward = page.getByTestId('reward-escolher-filme');
  await expect(reward).toContainText('20 de 25 pontos');
  await expect(reward.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
  await expect(reward.getByRole('button', { name: /faltam 5 pontos/i })).toBeDisabled();
});

test('recompensa exige saldo e aprovação do responsável', async ({ page }) => {
  await openFreshApp(page);

  for (const id of ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }

  await enterParentMode(page);
  for (const id of ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();

  await page.getByRole('button', { name: /^recompensas$/i }).click();
  const reward = page.getByTestId('reward-escolher-filme');
  await reward.getByRole('button', { name: /pedir recompensa/i }).click();
  await expect(reward).toContainText(/pedido enviado/i);

  await enterParentMode(page);
  await page.getByTestId('reward-approval-escolher-filme').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await expect(page.getByTestId('points-balance')).toHaveText('15');
  await expect(page.locator('.celebration-banner').getByText(/recompensa aprovada/i)).toBeVisible();
});

test('continua abrindo e executando os três jogos offline no tablet', async ({ page, context }) => {
  await openFreshApp(page);
  for (const id of ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }
  await enterParentMode(page);
  for (const id of ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
  await expect(page.getByTestId('points-balance')).toHaveText('40');
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('3');

  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();
  await expect(page.getByRole('heading', { name: /caça-estrelas/i })).toBeVisible();
  await page.getByRole('button', { name: /voltar aos jogos/i }).click();

  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await expect(page.getByRole('heading', { name: /memória dos animais/i })).toBeVisible();
  await page.getByRole('button', { name: /voltar aos jogos/i }).click();

  await page.getByRole('button', { name: /jogar laboratório de padrões/i }).click();
  await expect(page.getByRole('heading', { name: /laboratório de padrões/i })).toBeVisible();
  await expect(page.getByTestId('game-passes')).toHaveText('0');
  await context.setOffline(false);
});

test('interface tem manifest relativo e navegação acessível', async ({ page }) => {
  await resetApp(page);
  await expect(page).toHaveTitle(/meu superdia/i);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: /criar o perfil da criança/i })).toBeVisible();
});

test('atalho de teclado fica oculto até receber foco', async ({ page }) => {
  await page.goto('/');
  const skipLink = page.getByRole('link', { name: /pular para o conteúdo/i });
  const before = await skipLink.boundingBox();
  expect(before.width).toBeLessThanOrEqual(1);
  expect(before.height).toBeLessThanOrEqual(1);

  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  const focused = await skipLink.boundingBox();
  expect(focused.y).toBeGreaterThanOrEqual(0);
  expect(focused.width).toBeGreaterThan(1);
});
