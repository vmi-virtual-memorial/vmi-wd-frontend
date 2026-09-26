import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './mockApi';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

const currentPageButton = (page: Page) => page.locator('button[aria-current="page"]').first();

async function scrollTo(page: Page, y: number) {
  await page.evaluate(top => window.scrollTo(0, top), y);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 5);
  // let the rAF-throttled save run
  await page.waitForTimeout(100);
}

test('conflict page: back returns to the same pagination page and scroll', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /World War II/ }).click();
  await expect(currentPageButton(page)).toHaveText('1');

  await page.getByRole('button', { name: 'Page 3' }).first().click();
  await expect(currentPageButton(page)).toHaveText('3');
  await expect(page).toHaveURL(/\/memorial\/conflict\/1\?page=3$/);

  const target = page.getByRole('link', { name: /Soldier075/ });
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const savedY = await page.evaluate(() => window.scrollY);
  expect(savedY).toBeGreaterThan(300);

  await target.click();
  await expect(page).toHaveURL(/\/memorial\/person\/75$/);
  await expect(page.getByRole('heading', { name: /Soldier075/, level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/memorial\/conflict\/1\?page=3$/);
  await expect(currentPageButton(page)).toHaveText('3');
  await expect(page.getByRole('link', { name: /Soldier075/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedY - 20);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(savedY + 20);
});

test('conflict page: per-page choice survives back', async ({ page }) => {
  await page.goto('/memorial/conflict/1');
  await page.locator('#items-per-page').first().selectOption('50');
  await page.getByRole('button', { name: 'Page 2' }).first().click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/per=50/);

  await page.getByRole('link', { name: /Soldier060/ }).click();
  await expect(page).toHaveURL(/\/memorial\/person\/60$/);
  await page.goBack();
  await expect(currentPageButton(page)).toHaveText('2');
  await expect(page.locator('#items-per-page').first()).toHaveValue('50');
});

test('conflict page: fresh navigation starts at the top of page 1', async ({ page }) => {
  await page.goto('/memorial/conflict/1?page=2');
  await expect(currentPageButton(page)).toHaveText('2');
  await scrollTo(page, 800);
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: /World War II/ }).click();
  await expect(currentPageButton(page)).toHaveText('1');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
});

test('conflict page: stale page in URL clamps to last page', async ({ page }) => {
  await page.goto('/memorial/conflict/1?page=99');
  await expect(currentPageButton(page)).toHaveText('4');
});

test('memorial index: back restores sort, collapsed conflicts and scroll', async ({ page }) => {
  await page.goto('/memorial');
  await page.getByRole('button', { name: /ABC/ }).click();
  await expect(page).toHaveURL(/\/memorial\?sort=class_year$/);

  // collapse the Civil War section
  await page.getByRole('heading', { name: 'Civil War' }).click();
  await expect(page.getByRole('link', { name: /Wise/ })).toHaveCount(0);

  const target = page.getByRole('link', { name: /Soldier050/ });
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const savedY = await page.evaluate(() => window.scrollY);
  expect(savedY).toBeGreaterThan(300);

  await target.click();
  await expect(page).toHaveURL(/\/memorial\/person\/50$/);
  await page.goBack();

  await expect(page).toHaveURL(/\/memorial\?sort=class_year$/);
  await expect(page.getByRole('link', { name: /Soldier050/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Wise/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedY - 20);
});

test('memorial index: fresh visit resets expansion to default', async ({ page }) => {
  await page.goto('/memorial');
  await page.getByRole('heading', { name: 'Civil War' }).click();
  await expect(page.getByRole('link', { name: /Wise/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'View Complete Index' }).click();
  await expect(page.getByRole('link', { name: /Wise/ })).toHaveCount(1);
});

test('search: back restores the applied search', async ({ page }) => {
  await page.goto('/memorial/search');
  await expect(page.getByText('Found 100 people')).toBeVisible();

  await page.getByLabel('Search by Name').fill('Wise');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('Found 1 person')).toBeVisible();
  await expect(page).toHaveURL(/q=Wise/);

  await page.getByRole('link', { name: /John Wise/ }).click();
  await expect(page).toHaveURL(/\/memorial\/person\/200$/);
  await page.goBack();

  await expect(page.getByText('Found 1 person')).toBeVisible();
  await expect(page.getByLabel('Search by Name')).toHaveValue('Wise');
});
