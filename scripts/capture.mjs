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
  await page.getByLabel(/idade/i).selectOption('8');
  await page.getByLabel(/avatar/i).selectOption('🦊');
  await page.getByLabel(/^crie um pin/i).fill('2468');
  await page.getByLabel(/confirme o pin/i).fill('2468');
  await page.getByRole('button', { name: /começar/i }).click();
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await prepare(mobile);
await mobile.screenshot({ path: path.join(outputDir, '01-cadastro-mobile.png'), fullPage: true });
await registerFamily(mobile);
await mobile.screenshot({ path: path.join(outputDir, '02-tarefas-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /^recompensas$/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '03-recompensas-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /trocar perfil/i }).click();
await mobile.getByRole('button', { name: /área do responsável/i }).click();
await mobile.getByLabel(/pin do responsável/i).fill('2468');
await mobile.getByRole('button', { name: /^entrar$/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '04-painel-responsavel-mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: /nova tarefa/i }).click();
await mobile.screenshot({ path: path.join(outputDir, '05-nova-tarefa-mobile.png'), fullPage: true });

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await prepare(desktop);
await registerFamily(desktop);
await desktop.screenshot({ path: path.join(outputDir, '06-tarefas-desktop.png'), fullPage: true });

await browser.close();

if (errors.length) {
  console.error(JSON.stringify({ screenshots: 6, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ screenshots: 6, pageErrors: 0, outputDir }, null, 2));
