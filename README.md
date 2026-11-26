# Tableau Navigation Hub — Extension POC

This POC uses **Option 1**: dashboard images are rendered inside the custom Data App (not native Tableau Image objects). An author adds/replaces an image on each card through the extension UI. Only the status label is shown as a tag.

## What is included

- `index.html`, `styles.css`, `app.js` — extension UI and Tableau Extensions API logic
- `manifest.trex` — local extension manifest (points to localhost)
- `server.js` — no-dependency local static server
- `sample-dashboard-directory.csv` — sample directory rows
- `reference/original-wireframe.txt` — user's original HTML wireframe preserved for reference

## Excel / Tableau data structure

Create an Excel sheet named `Dashboard Directory` with these exact columns:

1. `Dashboard Tab Name` — sector tab, e.g. Finance, Health, Entertainment
2. `Dashboard Category` — grouping heading within a sector; not shown as a card tag
3. `Dashboard Name`
4. `Dashboard Link` — full Tableau Cloud view URL
5. `Status` — Live, Development, or Review

Do not put images in the crosstab. Add images using the **Add image** button on each card.

## Quick local POC

1. Install Node.js 18 or later.
2. Open a terminal in this folder and run `node server.js`.
3. Confirm `http://localhost:8080/index.html` loads in a browser.
4. Open Tableau Desktop, create a workbook, connect to the sample CSV or your Excel file, and create a worksheet named `Hub Directory`.
5. Put the five fields on the worksheet as a text table. Make sure each row is one dashboard and all five fields are visible. Use aliases only if the actual field names still match the required names; otherwise update the `FIELDS` array in `app.js`.
6. Create a dashboard and drag an **Extension** object onto it. Choose **Access Local Extensions** and select `manifest.trex`.
7. Allow the extension to access summary data.
8. In the extension, click **Configure**, select `Hub Directory`, then click **Use worksheet**.
9. Click **Add image** on a card, select a JPG/PNG/WebP, and test the card link and status filters.

## Tableau Cloud test

The extension URL in `manifest.trex` is localhost for the first POC only. To test in Tableau Cloud, host this folder on an HTTPS web server and change the `<url>` in `manifest.trex` to the hosted `index.html` URL. The `.trex` file is a local manifest used when adding the extension; the hosted page must be reachable by every viewer. Your Tableau Cloud admin must enable dashboard extensions and allowlist the hosted URL if required. Ensure the workbook/view allows Download Summary Data so the extension can read the directory worksheet.

## Image storage note

The POC compresses uploaded images to 640×360 JPEG and stores them in the extension's workbook settings as data URLs, keyed by `Dashboard Link`. This keeps the images out of the data crosstab and allows the workbook author to configure them. This is suitable for a small proof of concept only; workbook settings are not an image asset management system and large image collections can make the workbook settings heavy. For production, replace the `compressImage` + `saveImages` path with an authenticated upload to shared HTTPS object storage and save the returned image URL/reference in extension settings or a proper directory service.

## Limitations / test items

- This starter reads the **summary data** of a visible Tableau worksheet. Do not hide required fields from that worksheet. It does not query Excel directly; Tableau connects to Excel and the extension reads the worksheet view.
- The worksheet's five fields must be displayed in the crosstab. It is not a hidden worksheet/data-source API query.
- The extension's image configuration is available in authoring mode. Test permissions and settings persistence in your target Tableau Cloud site.
- Links open in a new browser tab. Confirm your organization's browser and Tableau Cloud policies allow this behavior.
- This is a starter POC, not a production-secured application. Review extension trust, CSP, storage, auth, and image hosting before broad deployment.

## Official API references

- Tableau Extensions API overview: https://tableau.github.io/extensions-api/docs/index.html
- Getting data from a worksheet: https://tableau.github.io/extensions-api/docs/core/trex_getdata/
- Settings persisted in workbook: https://tableau.github.io/extensions-api/api/interfaces/Settings.html
- Tableau Cloud extension allowlisting: https://help.tableau.com/current/online/en-us/dashboard_extensions_server.htm
