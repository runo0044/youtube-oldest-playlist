# Copilot Agent Custom Instructions

You are an autonomous GitHub Copilot Agent. Your goal is to scaffold and implement a Chrome Manifest V3 extension in TypeScript that, when opened on any YouTube channel’s page, will:

1. **Environment validation**  
   - Verify that Node.js (≥14.x), npm or yarn, and TypeScript are installed.  
   - Verify that the Chrome browser is installed and developer‐mode extension loading is possible.  
   - Verify that the Google Cloud SDK (`gcloud`) is installed for automating API credentials.

2. **Project metadata**  
   - Use the placeholders:  
     - `name`: `test`  
     - `version`: `0.1`  
     - `description`: `test`

3. **Authentication automation**  
   - Use `gcloud` CLI to:  
     1. Create or select a GCP project named `test` (or infer from metadata).  
     2. Enable the YouTube Data API v3.  
     3. Create an API key and write it to `src/credentials/apiKey.json`.  
     4. Create an OAuth 2.0 Web Application client ID and secret, write to `src/credentials/oauth.json`.  
   - Fallback: if `gcloud` is not installed or fails, prompt the user interactively once.

4. **Extension structure (TypeScript)**  
   - **`src/manifest.json`** – Manifest V3 with metadata placeholders.  
   - **`src/background.ts`** – Service worker that calls `chrome.identity.getAuthToken()` and, if needed, falls back to `chrome.identity.launchWebAuthFlow()`.  
   - **`src/popup.html`, `src/popup.ts`, `src/styles.css`** – Minimal UI: a “Create Playlist” button and status log area.  
   - **`src/icons/`** – placeholder icons (16, 48, 128px).  
   - **`tsconfig.json`** – Target ES2020, module ESNext, outDir `dist/`.  
   - **`package.json`** – Scripts:  
     - `npm run build` → compile TS to `dist/`.  
     - `npm run lint` → run ESLint.  
     - `npm run check-env` → run environment‐check script.  

5. **Core behavior**  
   - On clicking “Create Playlist”:  
     1. Read current tab’s URL, extract channel ID or username.  
     2. Use YouTube Data API to fetch `contentDetails.relatedPlaylists.uploads`.  
     3. Page through all `playlistItems.list` (maxResults=50) to collect videoIds (already oldest→newest).  
     4. Call `playlists.insert` to make a new private playlist titled `{channelName} – oldest first`.  
     5. Call `playlistItems.insert` sequentially for each videoId.  
     6. Display generated playlist URL in popup.

6. **Error handling & quotas**  
   - Implement exponential‐backoff retries on 403/429.  
   - Log quota usage and warn if approaching limits.

7. **Build & packaging**  
   - After `npm run build`, zip up `dist/manifest.json`, `dist/*.js`, `dist/*.html`, `dist/*.css`, `dist/icons/` into `extension.zip` for upload.

8. **Chrome Web Store automation (bonus)**  
   - If `gcloud` or `chrome-cli` supports it, generate a Web Store upload token and push the new zip to the store. Otherwise, log instructions for manual upload.

9. **General coding style**  
   - Use idiomatic TypeScript, strict typing, async/await.  
   - ESLint with recommended rules, no external UI frameworks.  
   - Keep each source file under 300 lines.

---

When you run, first execute the `check-env` script; if any check fails, show clear guidance. Then scaffold the full TypeScript repository as above. Generate all files in `src/` with correct directory structure, and `package.json`/`tsconfig.json` at project root. Ensure credentials files are gitignored but scaffolded with `.gitignore`.  
