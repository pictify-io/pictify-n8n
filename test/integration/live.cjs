/**
 * Live integration test for the Pictify n8n node.
 *
 * Drives the ACTUAL compiled node (dist/) against the real Pictify API through a
 * stub IExecuteFunctions, so it exercises the node's real endpoint/body/response
 * logic — not a re-implementation.
 *
 * Run: PICTIFY_API_KEY=xxx PICTIFY_TEMPLATE_ID=XL13XACH2V npm run test:integration
 * Skips cleanly when PICTIFY_API_KEY is unset.
 */
const path = require('path');
const { Pictify } = require(path.join(__dirname, '..', '..', 'dist', 'nodes', 'Pictify', 'Pictify.node.js'));

const KEY = process.env.PICTIFY_API_KEY;
const TEMPLATE = process.env.PICTIFY_TEMPLATE_ID || 'XL13XACH2V';
const BASE = process.env.PICTIFY_BASE_URL || 'https://api.pictify.io';

if (!KEY) {
	console.log('SKIP: set PICTIFY_API_KEY to run live integration tests');
	process.exit(0);
}

// Minimal IExecuteFunctions stub. httpRequestWithAuthentication mirrors the
// pictifyApi credential: prepend the base URL + add the Bearer header, then
// make a real request.
function makeCtx(params) {
	return {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (params[name] !== undefined ? params[name] : fallback),
		getNode: () => ({ name: 'Pictify', type: 'pictify', typeVersion: 1 }),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async function (_cred, opts) {
				const headers = Object.assign(
					{ Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
					opts.headers || {},
				);
				const init = { method: opts.method || 'GET', headers };
				if (opts.body !== undefined && (opts.method || 'GET') !== 'GET') {
					init.body = JSON.stringify(opts.body);
				}
				const res = await fetch(BASE + opts.url, init);
				const text = await res.text();
				let json;
				try { json = JSON.parse(text); } catch { json = { raw: text }; }
				if (res.status >= 400) {
					const e = new Error('HTTP ' + res.status + ' ' + text.slice(0, 200));
					e.statusCode = res.status;
					throw e;
				}
				return json;
			},
			httpRequest: async function (opts) {
				const res = await fetch(opts.url, { method: opts.method || 'GET' });
				return Buffer.from(await res.arrayBuffer());
			},
			prepareBinaryData: async (buf, fileName) => ({ fileName, data: `<binary ${buf.length} bytes>` }),
		},
	};
}

async function run(label, params, assertFn) {
	try {
		const out = await new Pictify().execute.call(makeCtx(params));
		const json = out[0][0].json;
		console.log(`PASS  ${label} → ${assertFn(json)}`);
		return true;
	} catch (e) {
		console.log(`FAIL  ${label} → ${e.message}`);
		return false;
	}
}

(async () => {
	const r = [];

	r.push(await run('image · renderTemplate', {
		resource: 'image', operation: 'renderTemplate', templateId: TEMPLATE,
		variables: '{"name":"Ada","company":"Pictify"}', imageTemplateOptions: {},
	}, (j) => { const u = j.results && j.results[0] && j.results[0].url; if (!u) throw new Error('no results[0].url: ' + JSON.stringify(j).slice(0, 160)); return u; }));

	r.push(await run('image · renderHtml', {
		resource: 'image', operation: 'renderHtml',
		html: '<h1 style="font-family:sans-serif;padding:40px">hi from n8n integ</h1>',
		imageHtmlOptions: { width: 600, height: 300 },
	}, (j) => { if (!j.url) throw new Error('no url: ' + JSON.stringify(j).slice(0, 160)); return j.url; }));

	r.push(await run('image · renderBatch (async)', {
		resource: 'image', operation: 'renderBatch', templateId: TEMPLATE,
		items: '[{"variables":{"name":"A","company":"X"}},{"variables":{"name":"B","company":"Y"}}]',
		imageBatchOptions: {},
	}, (j) => { if (!j.batchId) throw new Error('no batchId: ' + JSON.stringify(j).slice(0, 160)); return `batchId=${j.batchId} status=${j.status}`; }));

	r.push(await run('gif · renderGif (html)', {
		resource: 'gif', operation: 'renderGif', gifSource: 'html',
		gifHtml: '<style>@keyframes p{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}.b{width:200px;height:200px;background:#3b82f6;animation:p 1s infinite}</style><div class="b"></div>',
		gifOptions: { width: 200, height: 200, quality: 'medium' },
	}, (j) => { const u = j.gif && j.gif.url; if (!u) throw new Error('no gif.url: ' + JSON.stringify(j).slice(0, 160)); return u; }));

	r.push(await run('pdf · renderPdf (template)', {
		resource: 'pdf', operation: 'renderPdf', pdfTemplateId: TEMPLATE,
		pdfVariables: '{"name":"Ada","company":"Pictify"}', pdfOptions: {},
	}, (j) => { const u = j.results && j.results[0] && j.results[0].url; if (!u) throw new Error('no pdf url: ' + JSON.stringify(j).slice(0, 160)); return u; }));

	r.push(await run('template · get', {
		resource: 'template', operation: 'get', templateId: TEMPLATE,
	}, (j) => { const uid = j.template && j.template.uid; if (uid !== TEMPLATE) throw new Error('uid mismatch: ' + JSON.stringify(j).slice(0, 160)); return `uid=${uid}`; }));

	r.push(await run('template · list', {
		resource: 'template', operation: 'list',
	}, (j) => { if (!Array.isArray(j.templates)) throw new Error('no templates[]: ' + JSON.stringify(j).slice(0, 160)); return `count=${j.templates.length}`; }));

	const passed = r.filter(Boolean).length;
	console.log(`\n${passed}/${r.length} passed`);
	process.exit(passed === r.length ? 0 : 1);
})();
