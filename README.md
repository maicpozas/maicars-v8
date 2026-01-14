\
# MaiCars V8 — PWA + Netlify DB (Neon)

Esta versión integra base de datos **Postgres serverless** mediante **Netlify DB** (potenciado por Neon) y expone endpoints con **Netlify Functions**.

## Pasos rápidos
1. Vincula el repo en Netlify (Add new site → Import from Git) y configura:
   - Publish directory: `autos-pwa`
   - Functions directory: `netlify/functions`
2. Provisiona DB: en el dashboard del sitio → **Extensions** → **Neon Database** → **Add database**.
3. Instala deps: `npm i` (para `@netlify/neon`).
4. Local: `netlify dev`.
5. Deploy: `npm run deploy`.

Los endpoints viven en `/api/*` gracias al `netlify.toml`.
