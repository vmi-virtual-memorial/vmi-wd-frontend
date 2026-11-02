import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Full-stack e2e: the real Django API from vmi-wd-backend, loaded with its
// synthetic search_demo fixture into a throwaway sqlite file, and a production
// build pointed at it. No mocks: search.spec.ts sees FULLSTACK and skips them.
// The backend's DEBUG CORS settings allow http://localhost:3000, hence the port.
process.env.FULLSTACK = '1';

const BACKEND_DIR = process.env.BACKEND_DIR ?? path.resolve(__dirname, '..', 'vmi-wd-backend');
const PYTHON = process.env.PYTHON ?? 'python';
const API = 'http://127.0.0.1:8000/api';
const DATABASE_URL = `sqlite:///${path.join(BACKEND_DIR, 'e2e.sqlite3')}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'search.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // loaddata is idempotent (fixture rows carry explicit primary keys)
      command: `${PYTHON} manage.py migrate --noinput -v0 && ${PYTHON} manage.py loaddata search_demo -v0 && ${PYTHON} manage.py runserver 127.0.0.1:8000 --noreload`,
      cwd: BACKEND_DIR,
      url: `${API}/memorial/search-index/`,
      env: { SECRET_KEY: 'e2e-only', DEBUG: 'True', DATABASE_URL },
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run start -- -p 3000',
      url: 'http://localhost:3000',
      env: { NEXT_PUBLIC_API_URL: API, NEXT_TELEMETRY_DISABLED: '1' },
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
