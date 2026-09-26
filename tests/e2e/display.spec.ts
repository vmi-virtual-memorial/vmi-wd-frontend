import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

const lineClamp = (el: Element) => getComputedStyle(el).getPropertyValue('-webkit-line-clamp');

test('circumstances of death clamp to four lines on the index', async ({ page }) => {
  await page.goto('/memorial');
  const summary = page.getByRole('link', { name: /Soldier002/ }).locator('p.italic').last();
  await expect(summary).toBeVisible();
  expect(await summary.evaluate(lineClamp)).toBe('4');
  const lineHeight = await summary.evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
  const height = await summary.evaluate(el => el.getBoundingClientRect().height);
  expect(Math.round(height / lineHeight)).toBe(4);
});

test('circumstances of death clamp to four lines on conflict pages', async ({ page }) => {
  await page.goto('/memorial/conflict/1');
  const summary = page.getByRole('link', { name: /Soldier002/ }).locator('p.italic').last();
  await expect(summary).toBeVisible();
  expect(await summary.evaluate(lineClamp)).toBe('4');
});

test('index abbreviates only 1900s class years and shows two-letter suffix', async ({ page }) => {
  await page.goto('/memorial');
  await expect(page.getByRole('link', { name: /Jane Aardvark/ })).toContainText("'42MS");
  const wise = page.getByRole('link', { name: /John Wise/ });
  await expect(wise).toContainText('1862M');
  await expect(wise).not.toContainText("'62");
});

test('person page shows two-letter class suffix', async ({ page }) => {
  await page.goto('/memorial/person/1');
  await expect(page.getByText('Class Year:')).toBeVisible();
  await expect(page.getByText(/Class Year:\s*1942MS/)).toBeVisible();
});
