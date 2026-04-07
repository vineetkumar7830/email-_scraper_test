const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const https = require("https");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;

// Clean domain function
function cleanDomain(input) {
    if (!input || typeof input !== "string") return null;
    input = input.trim();
    if (!input) return null;

    if (!/^https?:\/\//i.test(input)) {
        input = "http://" + input;
    }

    try {
        const url = new URL(input);
        return url.hostname.replace(/^www\./, "");
    } catch (e) {
        return null;
    }
}

// Fetch emails from URL
async function fetchEmailsFromURL(url) {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }),
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const html = response.data;
        if (!html || typeof html !== 'string') return [];

        const matches = html.match(emailRegex);
        return matches ? [...new Set(matches)] : [];

    } catch (err) {
        console.error(`Error fetching ${url}: ${err.message}`);
        return [];
    }
}

// Extract emails from domain
async function extractEmails(domain) {
    if (!/^https?:\/\//i.test(domain)) {
        domain = "https://" + domain;
    }

    const paths = [
        "/", "/contact", "/contact-us",
        "/about", "/about-us",
        "/support", "/team",
        "/contact/", "/contacts"
    ];

    let allUniqueEmails = new Set();

    for (let path of paths) {
        const url = domain.replace(/\/$/, "") + path;
        console.log(`Checking path: ${url}`);
        const found = await fetchEmailsFromURL(url);
        found.forEach(e => allUniqueEmails.add(e));
    }

    return [...allUniqueEmails];
}

// API endpoint for manual domain input
app.post("/extract", async (req, res) => {
    const domainsRaw = req.body.domains;
    if (!domainsRaw) return res.status(400).json({ error: "No domains provided" });

    const domains = domainsRaw.split(/[\r\n, ]+/);
    const result = await processDomains(domains);
    res.json({ total: result.length, data: result });
});

// New API endpoint for File Upload (Excel/CSV)
app.post("/extract-file", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Find the domain column
        let domains = [];
        if (rows.length > 0) {
            const firstRow = rows[0];
            const domainKey = Object.keys(firstRow).find(key => 
                ["domain", "website", "url", "link", "site", "company"].includes(key.toLowerCase())
            );

            if (domainKey) {
                domains = rows.map(row => row[domainKey]).filter(Boolean);
            } else {
                // If no clear column name, try to find any value that looks like a domain
                domains = rows.map(row => Object.values(row).find(val => typeof val === "string" && val.includes("."))).filter(Boolean);
            }
        }

        // Cleanup the uploaded file
        fs.unlinkSync(req.file.path);

        const result = await processDomains(domains);
        res.json({ total: result.length, data: result });

    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "Error processing the uploaded file" });
    }
});

async function processDomains(domains) {
    const result = [];
    for (let raw of domains) {
        raw = String(raw).trim();
        if (!raw) continue;

        let domain = cleanDomain(raw);
        if (!domain) {
            result.push({ input: raw, error: "Invalid domain" });
            continue;
        }

        console.log(`\n--- Extracting emails for: ${domain} ---`);
        const emails = await extractEmails(domain);
        result.push({ domain, count: emails.length, emails });
    }
    return result;
}

// Explicitly serve index.html for the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
