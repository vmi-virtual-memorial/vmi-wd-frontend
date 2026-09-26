import type { Page } from '@playwright/test';

const API = 'http://mock-api.test/api';

const LONG_DESCRIPTION =
  'Killed in action while leading his platoon across open ground under heavy machine-gun fire. ' +
  'Despite being wounded twice he continued to direct the assault, rallied the survivors, ' +
  'carried a wounded comrade to cover, and returned to the line to hold the position until relieved. ' +
  'He was posthumously recognized for extraordinary heroism and devotion to his men and his duty.';

const conflicts = [
  { id: 1, name: 'World War II', start_year: 1941, end_year: 1945, description: '', order: 1 },
  { id: 2, name: 'Civil War', start_year: 1861, end_year: 1865, description: '', order: 2 },
];

function person(id: number, conflict: number, overrides: Record<string, unknown> = {}) {
  const last = `Soldier${String(id).padStart(3, '0')}`;
  return {
    id,
    first_name: 'John',
    middle_name: '',
    last_name: last,
    suffix: '',
    display_name: `John ${last}`,
    full_display_name: `John ${last}`,
    rank: '',
    unit: '1st Infantry',
    class_year: null,
    class_letter: '',
    date_of_death: null,
    death_date_precision: 'day',
    death_date_display: null,
    death_description: LONG_DESCRIPTION,
    conflict,
    conflict_name: conflicts.find(c => c.id === conflict)!.name,
    pdf_key: '',
    pdf_url: null,
    has_awards: false,
    ...overrides,
  };
}

// 95 WWII casualties -> 4 pages at 30 per page; a handful in the Civil War
export const ww2 = Array.from({ length: 95 }, (_, i) => person(i + 1, 1));
ww2[0] = person(1, 1, {
  last_name: 'Aardvark',
  display_name: 'Jane Aardvark',
  full_display_name: "Jane Aardvark '42MS",
  class_year: 1942,
  class_letter: 'MS',
});
export const civilWar = Array.from({ length: 5 }, (_, i) => person(200 + i, 2));
civilWar[0] = person(200, 2, {
  last_name: 'Wise',
  display_name: 'John Wise',
  full_display_name: 'John Wise 1862M',
  class_year: 1862,
  class_letter: 'M',
});
const everyone = [...ww2, ...civilWar];

export async function mockApi(page: Page) {
  await page.route(`${API}/**`, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/memorial/, '');
    const json = (body: unknown) => route.fulfill({ json: body });

    const withCounts = conflicts.map(c => ({
      ...c,
      casualty_count: everyone.filter(p => p.conflict === c.id).length,
    }));

    if (path === '/conflicts/') return json(withCounts);
    if (path === '/index/') {
      const sort = url.searchParams.get('sort');
      return json(
        withCounts.map(c => {
          const casualties = everyone.filter(p => p.conflict === c.id);
          if (sort === 'class_year') casualties.sort((a, b) => (a.class_year ?? 9999) - (b.class_year ?? 9999));
          return { ...c, casualties };
        })
      );
    }
    if (path === '/search-filters/') {
      return json({ conflicts, class_years: [1862, 1942] });
    }
    if (path === '/persons/search/') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const results = everyone.filter(p => p.display_name.toLowerCase().includes(q));
      return json({ count: results.length, results });
    }
    if (path === '/persons/') {
      const conflict = Number(url.searchParams.get('conflict'));
      return json(everyone.filter(p => p.conflict === conflict));
    }
    const detail = path.match(/^\/persons\/(\d+)\/$/);
    if (detail) {
      const p = everyone.find(x => x.id === Number(detail[1]));
      return p ? json({ ...p, contributions: [], awards: [] }) : route.fulfill({ status: 404, json: {} });
    }
    return route.fulfill({ status: 404, json: { error: `unmocked ${path}` } });
  });
}
