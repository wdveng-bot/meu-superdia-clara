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

test('continua abrindo offline no tablet após o primeiro acesso', async ({ page, context }) => {
  await openFreshApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /olá, clara/i })).toBeVisible();
  await expect(page.getByTestId('points-balance')).toHaveText('0');
  await context.setOffline(false);
});

test('interface tem manifest relativo e navegação acessível', async ({ page }) => {
  await resetApp(page);
  await expect(page).toHaveTitle(/meu superdia/i);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: /criar o perfil da criança/i })).toBeVisible();
});
