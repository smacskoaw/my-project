import { test, expect } from '@playwright/test';
test('complete application, editing, consent, duplicate prevention and private admin endpoints', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /طموحك يستحق/ })).toBeVisible();
  await page.locator('#fullName').fill('أحمد اختبار منصتي');
  await page.locator('#phone').fill('07701234567');
  await page.locator('#nationality').selectOption('عراقي');
  await page.locator('#country').selectOption('العراق');
  await page.locator('#city').fill('بغداد');
  await page.locator('#age').fill('28');
  await page.locator('#education').selectOption('بكالوريوس');
  await page.locator('#specialty').selectOption('أخرى');
  await page.locator('#otherSpecialty').fill('تحليل البيانات');
  await page.locator('#experience').fill('5');
  await page.locator('#employed').selectOption('لا');
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page).toHaveURL(/review/);
  await expect(page.getByRole('heading', { name: 'تأكد من بياناتك' })).toBeVisible();
  await expect(page.getByText('+9647701234567', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'إرسال الطلب' })).toBeDisabled();
  await page.getByRole('link', { name: 'تعديل البيانات' }).first().click();
  await expect(page.locator('#fullName')).toHaveValue('أحمد اختبار منصتي');
  await expect(page.locator('#otherSpecialty')).toHaveValue('تحليل البيانات');
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  const draft = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('minassati-draft-v1')!),
  );
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'إرسال الطلب' }).click();
  await expect(page.getByRole('heading', { name: 'تم استلام طلبك بنجاح!' })).toBeVisible();
  const again = await request.post('/api/applications', {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...draft, consent: true },
  });
  expect(again.status()).toBe(200);
  const duplicatePhone = await request.post('/api/applications', {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...draft, idempotencyKey: crypto.randomUUID(), consent: true },
  });
  expect(duplicatePhone.status()).toBe(429);
  const noConsent = await request.post('/api/applications', {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...draft, consent: false },
  });
  expect(noConsent.status()).toBe(400);
  const crossOrigin = await request.post('/api/applications', {
    headers: { Origin: 'https://evil.example' },
    data: { ...draft, consent: true },
  });
  expect(crossOrigin.status()).toBe(403);
  expect((await request.get('/api/admin/applications')).status()).toBe(401);
  expect(
    (
      await request.patch('/api/admin/applications/' + crypto.randomUUID(), {
        headers: { Origin: 'http://localhost:3000' },
        data: { status: 'مقبول' },
      })
    ).status(),
  ).toBe(401);
  await page.goto('/admin');
  await expect(page).toHaveURL(/admin\/login/);
});
test('responsive public pages have no horizontal overflow', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
      caret: 'initial',
    });
  }
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'سياسة الخصوصية', exact: true })).toBeVisible();
});
test('admin authentication, filters, pagination, details, status, WhatsApp, delete and logout', async ({
  page,
  request,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('اسم المستخدم').fill('test-admin');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
  await expect(page.locator('.alert.error')).toContainText('غير صحيحة');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Test-only-password-482!');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const authCookie = (await page.context().cookies()).find((c) => c.name === 'minassati_session');
  expect(authCookie?.httpOnly).toBe(true);
  expect(authCookie?.sameSite).toBe('Strict');
  expect((await page.request.get('/api/admin/applications')).status()).toBe(200);
  await expect(page.locator('.applicant-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'الصفحة التالية' }).click();
  await expect(page.locator('.pagination')).toContainText('الصفحة 2');
  await page.getByRole('button', { name: 'الصفحة السابقة' }).click();
  await expect(page.locator('.pagination')).toContainText('الصفحة 1');
  await page.getByLabel('جميع المدن').selectOption('دمشق');
  await expect(page.locator('.applicant-card')).toHaveCount(7);
  await page.getByLabel('جميع التخصصات').selectOption('المحاسبة');
  await expect(page.getByRole('heading', { name: 'لا توجد نتائج مطابقة' })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await page.getByLabel('البحث بالاسم أو الهاتف').fill('أحمد اختبار منصتي');
  await expect(page.locator('.applicant-card')).toHaveCount(1);
  await page.getByLabel('البحث بالاسم أو الهاتف').fill('٠٧٧٠١٢٣٤٥٦٧');
  await expect(page.locator('.applicant-card')).toHaveCount(1);
  await expect(page.locator('.name-button')).toHaveText('أحمد اختبار منصتي');
  await expect(page.locator('.whatsapp-button')).toHaveAttribute(
    'href',
    /^https:\/\/wa.me\/9647701234567\?text=/,
  );
  await page.getByRole('button', { name: 'عرض التفاصيل' }).click();
  await expect(page.locator('dialog[open]')).toContainText('تحليل البيانات');
  await page.getByLabel('حالة الطلب').selectOption('مقبول');
  await expect(page.getByRole('status')).toContainText('تم تحديث');
  await page.getByRole('button', { name: 'إغلاق التفاصيل' }).click();
  await expect(page.locator('.status')).toHaveText('مقبول');
  await page.getByRole('button', { name: 'حذف طلب أحمد اختبار منصتي' }).click();
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(page.locator('.applicant-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'حذف طلب أحمد اختبار منصتي' }).click();
  await page.getByRole('button', { name: 'نعم، حذف الطلب' }).click();
  await expect(page.getByRole('heading', { name: 'لا توجد نتائج مطابقة' })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page.locator('.applicant-card')).toHaveCount(12);
  await page.screenshot({
    path: 'test-results/admin-desktop.png',
    fullPage: true,
    caret: 'initial',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/admin-mobile.png',
    fullPage: true,
    caret: 'initial',
  });
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/admin\/login/);
  expect((await page.request.get('/api/admin/applications')).status()).toBe(401);
});
