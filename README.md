# RPF Barrack & Mess

One website, two dashboards (switch at the top). Data lives in a Google Sheet – nothing is stored in the browser.

- **Barrack Mode** – bed occupancy (Bed No, Rank, Name). Staff Barrack 100 beds, Officers' Rooms 10 beds, current vacant beds.
- **Mess Mode** – five tabs:
  - **Accounts** – Rank, Name, Bill to be paid, Security deposit, with totals
  - **Menu** – weekly Lunch / Dinner, with today's menu on top
  - **Daily Purchase** – date, item, quantity, unit, rate → amount; today / month totals
  - **Item Change** – when a menu item is replaced by another, and why
  - **Feedback** – anyone can send (no PIN); only editors can delete

Mess Commander contact: 9002081630.

## How it works

- **Public view**: Anyone opening the site sees live data from the Google Sheet (refreshed every 30 s).
- **Edit**: Click **Edit (PIN)** and enter the PIN you set in Google Apps Script. Only then can you add / edit / delete / vacate.
- **No localStorage**: When the sheet is connected, the site never stores data in the browser. All reads and writes go to the sheet.

## 1. Connect Google Sheets (do this first)

1. Create a Google Sheet → **Extensions → Apps Script** → delete the sample code → paste all of `Code.gs`.
2. **Project Settings (gear) → Script Properties** → add `EDIT_PIN` = your private PIN (e.g. `2580` or any secret you choose).
3. Choose `setup` in the function list → **Run** (approve permissions). This creates the tabs:
   **Barrack, Mess, Menu, Purchase, ItemChange, Feedback**.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the `/exec` URL.
5. In `app.js` set:
   ```js
   const SHEET_API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```
6. Reload the site. The badge should say **Live from Google Sheet**.

Every save writes rows to the sheet. You can also type rows directly into the sheet tabs and they appear on the site within 30 seconds.

After changing `Code.gs` later: **Deploy → Manage deployments → Edit → New version → Deploy**.

| Sheet tab   | Columns                                              |
|-------------|------------------------------------------------------|
| Barrack     | Section (Staff/Officers) · Bed No · Rank · Name      |
| Mess        | Rank · Name · Bill to be paid · Security Deposit     |
| Menu        | Day · Meal · Items                                   |
| Purchase    | Date (yyyy-mm-dd) · Item · Quantity · Unit · Rate · Amount |
| ItemChange  | Date · Old Item · New Item · Reason                  |
| Feedback    | ID · Date · Rank · Name · Rating (1-5) · Comment     |

## 2. Deploy the website on GitHub Pages (public for everyone)

1. Create a new public GitHub repository (e.g. `rpf-barrack-mess`).
2. Upload these files/folders to the root of the repo:
   - `index.html`
   - `app.js`
   - `style.css`
   - `Code.gs` (optional, for reference)
   - `README.md`
   - `images/` (with `background.jpg` and `RpfPostKgp.jpeg`)
3. In the repo go to **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`), folder `/ (root)`
   - Save.
4. After 1–2 minutes your site will be live at:
   `https://YOUR_USERNAME.github.io/rpf-barrack-mess/`

Anyone with that link can **view** all data. Only you (with the PIN) can **edit**.

## 3. Local testing

```bash
# from the project folder
python -m http.server 8000
# open http://localhost:8000
```

Add `?demo` to the URL to see sample data (nothing is saved or sent to the sheet).

## Security notes

- The real edit PIN lives only in Google Apps Script **Script Properties** (`EDIT_PIN`). It is never in the public website code when the sheet is connected.
- The client-side `EDIT_PIN` in `app.js` is used **only** when `SHEET_API_URL` is empty (offline mode).
- Feedback is open to everyone (rate-limited). All other writes require the correct PIN on the server.
- Do not commit a real PIN into `app.js` if you plan to keep the sheet connected.

## Settings in `app.js`

- `SHEET_API_URL` – the `/exec` URL from your Apps Script deployment
- `EDIT_PIN` – used only when no sheet is connected
- `BG_INTERVAL`, `BACKGROUNDS`, `UNITS`, `DEFAULT_MENU`


## Extra free pages (GitHub Pages)

| Page | URL | Purpose |
|------|-----|---------|
| **Today's menu** | `menu.html` | Clean public view of lunch & dinner + feedback form |
| **Notices** | `notices.html` | Notice board from the Google Sheet |
| **QR code** | `qr.html` | Printable QR that opens the live site on any phone |

### Notices setup

1. After updating `Code.gs`, run **setup** again in Apps Script (or manually create a sheet tab named **Notices**).
2. Columns: **Date** | **Title** | **Message** | **Active** | **Urgent**
3. Put `Yes` in Active to show the notice. Put `Yes` in Urgent for a red highlight.
4. Date format: `yyyy-mm-dd` (e.g. `2026-11-06`).
5. Redeploy the web app after changing `Code.gs` (Deploy → Manage deployments → Edit → New version).

Example row:
```
2026-11-06 | Water supply | Water will be off 10am–12pm for maintenance. | Yes | Yes
```

### QR code tip

Open `qr.html` on your phone or print it and stick it in the mess. Anyone can scan and open the site.
