# Today Gameboard (static)

A local-only, gamified daily schedule tracker:
- Base points per task
- Early-finish bonus
- Stores state in localStorage
- Export/import JSON for backup

## Run locally
Just open `index.html` in a browser.

## Deploy (recommended for private GitHub repo): Cloudflare Pages
1. Push this folder to a **private** GitHub repo
2. In Cloudflare: Pages → Create a project → Connect to Git
3. Select your repo
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Output directory: `/`
5. Deploy

## Notes
- This is a static site; no backend.
- Data is stored in the browser you use to access it. Use Export JSON to back up.
