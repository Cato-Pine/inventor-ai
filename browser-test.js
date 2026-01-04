const { chromium } = require('playwright');

async function testInventorAI() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];
  const networkFailures = [];

  // Capture console messages
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
  });

  // Capture network failures
  page.on('requestfailed', request => {
    networkFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText
    });
  });

  console.log('\n=== INVENTOR-AI WEBSITE TEST ===\n');

  // Step 1: Navigate to the site
  console.log('Step 1: Navigating to https://inventorai.vercel.app...');
  try {
    const response = await page.goto('https://inventorai.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log(`  Status: ${response.status()}`);
    console.log(`  URL: ${page.url()}`);
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
    console.log('  Trying alternate URL: https://inventor-ai.vercel.app...');
    try {
      const response = await page.goto('https://inventor-ai.vercel.app', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      console.log(`  Status: ${response.status()}`);
      console.log(`  URL: ${page.url()}`);
    } catch (e2) {
      console.log(`  FAILED: ${e2.message}`);
    }
  }

  // Step 2: Take a screenshot
  console.log('\nStep 2: Taking screenshot...');
  await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
  console.log('  Screenshot saved: homepage-screenshot.png');

  // Step 3: Get page title and basic info
  console.log('\nStep 3: Page info...');
  const title = await page.title();
  console.log(`  Title: ${title}`);

  // Step 4: Look for login/signup buttons
  console.log('\nStep 4: Looking for login/signup buttons...');
  const loginButton = await page.$('button:has-text("Login"), button:has-text("Sign in"), a:has-text("Login"), a:has-text("Sign in")');
  const signupButton = await page.$('button:has-text("Sign up"), button:has-text("Register"), a:has-text("Sign up"), a:has-text("Register")');
  const googleButton = await page.$('button:has-text("Google"), button:has-text("Continue with Google")');

  console.log(`  Login button found: ${!!loginButton}`);
  console.log(`  Signup button found: ${!!signupButton}`);
  console.log(`  Google OAuth button found: ${!!googleButton}`);

  // Try to get all buttons/links for debugging
  const allButtons = await page.$$eval('button, a[href]', elements =>
    elements.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      href: el.getAttribute('href'),
      class: el.className
    })).filter(el => el.text)
  );
  console.log(`  All interactive elements found: ${allButtons.length}`);
  if (allButtons.length > 0 && allButtons.length <= 20) {
    console.log('  Elements:');
    allButtons.forEach(el => {
      console.log(`    - ${el.tag}: "${el.text}" ${el.href ? `(href: ${el.href})` : ''}`);
    });
  }

  // Step 5: Try clicking login/signup if found
  console.log('\nStep 5: Attempting to interact with auth buttons...');
  if (loginButton) {
    try {
      await loginButton.click();
      await page.waitForTimeout(2000);
      console.log(`  After login click, URL: ${page.url()}`);
      await page.screenshot({ path: 'after-login-click.png' });
      console.log('  Screenshot saved: after-login-click.png');
    } catch (e) {
      console.log(`  Login click error: ${e.message}`);
    }
  } else if (signupButton) {
    try {
      await signupButton.click();
      await page.waitForTimeout(2000);
      console.log(`  After signup click, URL: ${page.url()}`);
      await page.screenshot({ path: 'after-signup-click.png' });
    } catch (e) {
      console.log(`  Signup click error: ${e.message}`);
    }
  } else if (googleButton) {
    try {
      await googleButton.click();
      await page.waitForTimeout(2000);
      console.log(`  After Google button click, URL: ${page.url()}`);
      await page.screenshot({ path: 'after-google-click.png' });
    } catch (e) {
      console.log(`  Google button click error: ${e.message}`);
    }
  } else {
    console.log('  No auth buttons found to click');
  }

  // Step 6: Report console errors
  console.log('\n=== CONSOLE MESSAGES ===');
  const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
  if (consoleErrors.length === 0) {
    console.log('No console errors or warnings found.');
  } else {
    consoleErrors.forEach(msg => {
      console.log(`  [${msg.type.toUpperCase()}] ${msg.text}`);
    });
  }

  // Step 7: Report JS errors
  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) {
    console.log('No JavaScript errors found.');
  } else {
    errors.forEach(err => {
      console.log(`  ${err.type}: ${err.message}`);
    });
  }

  // Step 8: Report network failures
  console.log('\n=== NETWORK FAILURES ===');
  if (networkFailures.length === 0) {
    console.log('No network failures detected.');
  } else {
    networkFailures.forEach(fail => {
      console.log(`  ${fail.method} ${fail.url}`);
      console.log(`    Error: ${fail.failure}`);
    });
  }

  // Check for common UI issues
  console.log('\n=== UI CHECK ===');
  const viewport = page.viewportSize();
  console.log(`  Viewport: ${viewport.width}x${viewport.height}`);

  // Check for visible content
  const bodyContent = await page.$eval('body', el => el.innerText.length);
  console.log(`  Body text length: ${bodyContent} characters`);

  // Check for images
  const brokenImages = await page.$$eval('img', imgs =>
    imgs.filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.src)
  );
  if (brokenImages.length > 0) {
    console.log('  Broken images:');
    brokenImages.forEach(src => console.log(`    - ${src}`));
  } else {
    console.log('  No broken images detected.');
  }

  await browser.close();

  console.log('\n=== TEST COMPLETE ===\n');
}

testInventorAI().catch(console.error);
