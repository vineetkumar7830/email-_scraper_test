# Email Scraper Pro 🚀

Advanced email extraction tool for professional domain scanning and bulk processing. This project allows you to extract emails from websites, subpages (Contact, About, etc.), and supports both manual input and file uploads (Excel/CSV).

## 🛠️ Features
- **Web Dashboard**: Interactive UI to scan domains and upload files.
- **Bulk Extraction**: Process multiple domains simultaneously.
- **File Support**: Upload Excel (`.xlsx`) or CSV files to extract emails from listed domains.
- **Smart Scanning**: Automatically checks common subpages like `/contact`, `/about-us`, etc.
- **CLI Batch Processing**: Run background scripts to process `domains.csv`.

---

## 🚀 How to Run

### Prerequisite
Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### 1. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Start the Web Server (Recommended)
This will launch the interactive dashboard on port **3000**.
```bash
node server.js
```
Then, open your browser and go to: **[http://localhost:3000](http://localhost:3000)**

### 3. Run Batch Extraction (CLI)
To scan domains listed in `domains.csv` and save results to `emails_results.json`:
```bash
node batch_extract.js
```

### 4. Run Standard Extraction
To run the default test script:
```bash
node extract_emails.js
```

---

## 📂 Project Structure
- `server.js`: Express server and API logic.
- `index.html`: Frontend dashboard (Styled with Vanilla CSS).
- `batch_extract.js`: CSV processing script.
- `domains.csv`: Input file for batch processing.
- `emails_results.json`: Output of the batch extraction.

---

## 📄 License
ISC License – Feel free to use and modify for your projects.
