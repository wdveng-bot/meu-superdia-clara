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

test('caça-estrelas termina com uma conquista visível', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar caça-estrelas/i }).click();

  for (let index = 0; index < 5; index += 1) {
    await page.getByRole('button', { name: /^estrela$/i }).nth(index).click();
  }

  await expect(page.getByRole('heading', { name: /partida concluída/i })).toBeVisible();
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

test('memória dos animais termina ao encontrar os quatro pares', async ({ page }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();

  for (const [first, second] of [[0, 6], [1, 4], [2, 7], [3, 5]]) {
    await page.getByTestId(`memory-card-${first}`).click();
    await page.getByTestId(`memory-card-${second}`).click();
  }

  await expect(page.getByRole('heading', { name: /partida concluída/i })).toBeVisible();
  await expect(page.getByText(/todos os pares de animais/i)).toBeVisible();
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
  await expect(page.getByText('Guardar os brinquedos')).toBeVisible();
  await expect(page.getByText('+12')).toBeVisible();
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

test('continua abrindo e jogando offline no tablet após o primeiro acesso', async ({ page, context }) => {
  await openFreshApp(page);
  await page.getByTestId('task-arrumar-cama').getByRole('button', { name: /marcar como feita/i }).click();
  await enterParentMode(page);
  await page.getByTestId('approval-arrumar-cama').getByRole('button', { name: /aprovar/i }).click();
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
  await expect(page.getByTestId('points-balance')).toHaveText('10');
  await page.getByRole('button', { name: /^jogos$/i }).click();
  await expect(page.getByTestId('game-passes')).toHaveText('1');
  await page.getByRole('button', { name: /jogar memória dos animais/i }).click();
  await expect(page.getByRole('heading', { name: /memória dos animais/i })).toBeVisible();
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
