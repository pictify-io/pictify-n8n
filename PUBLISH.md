# Publish runbook — n8n-nodes-pictify

## One-time setup

1. Create the GitHub repo `pictify-io/n8n-nodes-pictify`:
   ```sh
   gh repo create pictify-io/n8n-nodes-pictify --public --source . --remote origin --push
   ```
2. Make sure the npm account `pictify` (or another org account with publish rights) is configured locally: `npm whoami`.
3. Confirm `package.json` `name` matches the npm package: `n8n-nodes-pictify`.

## Each release

1. Bump the version: `npm version patch|minor|major` (this also tags).
2. Build and lint:
   ```sh
   npm run build
   npm run lint
   ```
3. Publish (the `prepublishOnly` hook runs build + lint again):
   ```sh
   npm publish --access public
   ```
4. Push tags:
   ```sh
   git push --follow-tags
   ```

## Post-publish

1. Submit the package to the n8n Community Nodes registry so it shows up in the Cloud catalogue:
   - https://github.com/n8n-io/community-nodes-registry — open a PR adding the package entry.
2. Announce:
   - Tweet from `@pictify_io`
   - Post in the `#integrations` channel of the n8n community forum
   - Add a card to the Pictify changelog / blog
3. Verify install on a clean n8n instance:
   ```sh
   docker run -it --rm -p 5678:5678 -e N8N_COMMUNITY_PACKAGES_ENABLED=true n8nio/n8n
   ```
   Then Settings → Community Nodes → Install `n8n-nodes-pictify`.

## Smoke test before announce

- Render a template by ID and verify the returned `url`.
- Render raw HTML and check `width` / `height` honour the options.
- Render a GIF with two frames and verify the GIF playback.
- Render a PDF with Return Binary on and confirm the n8n binary item carries the right MIME type.
- Toggle Continue On Fail and pass a bad templateId — should not abort the workflow.

## Funnel instrumentation

- The credential test hits `GET /templates` — on the API side, log `source=n8n_community_node` via a User-Agent header in a follow-up version so we can attribute n8n installs to the signup funnel.
