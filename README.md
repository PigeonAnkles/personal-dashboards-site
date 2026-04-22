# Personal Dashboards

A static GitHub Pages site that syncs multiple public Google Sheets into a single personal dashboard.

## Local usage

```bash
npm run refresh
npm run start
```

Then open `http://localhost:4173`.

`npm run refresh` runs the data sync first and then builds the site. If you run the commands separately, keep this order:

```bash
npm run sync-data
npm run build
npm run start
```

## GitHub Pages setup

1. Create a new GitHub repository and upload these files.
2. Push to the `main` branch.
3. In GitHub, open `Settings -> Pages`.
4. Set the source to `GitHub Actions`.
5. The workflow in `.github/workflows/deploy.yml` will sync data, build, and deploy automatically.

The workflow runs on pushes to `main`, on manual dispatch, and every 6 hours. The Google Sheets used by `config/sheets.mjs` must be publicly readable for GitHub Actions to sync them.
