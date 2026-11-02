// Live search and Advanced Search, end to end. Runs two ways over the same
// synthetic data (backend memorial/fixtures/search_demo.json):
//  - mocked: the API is intercepted and served from tests/fixtures/search-index.json;
//  - full stack (FULLSTACK=1, playwright.fullstack.config.ts): a real Django API.
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

const FULLSTACK = !!process.env.FULLSTACK;

test.beforeEach(async ({ page }) => {
  if (!FULLSTACK) await mockApi(page);
});

const bar = (page: Page) => page.getByRole('combobox', { name: 'Search the memorial' });
const listbox = (page: Page) => page.getByRole('listbox', { name: 'Search suggestions' });
const group = (page: Page, name: string) => listbox(page).getByRole('group', { name, exact: true });
const found = (page: Page) => page.getByText(/^Found \d+ (person|people)$/);

// Pages hydrate after the load event, so the first interaction can land before
// React's handlers exist. These helpers retry the action until the UI responds
// (the list opens, focus moves, the sheet appears) instead of racing hydration.
async function search(page: Page, text: string) {
  await expect(async () => {
    await bar(page).click();
    await bar(page).fill(text);
    await expect(listbox(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
}

async function openSheet(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Search the memorial' });
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'Search the memorial' }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  return dialog;
}

test.describe('header search bar', () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'the inline bar is desktop-only; see the mobile tests'));

  test('shows grouped, highlighted live results', async ({ page }) => {
    await page.goto('/');
    await search(page, 'silver star');
    await expect(group(page, 'Awards').getByRole('option')).toHaveCount(1);
    await expect(group(page, 'Awards')).toContainText('7 alumni have been awarded');
    await expect(group(page, 'People').getByRole('option')).toHaveCount(7); // 6 + "See all"
    await expect(listbox(page)).toContainText('See all 7 people');
    await expect(group(page, 'Awards').locator('mark')).toHaveText(['Silver', 'Star']);
  });

  test('arrow keys and Enter open a person', async ({ page }) => {
    await page.goto('/');
    await search(page, 'bastogne');
    await expect(group(page, 'People').getByRole('option')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await expect(group(page, 'People').getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/memorial\/person\/106$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Charles Dunmore Fitch');
  });

  test('the row under the mouse is the active row', async ({ page }) => {
    await page.goto('/');
    await search(page, 'vietnam');
    const people = group(page, 'People').getByRole('option');
    await expect(people).toHaveCount(6);
    await people.nth(2).hover();
    await expect(people.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(listbox(page).locator('[aria-selected="true"]')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await expect(people.nth(3)).toHaveAttribute('aria-selected', 'true');
  });

  test('Advanced Search… footer carries the query', async ({ page }) => {
    await page.goto('/');
    await search(page, 'chosin');
    await listbox(page).getByRole('option', { name: 'Advanced Search…' }).click();
    await expect(page).toHaveURL(/\/memorial\/search\?q=chosin$/);
    await expect(found(page)).toHaveText('Found 2 people');
  });

  test('Tab turns a facet into a chip that filters live and carries to Advanced Search', async ({ page }) => {
    await page.goto('/');
    await search(page, 'silver star');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Remove filter: Silver Star' })).toBeVisible();
    await bar(page).fill('marines');
    await expect(group(page, 'People').getByRole('option')).toHaveCount(2);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/memorial\/search\?q=marines&award=7$/);
    await expect(found(page)).toHaveText('Found 2 people');
    await expect(page.getByRole('button', { name: 'Remove filter: Award: Silver Star' })).toBeVisible();
  });

  test('facet rows link to their pages', async ({ page }) => {
    await page.goto('/');
    await search(page, 'croix');
    await group(page, 'Awards').getByRole('option').first().click();
    await expect(page).toHaveURL(/\/awards\/8$/);

    await search(page, '1st bn 7th marines');
    await expect(group(page, 'Units').getByRole('option').first()).toContainText('1st Battalion, 7th Marines');
    await group(page, 'Units').getByRole('option').first().click();
    await expect(page).toHaveURL(/\/memorial\/search\?unit=1st\+Battalion%2C\+7th\+Marines$/);
    await expect(found(page)).toHaveText('Found 3 people');
  });

  test('keyboard shortcuts focus the bar; Escape and outside clicks close it', async ({ page }) => {
    const elsewhere = () => page.mouse.click(5, 700); // page margin, clear of the dropdown
    await page.goto('/');
    await expect(async () => {
      await elsewhere();
      await page.keyboard.press('ControlOrMeta+k');
      await expect(bar(page)).toBeFocused({ timeout: 1000 });
    }).toPass();
    await expect(listbox(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(listbox(page)).toBeHidden();

    await elsewhere();
    await page.keyboard.press('/');
    await expect(bar(page)).toBeFocused();
    await expect(bar(page)).toHaveValue('');
    await expect(listbox(page)).toBeVisible();
    await elsewhere();
    await expect(listbox(page)).toBeHidden();
  });

  test('recently viewed people show on an empty bar', async ({ page }) => {
    await page.goto('/memorial/person/106');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Charles Dunmore Fitch');
    await search(page, '');
    await expect(group(page, 'Recently viewed')).toContainText('Charles Dunmore Fitch');
  });

  test('the dropdown has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await search(page, 'silver star');
    await page.keyboard.press('ArrowDown');
    await expect(group(page, 'People')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('header [role="combobox"]').include('[role="listbox"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Advanced Search', () => {
  test('filters live; back returns to the same search', async ({ page, isMobile }) => {
    await page.goto('/memorial/search');
    await expect(found(page)).toHaveText('Found 40 people');
    if (isMobile) await page.getByRole('button', { name: 'Show' }).click();

    await page.getByLabel('Keywords').fill('bastogne');
    await expect(found(page)).toHaveText('Found 1 person');
    await expect(page).toHaveURL(/q=bastogne/);

    await page.getByRole('link', { name: /Charles Dunmore Fitch/ }).click();
    await expect(page).toHaveURL(/\/memorial\/person\/106$/);
    await page.goBack();

    await expect(found(page)).toHaveText('Found 1 person');
    if (isMobile) await page.getByRole('button', { name: 'Show' }).click();
    await expect(page.getByLabel('Keywords')).toHaveValue('bastogne');
  });

  test('facets combine with counts', async ({ page, isMobile }) => {
    await page.goto('/memorial/search?q=silver+star');
    await expect(found(page)).toHaveText('Found 7 people');
    if (isMobile) await page.getByRole('button', { name: 'Show' }).click();
    await page.getByRole('group', { name: 'Branch' }).getByRole('checkbox', { name: /U.S. Marine Corps/ }).check();
    await expect(found(page)).toHaveText('Found 2 people');
    await expect(page).toHaveURL(/branch=MARINES/);
    await page.getByRole('button', { name: 'Remove filter: Branch: U.S. Marine Corps' }).click();
    await expect(found(page)).toHaveText('Found 7 people');
  });

  test('follows the header bar while on the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'inline bar');
    await page.goto('/memorial/search?q=chosin');
    await expect(found(page)).toHaveText('Found 2 people');
    await search(page, 'vietnam');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/memorial\/search\?q=vietnam$/);
    await expect(found(page)).toHaveText('Found 6 people');
    await expect(page.getByLabel('Keywords')).toHaveValue('vietnam');
  });

  test('has no accessibility violations in its filters and results', async ({ page }) => {
    await page.goto('/memorial/search?q=silver+star&branch=MARINES');
    await expect(found(page)).toHaveText('Found 2 people');
    const results = await new AxeBuilder({ page }).include('main').analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('mobile search', () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, 'mobile only'));

  test('opens a full-screen sheet and navigates', async ({ page }) => {
    await page.goto('/');
    const dialog = await openSheet(page);
    await expect(dialog.getByRole('combobox')).toBeFocused();
    await page.keyboard.type('vietnam');
    await dialog.getByRole('group', { name: 'Conflicts', exact: true }).getByRole('option').first().click();
    await expect(page).toHaveURL(/\/memorial\/conflict\/4$/);
    await expect(dialog).toBeHidden();
  });

  test('Cancel closes the sheet; the page does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await openSheet(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
