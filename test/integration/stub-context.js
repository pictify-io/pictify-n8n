'use strict';

/**
 * Stub IExecuteFunctions for driving the REAL Pictify node against the LIVE API.
 *
 * This implements only the surface the node actually uses (see
 * nodes/Pictify/Pictify.node.ts):
 *   - getInputData()                 -> a single empty item: [{ json: {} }]
 *   - getNodeParameter(name, i, def) -> the params configured for the operation
 *   - getNode()                      -> a dummy INode (used for NodeOperationError)
 *   - continueOnFail()               -> false (so failures throw and fail the test)
 *   - helpers.httpRequestWithAuthentication(credType, requestOptions)
 *         -> a REAL fetch against https://api.pictify.io with Bearer auth,
 *            mimicking the `pictifyApi` credential (baseURL + Authorization).
 *   - helpers.httpRequest(opts)      -> a REAL GET (binary download path)
 *   - helpers.prepareBinaryData(buf, filename) -> a tiny stub (no real n8n binary store)
 *
 * Nothing here re-implements the node's mapping logic — the node builds the
 * endpoint/body/method itself; we only fulfill the host contract it calls into.
 */

const BASE_URL = process.env.PICTIFY_BASE_URL || 'https://api.pictify.io';

/**
 * Build a stub context bound to a single operation's parameters.
 *
 * @param {Record<string, unknown>} params  flat map of node-parameter name -> value
 *        (exactly what getNodeParameter(name) should return for this run)
 * @param {{ onRequest?: Function }} [hooks] optional observability hooks
 */
function makeContext(params, hooks = {}) {
	const apiKey = process.env.PICTIFY_API_KEY;

	const ctx = {
		getInputData() {
			return [{ json: {} }];
		},

		getNodeParameter(name, _itemIndex, fallback) {
			if (Object.prototype.hasOwnProperty.call(params, name)) {
				return params[name];
			}
			// Mirror n8n: when a param isn't set, return the caller-supplied default.
			return fallback;
		},

		getNode() {
			return {
				id: 'pictify-integration-test-node',
				name: 'Pictify',
				type: 'n8n-nodes-pictify.pictify',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
		},

		continueOnFail() {
			return false;
		},

		helpers: {
			/**
			 * Mimic the `pictifyApi` credential: prepend baseURL, add the Bearer
			 * Authorization + Content-Type headers, then perform a REAL request.
			 */
			async httpRequestWithAuthentication(_credType, requestOptions) {
				const url = `${BASE_URL}${requestOptions.url}`;
				const method = requestOptions.method || 'GET';

				const headers = {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-nodes-pictify/1.0.0',
					...(requestOptions.headers || {}),
				};

				const init = { method, headers };
				if (method !== 'GET' && requestOptions.body !== undefined) {
					// requestOptions.json === true => body is a JS object to be JSON-encoded.
					init.body = JSON.stringify(requestOptions.body);
				}

				if (hooks.onRequest) hooks.onRequest({ url, method, body: requestOptions.body });

				const res = await fetch(url, init);
				const text = await res.text();
				let parsed;
				try {
					parsed = text ? JSON.parse(text) : {};
				} catch {
					parsed = text;
				}

				if (!res.ok) {
					const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
					throw new Error(`HTTP ${res.status} ${method} ${url} -> ${detail}`);
				}

				return parsed;
			},

			/** Real GET used by the node's binary-download branch. */
			async httpRequest(opts) {
				const res = await fetch(opts.url, { method: opts.method || 'GET' });
				if (!res.ok) {
					throw new Error(`HTTP ${res.status} GET ${opts.url}`);
				}
				const arrayBuffer = await res.arrayBuffer();
				return Buffer.from(arrayBuffer);
			},

			/** Stub: the node only forwards the result; we don't have an n8n binary store. */
			async prepareBinaryData(_buffer, filename) {
				return { fileName: filename, data: '<omitted>' };
			},
		},
	};

	return ctx;
}

module.exports = { makeContext, BASE_URL };
