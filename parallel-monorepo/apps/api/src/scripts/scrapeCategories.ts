import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface CategoryNode {
  name: string;
  url: string;
  children: CategoryNode[];
}

async function scrapeEbayCategories() {
  console.log('Starting Poshmark Category Scrape...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Poshmark Categories
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://poshmark.com/categories', { waitUntil: 'domcontentloaded' });

  const categories = await page.evaluate(() => {
    const results: any[] = [];
    // Poshmark structure usually: .category-list-con -> .category-list -> .category-item
    const groups = document.querySelectorAll('.category-group'); // Hypothesis
    
    // Fallback: Dump all links that look like categories
    const links = document.querySelectorAll('a[href^="/category/"]');
    const seen = new Set();
    
    links.forEach(link => {
       const text = link.textContent?.trim();
       if (text && !seen.has(text)) {
          seen.add(text);
          results.push({ name: text, url: (link as HTMLAnchorElement).href });
       }
    });

    return results;
  });

  await browser.close();

  const outputPath = path.join(__dirname, '../data/poshmarkCategories.json');
  fs.writeFileSync(outputPath, JSON.stringify(categories, null, 2));
  console.log(`Scraped ${categories.length} categories to ${outputPath}`);
}

scrapeEbayCategories();
