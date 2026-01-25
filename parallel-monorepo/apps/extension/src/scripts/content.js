// PARALLEL INGESTION ENGINE v1.1
// Execution: Client-Side (Chrome Extension)

console.log("%c// PARALLEL INGESTION LOADED", "color: #A3E635; background: #0B1120; font-size: 14px; padding: 4px;");

// Data Schema
const scrapedData = {
  source_platform: "ebay",
  source_id: null,
  title: null,
  price_source: 0.00,
  shipping_source: 0.00,
  currency: "USD",
  images: [],
  description_html: null,
  seller_rating_score: null,
  seller_rating_count: null,
  url: window.location.href
};

function cleanPrice(text) {
  if (!text) return 0.00;
  return parseFloat(text.replace(/[$,]/g, ""));
}

function scrapeItemPage() {
  try {
    // 1. ID & Title
    const urlPath = window.location.pathname;
    const idMatch = urlPath.match(/\/itm\/(\d+)/);
    if (idMatch) scrapedData.source_id = idMatch[1];
    
    const titleEl = document.querySelector(".x-item-title__mainTitle") || document.querySelector("#itemTitle");
    if (titleEl) scrapedData.title = titleEl.innerText.replace("Details about", "").trim();

    // 2. Price (Strategy: JSON-LD -> Meta Tags -> DOM)
    
    // A. JSON-LD (Most Reliable)
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson) {
      try {
        const json = JSON.parse(ldJson.innerText);
        const product = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : json;
        
        if (product) {
          // Images
          if (product.image) {
             const imgs = Array.isArray(product.image) ? product.image : [product.image];
             // Ensure they are strings
             imgs.forEach(url => {
                if (typeof url === 'string') scrapedData.images.push(url);
             });
             console.log("Parallel: Found Images in JSON-LD", scrapedData.images.length);
          }

          if (product.offers) {
             // Handle offers being an array or object
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          
          if (offer) {
             const price = offer.price || offer.lowPrice || offer.highPrice;
             if (price) {
                scrapedData.price_source = parseFloat(price);
                console.log("Parallel: Found Price in JSON-LD", price);
             }
             if (offer.priceCurrency) scrapedData.currency = offer.priceCurrency;
          }
        }
      } // End if(product)
      } catch (e) {
        console.log("JSON-LD parse failed", e);
      }
    }

    // A2. Meta Tags
    if (!scrapedData.price_source) {
       const metaPrice = document.querySelector('meta[property="og:price:amount"]');
       if (metaPrice) scrapedData.price_source = parseFloat(metaPrice.content);
    }

    // B. DOM Selectors
    if (!scrapedData.price_source) {
      const priceSelectors = [
        ".x-price-primary", 
        ".x-price-approx__price", 
        "#prcIsum",
        ".vim.x-price-section .x-price-primary span",
        "[itemprop='price']"
      ];
      
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          scrapedData.price_source = cleanPrice(el.innerText);
          if (scrapedData.price_source > 0) break;
        }
      }
    }

    // C. Nuclear Regex (Last Resort)
    if (!scrapedData.price_source) {
       // Look for "US $245.00" pattern in visible text
       const bodyText = document.body.innerText;
       const priceMatch = bodyText.match(/US\s?\$([0-9,]+\.[0-9]{2})/);
       if (priceMatch) {
          scrapedData.price_source = cleanPrice(priceMatch[1]);
          console.log("Parallel: Found Price via Regex", scrapedData.price_source);
       }
    }

    // Safety fallback
    if (isNaN(scrapedData.price_source)) scrapedData.price_source = 0;

    // 3. Shipping
    const shippingEl = document.querySelector(".ux-labels-values--shipping .ux-textspans--BOLD") || document.querySelector("#fshippingCost");
    if (shippingEl) {
      const shippingText = shippingEl.innerText.toLowerCase();
      if (shippingText.includes("free")) {
        scrapedData.shipping_source = 0.00;
      } else {
        scrapedData.shipping_source = cleanPrice(shippingEl.innerText);
      }
    }

    const imageSet = new Set(scrapedData.images); // Start with JSON-LD images

    // 4. Images (DOM Fallback/Supplement)
    const domSelectors = [
        ".ux-image-carousel-item img", 
        ".ux-image-filmstrip-carousel img", 
        ".ux-image-grid-item img",
        "#icImg"
    ];

    domSelectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        console.log(`Parallel: Selector ${sel} found ${els.length} images`);
        els.forEach(img => {
            let src = img.src;
            if (img.dataset.zoomSrc) src = img.dataset.zoomSrc;
            if (src) {
                src = src.replace(/s-l\d+\.jpg/, "s-l1600.jpg");
                imageSet.add(src);
            }
        });
    });
    
    scrapedData.images = Array.from(imageSet);
    console.log("Parallel: Final Image Count", scrapedData.images.length);

    // 5. Seller Metrics
    const sellerPanel = document.querySelector(".x-sellercard-atf");
    if (sellerPanel) {
        const text = sellerPanel.innerText;
        const scoreMatch = text.match(/(\d+\.?\d*)%/); 
        if (scoreMatch) scrapedData.seller_rating_score = parseFloat(scoreMatch[1]);
        const countMatch = text.match(/\((\d+)\)/); 
        if (countMatch) scrapedData.seller_rating_count = parseInt(countMatch[1]);
    }

    return scrapedData;

  } catch (e) {
    console.error("Parallel Scraper Error:", e);
    return null;
  }
}

// Listen for messages from the Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_PAGE") {
    const data = scrapeItemPage();
    if (data && data.title) {
      sendResponse({ status: "SUCCESS", payload: data });
    } else {
      sendResponse({ status: "ERROR", message: "Could not find item data." });
    }
  }
  return true; // Keep channel open for async response
});