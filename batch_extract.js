const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const urlModule = require('url');
const https = require('https');

// Read domains from domains.csv
const csvContent = fs.readFileSync('domains.csv', 'utf8');
const domains = csvContent.split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(line => line && line.toLowerCase() !== 'domain'); // Skip empty lines and header

console.log(`Loaded ${domains.length} domains from domains.csv`);

const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;

async function fetch(url) {
    try {
        const res = await axios.get(url, { 
            timeout: 8000, 
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        return res.data;
    } catch (err) {
        return '';
    }
}

function findEmails(html) {
    if (!html || typeof html !== 'string') return [];
    return (html.match(emailRegex) || []);
}

async function scan(domain) {
    let fullUrl = domain.startsWith('http') ? domain : 'https://' + domain;
    console.log(`\nScanning: ${fullUrl}`);
    
    const results = new Set();
    const homeHtml = await fetch(fullUrl);
    findEmails(homeHtml).forEach(e => results.add(e));
    
    const $ = cheerio.load(homeHtml);
    const links = new Set();
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
            const lowerHref = href.toLowerCase();
            const text = $(el).text().toLowerCase();
            if (lowerHref.includes('contact') || lowerHref.includes('about') || text.includes('contact')) {
                links.add(urlModule.resolve(fullUrl, href));
            }
        }
    });

    for (const link of [...links].slice(0, 3)) {
        console.log(`  -> Subpage: ${link}`);
        const subHtml = await fetch(link);
        findEmails(subHtml).forEach(e => results.add(e));
    }

    const final = [...results];
    console.log(`  Found: ${final.length} emails: ${JSON.stringify(final)}`);
    return { domain, emails: final };
}

(async () => {
    const allResults = [];
    for (const d of domains) {
        allResults.push(await scan(d));
    }
    fs.writeFileSync('emails_results.json', JSON.stringify(allResults, null, 2));
    console.log('\n✅ CSV BATCH EXTRACTION COMPLETE! Results saved to emails_results.json');
})();
