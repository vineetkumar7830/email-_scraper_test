const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");
const urlModule = require("url");

const websites = [
  "https://clrsolutions.net/",
  "https://macmediamarketing.com/",
  "https://www.mooretechsolutions.com/"
];

// A more robust email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return res.data;
  } catch (err) {
    console.error(`Error fetching ${url}: ${err.message}`);
    return null;
  }
}

function findEmails(html) {
  if (!html) return [];
  const matches = html.match(emailRegex);
  return matches ? [...new Set(matches)] : [];
}

function findRelevantLinks(html, baseUrl) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const links = new Set();
  
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    
    const absoluteUrl = urlModule.resolve(baseUrl, href);
    const lowerHref = href.toLowerCase();
    const text = $(el).text().toLowerCase();
    
    // Check for "Contact", "About", "Team", "Support", "Privacy" patterns
    const keywords = ["contact", "about", "team", "staff", "reach", "privacy", "support"];
    const isRelevant = keywords.some(k => lowerHref.includes(k) || text.includes(k));
    
    // Ensure the link stays within the same domain
    if (isRelevant && absoluteUrl.startsWith(baseUrl)) {
      links.add(absoluteUrl);
    }
  });

  return [...links].slice(0, 5); // Limit to top 5 relevant subpages to avoid infinite loops/over-scraping
}

async function scanSite(siteUrl) {
  console.log(`\n--- Scanning Site: ${siteUrl} ---`);
  const results = new Set();
  
  // 1. Scan Homepage
  console.log(`Scanning homepage: ${siteUrl}`);
  const homeHtml = await fetchHtml(siteUrl);
  findEmails(homeHtml).forEach(e => results.add(e));
  
  // 2. Discover Subpages
  const subpages = findRelevantLinks(homeHtml, siteUrl);
  console.log(`Found ${subpages.length} relevant subpages:`, subpages);
  
  // 3. Scan Subpages
  for (const subpage of subpages) {
    console.log(`Scanning subpage: ${subpage}`);
    const subHtml = await fetchHtml(subpage);
    findEmails(subHtml).forEach(e => results.add(e));
  }
  
  const finalEmails = [...results];
  console.log(`Finished ${siteUrl}. Found: ${JSON.stringify(finalEmails)}`);
  return { site: siteUrl, emails: finalEmails };
}

(async () => {
  let allResults = [];

  for (let site of websites) {
    const result = await scanSite(site);
    allResults.push(result);
  }

  fs.writeFileSync("emails.json", JSON.stringify(allResults, null, 2));
  console.log("\nAdvanced extraction compete. Results saved to emails.json");
})();
