# Dielle's Website

A responsive single-page website for **Dielle's Apiary and Meadery**, showcasing its honey wines, product variations, story, partners, and direct ordering channels.

## Highlights

- Branded preloader that prioritizes the hero image, logo, and core fonts.
- Responsive hero, featured-product slider, About, Products, Order, and footer sections.
- Data-driven products, variants, partner logos, contact details, promotions, and social links from `data.json`.
- Product cards with variation previews, badges, image cycling, tooltips, and adaptive desktop/mobile layouts.
- Product-detail popup with image gallery, click-to-zoom, variation selection, description expansion, tags, and a direct Order action.
- About-story popup with the Meadery and Apiary history, mission, vision, and accessibility-friendly scrolling.
- Google Maps embed with a local illustrated fallback if the embed is slow or unavailable.
- Shared tooltip, focus, hover, motion, and reduced-motion treatments throughout the interface.

## Project structure

```text
index.html   Main page markup and dialogs
index.css    Responsive styling, animations, and component styles
script.js    Data rendering, interactions, dialogs, sliders, and loading logic
data.json    Products, variants, partners, contact details, social links, and promo data
assets/      Fonts, logos, product/supporting images, and fallback artwork
```

## Running locally

This is a static website with no build step. Serve the folder with any local web server, then open the served URL in a browser. A local server is recommended so `data.json` can be fetched correctly.

For example, using VS Code's Live Server extension or another static-server tool, serve the project root containing `index.html`.

## Content updates

Most site content is maintained in `data.json`:

- Add or edit product variations, images, colors, tags, pricing, and sort order.
- Update partner names, logos, links, and tooltip text.
- Maintain contact information, socials, coordinates, and promotion details.

Product ordering in the Products section prioritizes products with **new** variants, then **best seller** variants, then sorts the remainder by `product_id`.
