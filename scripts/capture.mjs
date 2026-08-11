import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:4187';
const outputDir = path.resolve('screenshots');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function prepare(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
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
  await page.reload({ waitUntil: 'networkidle' });
}

async function registerFamily(page) {
  await page.getByLabel(/nome da criança/i).fill('Clara');
  await page.getByLabel(/idade/i).selectOption('7');
  await page.getByLabel(/avatar/i).selectOption('🦊');
  await page.getByLabel(/^crie um pin/i).fill('2468');
  await page.getByLabel(/confirme o pin/i).fill('2468');
  await page.getByRole('button', { name: /começar/i }).click();
}

async function enterParentMode(page) {
  await page.getByRole('button', { name: /trocar perfil/i }).click();
  await page.getByRole('button', { name: /área do responsável/i }).click();
  await page.getByLabel(/pin do responsável/i).fill('2468');
  await page.getByRole('button', { name: /^entrar$/i }).click();
}

async function approveTasks(page, ids) {
  for (const id of ids) {
    await page.getByTestId(`task-${id}`).getByRole('button', { name: /marcar como feita/i }).click();
  }
  await enterParentMode(page);
  for (const id of ids) {
    await page.getByTestId(`approval-${id}`).getByRole('button', { name: /aprovar/i }).click();
  }
  await page.getByRole('button', { name: /ver como clara/i }).click();
  await page.waitForTimeout(3000);
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await prepare(mobile);
await mobile.screenshot({ path: path.join(outputDir, '01-cadastro-mobile.png'), fullPage: true });
await registerFamily(mobile);
await mobile.screenshot({ path: path.join(outputDir, '02-tarefas-mobile.png'), fullPage: true });
await approveTasks(mobile, ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']);
await mobile.getByRole('button', { name: /^jogos$/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '03-jogos-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /jogar caça-estrelas/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '04-caca-estrelas-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /voltar aos jogos/i }).click();
await mobile.getByRole('button', { name: /jogar memória dos animais/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '05-memoria-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /voltar aos jogos/i }).click();
await mobile.getByRole('button', { name: /jogar laboratório de padrões/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '06-padroes-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /voltar aos jogos/i }).click();
await mobile.getByRole('button', { name: /^recompensas$/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '07-recompensas-mobile.png'), fullPage: true });
await enterParentMode(mobile);
await mobile.screenshot({ path: path.join(outputDir, '08-painel-responsavel-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /nova tarefa/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '09-nova-tarefa-mobile.png'), fullPage: true });

const tablet = await browser.newPage({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1 });
await prepare(tablet);
await registerFamily(tablet);
await approveTasks(tablet, ['arrumar-cama', 'escovar-dentes', 'organizar-mochila']);
await tablet.getByRole('button', { name: /^jogos$/i }).click();
await tablet.screenshot({ path: path.join(outputDir, '10-jogos-tablet.png'), fullPage: true });
await tablet.getByRole('button', { name: /jogar laboratório de padrões/i }).click();
await tablet.screenshot({ path: path.join(outputDir, '11-padroes-tablet.png'), fullPage: true });

await browser.close();

if (errors.length) {
  console.error(JSON.stringify({ screenshots: 11, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ screenshots: 11, pageErrors: 0, outputDir }, null, 2));
