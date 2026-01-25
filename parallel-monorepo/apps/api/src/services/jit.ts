import puppeteer from 'puppeteer';

export async function checkAvailability(url: string): Promise<'AVAILABLE' | 'SOLD' | 'ERROR'> {
  console.log(`[JIT] Checking: ${url}`);
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set User Agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    
    // Optimization: Block images/fonts to speed up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const content = await page.content();
    
    // Safety Checks (eBay)
    const isEnded = content.includes("This listing was ended") || 
                    content.includes("This listing has ended") ||
                    content.includes("Item sold");
                    
    const isSold = content.includes("span class=\"ux-textspans ux-textspans--BOLD\">Sold</span>");

    if (isEnded || isSold) {
      console.log(`[JIT] Status: SOLD`);
      return 'SOLD';
    }

    console.log(`[JIT] Status: AVAILABLE`);
    return 'AVAILABLE';

  } catch (error) {
    console.error(`[JIT] Error checking ${url}`, error);
    return 'ERROR'; // Fail open or closed? Usually fail closed for safety.
  } finally {
    if (browser) await browser.close();
  }
}