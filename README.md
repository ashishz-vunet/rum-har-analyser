# Vunet RUM HAR Analyzer

Web-based analyzer for HAR files containing RUM/OpenTelemetry exports.

The app helps inspect:
- `documentLoad` and child spans (including `webVitals`)
- web vitals (`value`, `delta`, `id`) in a readable UI
- trace trees with detailed per-trace/per-span drill-down
- span lifecycle/export health issues
- replay payload health and OTel attribute coverage
- raw request/response/headers from captured HAR entries

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- ESLint

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and upload a `.har` or `.json` file.

## Build

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```

## Project Structure

- `src/App.tsx` - main layout and dashboard composition
- `src/components/` - UI panels and explorer components
- `src/utils/` - HAR parsing and analysis logic
- `src/types/har.ts` - core data contracts
- `public/` - static assets (logo/favicon)

## Developer and Maintainer

- **Developer:** Ashish Zingade
- **Maintainer:** Ashish Zingade
- **Portfolio:** [https://ashishz.com](https://ashishz.com)
- **Company:** Vunet Systems

## License

This project is licensed under the Apache License 2.0.
See the [LICENSE](./LICENSE) file for details.
# rum-har-analyser
