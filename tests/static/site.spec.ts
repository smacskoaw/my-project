import { test, expect } from '@playwright/test';
test('exported site loads nested pages, images and local fonts at the GitHub path', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  page.on('response', (r) => {
    if (r.url().startsWith('http://localhost:4173') && r.status() >= 400) failures.push(r.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /طموحك يستحق/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) => images.every((i) => (i as HTMLImageElement).naturalWidth > 0)),
  ).toBe(true);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('link', { name: 'سياسة الخصوصية', exact: true }).first().click();
  await expect(page).toHaveURL(/\/my-project\/privacy\//);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'سياسة الخصوصية', exact: true })).toBeVisible();
  await page.goto('./admin/login/');
  await expect(page.getByLabel('اسم المستخدم')).toBeVisible();
  await page.goto('./review/');
  await expect(page.getByRole('heading', { name: 'لنبدأ ببياناتك أولاً' })).toBeVisible();
  expect(failures).toEqual([]);
});
