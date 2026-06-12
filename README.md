# klangkrabueang-md-worker

A Cloudflare Worker that serves HTML-to-Markdown conversion for AI agents visiting [คลังกระเบื้อง.com](https://xn--12cfjb8g6bl2ezag5e8e9e.com/).

Implements **Markdown for Agents** (`Accept: text/markdown` → `Content-Type: text/markdown`) on Cloudflare's Free plan.

## How it works

1. A **Route** (`xn--12cfjb8g6bl2ezag5e8e9e.com/*`) intercepts all requests to the domain
2. Requests for static assets (CSS, JS, images, fonts) are passed through immediately — no overhead
3. Browser subresource requests are filtered via `Sec-Fetch-Dest` header
4. Only requests with `Accept: text/markdown` are processed
5. The HTML response is fetched from origin, parsed with `linkedom`, and converted to Markdown
6. The result is cached in `caches.default` for subsequent requests
7. Response includes `Content-Type: text/markdown` + `x-markdown-tokens` / `x-original-tokens` headers

## Performance optimizations

- **Static asset bypass** — regex match on URL extensions skips CSS/JS/images/fonts before any header processing
- **`Sec-Fetch-Dest` filter** — browser subresource requests (`style`, `image`, `script`, etc.) are dropped immediately
- **Markdown response caching** — converted output cached with distinct query param (`?format=markdown`)
- **HTML size limit** — pages over 2MB are returned as-is to prevent OOM
- **Zero overhead for normal users** — only requests with `Accept: text/markdown` trigger conversion

## Tech stack

- **Runtime:** Cloudflare Workers (JavaScript)
- **HTML parser:** [linkedom](https://github.com/WebReflection/linkedom) — lightweight DOMPolyfill compatible with Workers
- **Deploy:** [wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

## Project structure

```
klangkrabueang-md-worker/
├── src/
│   └── index.js       # Worker script
├── wrangler.toml      # Worker configuration
├── package.json
└── README.md
```

## Deploy

The worker is connected to a **GitHub repository** (`AdminTFC/klangkrabueang-md-worker`) via Cloudflare Dashboard → **Git integration**. Pushing to the repo triggers an automatic build and deploy.

```bash
# Push changes to trigger auto-build
git add .
git commit -m "description"
git push
```

> **Note:** The dashboard editor (manual pasting) requires pre-bundled code and is NOT recommended. 

## Route

The Route `xn--12cfjb8g6bl2ezag5e8e9e.com/*` is configured at the Cloudflare Dashboard level (Compute → Workers & Pages → klangkrabueang-md-worker → Domains → Add Domain → Route pattern), not in `wrangler.toml`.

## Status

> **Note:** The Route was temporarily removed to avoid exceeding the free Workers 100k requests/day quota. Only re-enable on new early day or with a Workers Paid ($5/mo) plan. currently using this like script via code snippets directly in the website.
