# Prime Safety & Compliance Services — Phase 2 Responsive Build

This is the static Phase 2 website build for Prime Safety & Compliance Services.

## Key implementation notes

- Prime Safety branding, original logo, supplied project photography, typography and navy/orange palette are retained.
- `js/app.js` is the original quote submission implementation and must not be edited. It retains the original Supabase URL and publishable key.
- `js/site-ui.js` contains the UI/navigation layer. The homepage mobile navigation uses a capture-phase handler so it cannot conflict with the legacy navigation click handler already present in `app.js`.
- Google address autocomplete is implemented in `js/maps-autocomplete.js` using the Google Maps JavaScript API Places Autocomplete Data API. The existing `#site` input remains the quote form source-of-truth.

## Google Maps setup

1. Create/use a Google Cloud project.
2. Enable **Maps JavaScript API** and **Places API (New)**.
3. Create a browser API key.
4. Restrict that key to the website HTTP referrers for the production domain and restrict the key to only the APIs used by this feature.
5. Put the browser key in `js/maps-config.js`:

```js
window.PRIME_SAFETY_GOOGLE_MAPS_KEY = 'YOUR_GOOGLE_MAPS_BROWSER_KEY';
```

The autocomplete code fails gracefully to normal text entry when a key is not configured.

## SEO / AIO / GEO additions

- `llms.txt` provides a concise machine-readable business/service summary.
- Homepage includes explicit business/service/service-area entity content.
- Service pages include concise answer-first summaries suitable for users and answer engines.
- Canonical non-www domain is used consistently.
- `hreflang=en-AU`, Open Graph and location metadata are included where appropriate.
- Existing internal service-page linking is retained and strengthened.
- Resources include external references to authoritative WorkSafe WA and Cm3 material.
- `robots.txt` points to the XML sitemap.

## Backlinks

Website code can create useful outbound references and internal links, but true backlinks (incoming links from third-party websites) must be earned or published by those external sites. No fabricated or paid backlink claims are included in this build.

## Final September 2026 QA updates

- Added unique meta descriptions and self-referencing canonicals to the legal pages while keeping them `noindex,follow` pending client-approved legal copy.
- Refined `robots.txt` so legal-page `noindex` directives can be crawled and discovered correctly; sitemap remains the canonical discovery file.
- Added a responsive mobile sticky `Call` + `Request a Quote` conversion bar across all HTML pages, including iOS safe-area handling.
- Added an answer-first local service-area section to the homepage for Perth metro, regional WA and interstate-by-arrangement intent.
- Expanded homepage LocalBusiness knowledge and service-offer structured data using only visible, client-supported services.
- Expanded `llms.txt` with answer-ready service, geography, standards and independence facts for AI retrieval/context.
- Consolidated duplicate `areaServed` structured-data keys on the homepage.
- Original `js/app.js` remains unchanged; SHA-256: `091da65e919ae5ad8fc3b1151e812c7c2941ade3d69d1f3ff7250bcb225a6a68`.
