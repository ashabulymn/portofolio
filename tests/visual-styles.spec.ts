import { test, expect } from '@playwright/test';

test('visual styles persist independently of color mode and fit mobile screens', async ({ page }) => {
  await page.goto('/en');
  for (const style of ['editorial', 'cyberpunk', 'terminal']) {
    await page.getByLabel('Visual style', {exact:true}).selectOption(style);
    for (let mode = 0; mode < 2; mode++) {
      await expect(page.locator('.portfolio')).toHaveClass(new RegExp(`style-${style}`));
      for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({width, height:900});
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.getByRole('button', {name:'Toggle color theme'}).click();
    }
  }
  await page.reload();
  await expect(page.getByLabel('Visual style', {exact:true})).toHaveValue('terminal');
  await page.getByRole('link', {name:'Bahasa Indonesia', exact:true}).click();
  await expect(page.getByLabel('Gaya visual', {exact:true})).toHaveValue('terminal');
});

test('hero motion can pause and respects reduced motion', async ({page}) => {
  await page.goto('/en');
  const packet = page.locator('.data-packet').first();
  await expect(packet).toHaveCSS('animation-play-state','running');
  await page.getByRole('button',{name:'Pause animation'}).click();
  await expect(packet).toHaveCSS('animation-play-state','paused');
  await page.getByRole('button',{name:'Play animation'}).click();
  await expect(packet).toHaveCSS('animation-play-state','running');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(packet).toHaveCSS('animation-play-state','paused');
  await page.locator('.hero-network').scrollIntoViewIfNeeded();
  await expect(packet).toHaveCSS('animation-play-state','running');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(packet).toHaveCSS('animation-name','none');
  await expect(page.locator('.motion-control')).toBeHidden();
});
