# n8n-nodes-pictify

This is an n8n community node. It lets you use [Pictify](https://pictify.io) in your n8n workflows to generate **images, animated GIFs, and PDFs** from HTML templates.

Pictify is the open API for rendering on-brand visuals at scale — Open Graph cards, social images, product photos, animated GIFs, certificates, invoices, and more.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Example workflows](#example-workflows) · [Resources](#resources)

---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In short:

1. Go to **Settings → Community Nodes** in your n8n instance.
2. Click **Install**.
3. Enter `n8n-nodes-pictify` and confirm.

After install, the **Pictify** node appears in the node picker.

## Credentials

You need a Pictify API key. Create one at [pictify.io](https://pictify.io) → Settings → API Keys.

In n8n: **Credentials → New → Pictify API**

| Field    | Description                                                  |
| -------- | ------------------------------------------------------------ |
| API Key  | Your Pictify API key                                         |
| Base URL | `https://api.pictify.io` (only change for self-hosted setups)|

The credential is validated by calling `GET /templates` on save.

## Operations

### Image

- **Render From Template** — render a saved template with variables (e.g. OG cards, social posts)
- **Render From HTML** — render raw HTML + CSS into an image
- **Render Batch** — render up to 500 variants from one template in a single call

### GIF

- **Render GIF** — render an animated GIF from a template (frames as variable sets) or from HTML

### PDF

- **Render PDF** — render a PDF from a template or HTML, with page format and margin controls

### Template

- **Get** — fetch one template (returns variables it accepts)
- **List** — list all templates on your account

Every operation supports the standard n8n options:

- **Return Binary** — download the rendered file and attach it as a binary property (great for emailing, uploading to S3/Drive, etc.)
- **Continue On Fail** — keep the workflow running even if one render fails

## Example workflows

**1. Generate an Open Graph image per blog post**

`Postgres → Pictify (Render From Template)` — pull rows from your CMS, render an OG image per post using a saved Pictify template, save the URL back.

**2. Email a personalised certificate as PDF**

`Webhook → Pictify (Render PDF, Return Binary) → Gmail/Send Email` — take a name/course from a form submission, render a certificate PDF, attach to email.

**3. Animated product GIF for Slack alerts**

`Shopify Trigger → Pictify (Render GIF) → Slack` — when an order ships, render a celebratory GIF and post it to a channel.

**4. Bulk social-card generation**

`Google Sheets → Pictify (Render Batch)` — render hundreds of social cards in one node execution.

## Resources

- [Pictify API documentation](https://docs.pictify.io)
- [Pictify templates gallery](https://pictify.io/templates)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Version history

### 0.1.0 — Initial release

- Image rendering from template, HTML, and batch
- Animated GIF rendering
- PDF rendering
- Template list / get
- Binary download support
- Layout variants

## License

[MIT](LICENSE.md)
