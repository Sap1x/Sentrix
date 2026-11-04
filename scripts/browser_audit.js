/**
 * SENTRIX — Headless Browser UI/UX & E2E Audit Script
 * Uses system Google Chrome via puppeteer-core to inspect all pages, modals,
 * viewports, console logs, and network traffic.
 */
const puppeteer = require('../apps/web/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/audit_screenshots');
const BASE_URL = 'http://localhost:3000';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAudit() {
  console.log('=== STARTING SENTRIX BROWSER AUDIT ===');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    if (type === 'error' || type === 'warn') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    }
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err.message);
    consoleLogs.push({ type: 'pageerror', text: err.message });
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.warn(`[HTTP ${res.status()}] ${res.request().method()} ${res.url()}`);
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const url = req.url();
    networkErrors.push({ url, errorText: failure ? failure.errorText : 'Unknown' });
    console.error(`[NETWORK FAILED] ${req.method()} ${url} - ${failure ? failure.errorText : 'Unknown'}`);
  });

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2500);

  // 1. Command Center (Default View)
  console.log('Capturing: 01_command_center_desktop.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_command_center_desktop.png') });

  // 2. Switch to Dependency Topology Sub-view
  console.log('Switching to Dependency Topology sub-view...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Dependency Topology'));
    if (b) b.click();
  });
  await delay(1200);
  console.log('Capturing: 02_dependency_topology.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_dependency_topology.png') });

  // 3. Switch back to Geospatial Map and Select an Asset
  console.log('Switching back to Geospatial Map...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Geospatial Map'));
    if (b) b.click();
  });
  await delay(1000);

  console.log('Clicking Substation North-01 node on map...');
  await page.evaluate(() => {
    // Click node with Substation North
    const circles = Array.from(document.querySelectorAll('g[cursor="pointer"], g[onClick], circle'));
    const sub = circles.find(c => {
      const parent = c.closest('g');
      return parent && parent.textContent && parent.textContent.includes('Substation North');
    }) || circles[0];
    if (sub) {
      sub.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await delay(800);
  console.log('Capturing: 03_asset_inspector_selected.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_asset_inspector_selected.png') });

  // 4. Test Simulation Timeline Scrubber (Click T+2h)
  console.log('Testing Simulation Timeline Scrubber: clicking T+2h...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('T+2h'));
    if (b) b.click();
  });
  await delay(800);
  console.log('Capturing: 04_timeline_step_t2h.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_timeline_step_t2h.png') });

  // 5. Navigate to Incident Intake
  console.log('Navigating to Incident Intake tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Incident Intake'));
    if (b) b.click();
  });
  await delay(1200);
  console.log('Capturing: 05_incident_intake.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_incident_intake.png') });

  // 6. Navigate to Scenario Lab
  console.log('Navigating to Scenario Lab tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Scenario Lab'));
    if (b) b.click();
  });
  await delay(1200);
  console.log('Capturing: 06_scenario_lab.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_scenario_lab.png') });

  // Click Life-Safety Priority Preset
  console.log('Clicking Life-Safety Priority Preset...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Life-Safety Priority'));
    if (b) b.click();
  });
  await delay(1000);
  console.log('Capturing: 07_scenario_lab_lifesafety_preset.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_scenario_lab_lifesafety_preset.png') });

  // 7. Open Decision Brief Modal
  console.log('Opening Decision Brief modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Decision Brief'));
    if (b) b.click();
  });
  await delay(2000);
  console.log('Capturing: 08_decision_brief_modal.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_decision_brief_modal.png') });

  // Close Decision Brief Modal cleanly
  console.log('Closing Decision Brief modal...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-testid="close-brief-btn"]') ||
                document.querySelector('button[data-testid="close-brief-btn-bottom"]');
    if (btn) btn.click();
  });
  await delay(800);

  // 8. Open System Health Modal
  console.log('Opening System Health modal...');
  await page.evaluate(() => {
    const healthBtn = document.querySelector('button[title="System Health & Observability"]') ||
                      document.querySelector('div[aria-label="System Health and Model Status"]');
    if (healthBtn) healthBtn.click();
  });
  await delay(1200);
  console.log('Capturing: 09_system_health_modal.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_system_health_modal.png') });

  // Close System Health Modal
  console.log('Closing System Health modal...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-testid="close-health-btn"]');
    if (btn) btn.click();
  });
  await delay(800);

  // 9. Responsive Viewports Testing
  const viewports = [
    { name: '10_laptop_1280x800', width: 1280, height: 800 },
    { name: '11_tablet_768x1024', width: 768, height: 1024 },
    { name: '12_mobile_390x844', width: 390, height: 844 },
  ];

  // Navigate back to Command Center
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Command Center'));
    if (b) b.click();
  });
  await delay(800);

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.width}x${vp.height}...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await delay(1000);
    console.log(`Capturing: ${vp.name}.png`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${vp.name}.png`) });

    if (vp.name === '12_mobile_390x844') {
      // Test mobile intelligence drawer toggle
      console.log('Testing mobile intelligence drawer toggle...');
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Toggle AI Intelligence Panel"]');
        if (btn) btn.click();
      });
      await delay(1000);
      console.log('Capturing: 13_mobile_intelligence_drawer.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_mobile_intelligence_drawer.png') });
    }
  }

  await browser.close();

  // Write audit results
  const auditReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalConsoleLogs: consoleLogs.length,
    consoleErrors: consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror'),
    consoleWarnings: consoleLogs.filter(l => l.type === 'warn'),
    networkErrors: networkErrors,
    screenshots: fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'))
  };

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_results.json'),
    JSON.stringify(auditReport, null, 2)
  );

  console.log('=== AUDIT COMPLETE ===');
  console.log(`Captured ${auditReport.screenshots.length} screenshots:`, auditReport.screenshots);
  console.log(`Console Errors: ${auditReport.consoleErrors.length}`);
  console.log(`Network Errors: ${auditReport.networkErrors.length}`);
}

runAudit().catch(err => {
  console.error('Audit Script Failed:', err);
  process.exit(1);
});
