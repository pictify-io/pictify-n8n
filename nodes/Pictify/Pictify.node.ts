import type {
	IExecuteFunctions,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class Pictify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pictify',
		name: 'pictify',
		icon: 'file:pictify.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate images, GIFs, and PDFs from HTML templates with Pictify',
		defaults: {
			name: 'Pictify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pictifyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'n8n-nodes-pictify/1.0.2',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'GIF', value: 'gif' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'Template', value: 'template' },
				],
				default: 'image',
			},

			// ============ IMAGE OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{
						name: 'Render From Template',
						value: 'renderTemplate',
						action: 'Render an image from a template',
						description: 'Generate an image by passing variables to a saved template',
					},
					{
						name: 'Render From HTML',
						value: 'renderHtml',
						action: 'Render an image from raw HTML',
						description: 'Generate an image from raw HTML (use inline CSS or a style block)',
					},
					{
						name: 'Render Batch',
						value: 'renderBatch',
						action: 'Render many images from one template',
						description:
							'Submit an async batch render of one template across many variable sets (max 100). Returns a batch ID; rendered URLs are delivered via webhook.',
					},
				],
				default: 'renderTemplate',
			},

			// ============ GIF OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['gif'] } },
				options: [
					{
						name: 'Render GIF',
						value: 'renderGif',
						action: 'Render an animated GIF',
						description: 'Render an animated GIF from a template or raw HTML (source must animate)',
					},
				],
				default: 'renderGif',
			},

			// ============ PDF OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pdf'] } },
				options: [
					{
						name: 'Render PDF',
						value: 'renderPdf',
						action: 'Render a PDF document',
						description: 'Render a PDF from a saved template by passing variables',
					},
				],
				default: 'renderPdf',
			},

			// ============ TEMPLATE OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a template',
						description: 'Fetch a single template by ID',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List templates',
						description: 'List all templates on your account',
					},
				],
				default: 'list',
			},

			// ============ COMMON: TEMPLATE ID ============
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'XL13XACH2V',
				description: 'UID of the Pictify template to render',
				displayOptions: {
					show: {
						resource: ['image', 'template'],
						operation: ['renderTemplate', 'renderBatch', 'get'],
					},
				},
			},

			// ============ IMAGE: Render From Template ============
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'JSON object of variables to inject into the template',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderTemplate'] },
				},
			},

			// ============ IMAGE: Render From HTML ============
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				description: 'Raw HTML to render. Style it with inline CSS or a &lt;style&gt; block — the image endpoint takes HTML only (no separate CSS field).',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderHtml'] },
				},
			},

			// ============ IMAGE: Render Batch ============
			{
				displayName: 'Items',
				name: 'items',
				type: 'json',
				default: '[\n  { "variables": { "name": "Ada", "company": "Pictify" } }\n]',
				required: true,
				description:
					'Array of items to render (max 100). Each item has a `variables` object that is mapped to one variable set.',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderBatch'] },
				},
			},

			// ============ IMAGE: Render From HTML — options ============
			{
				displayName: 'Output Options',
				name: 'imageHtmlOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['image'], operation: ['renderHtml'] },
				},
				options: [
					{
						displayName: 'Binary Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property to attach the rendered image to',
						displayOptions: { show: { returnBinary: [true] } },
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'JPG', value: 'jpg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'WebP', value: 'webp' },
						],
						default: 'png',
						description: 'Output image format (sent as fileExtension)',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 720,
					},
					{
						displayName: 'Return Binary',
						name: 'returnBinary',
						type: 'boolean',
						default: false,
						description:
							'Whether to download the rendered image and return it as a binary property on the item',
					},
					{
						displayName: 'Selector',
						name: 'selector',
						type: 'string',
						default: '',
						description: 'CSS selector to crop the screenshot to a specific element',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 1280,
					},
				],
			},

			// ============ IMAGE: Render From Template — options ============
			{
				displayName: 'Output Options',
				name: 'imageTemplateOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['image'], operation: ['renderTemplate'] },
				},
				options: [
					{
						displayName: 'Binary Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property to attach the rendered image to',
						displayOptions: { show: { returnBinary: [true] } },
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'JPG', value: 'jpg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'WebP', value: 'webp' },
						],
						default: 'png',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 0,
						description: 'Output height in pixels (10–4096). Leave 0 to use the template default.',
					},
					{
						displayName: 'Layout',
						name: 'layout',
						type: 'string',
						default: '',
						description: 'Optional single layout variant name (e.g. "square", "story")',
					},
					{
						displayName: 'Layouts',
						name: 'layouts',
						type: 'string',
						default: '',
						placeholder: 'default,square,story',
						description:
							'Comma-separated layout variant names to render in one call (max 20). Use "default" for the base layout.',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						typeOptions: { minValue: 0.1, maxValue: 1, numberPrecision: 2 },
						default: 0.9,
						description: 'Render quality for raster/JPEG output (0.1–1.0)',
					},
					{
						displayName: 'Return Binary',
						name: 'returnBinary',
						type: 'boolean',
						default: false,
						description:
							'Whether to download the rendered image and return it as a binary property on the item',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 0,
						description: 'Output width in pixels (10–4096). Leave 0 to use the template default.',
					},
				],
			},

			// ============ IMAGE: Render Batch — options ============
			{
				displayName: 'Output Options',
				name: 'imageBatchOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['image'], operation: ['renderBatch'] },
				},
				options: [
					{
						displayName: 'Concurrency',
						name: 'concurrency',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 10 },
						default: 5,
						description: 'Maximum parallel renders (1–10)',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'JPG', value: 'jpg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'WebP', value: 'webp' },
						],
						default: 'png',
					},
					{
						displayName: 'Layout',
						name: 'layout',
						type: 'string',
						default: '',
						description: 'Optional single layout variant name applied to every item',
					},
					{
						displayName: 'Layouts',
						name: 'layouts',
						type: 'string',
						default: '',
						placeholder: 'default,square,story',
						description:
							'Comma-separated layout variant names applied to every item (max 20)',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						typeOptions: { minValue: 0.1, maxValue: 1, numberPrecision: 2 },
						default: 0.9,
						description: 'Render quality for raster/JPEG output (0.1–1.0)',
					},
				],
			},

			// ============ GIF FIELDS ============
			{
				displayName: 'Source',
				name: 'gifSource',
				type: 'options',
				options: [
					{ name: 'Template', value: 'template' },
					{ name: 'HTML', value: 'html' },
				],
				default: 'html',
				description:
					'The source must contain a CSS animation (or other motion); a static source cannot be rendered as a GIF',
				displayOptions: { show: { resource: ['gif'], operation: ['renderGif'] } },
			},
			{
				displayName: 'Template ID',
				name: 'gifTemplateId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'XL13XACH2V',
				displayOptions: {
					show: { resource: ['gif'], operation: ['renderGif'], gifSource: ['template'] },
				},
			},
			{
				displayName: 'Variables',
				name: 'gifVariables',
				type: 'json',
				default: '{}',
				description: 'JSON object of variables to inject into the template',
				displayOptions: {
					show: { resource: ['gif'], operation: ['renderGif'], gifSource: ['template'] },
				},
			},
			{
				displayName: 'HTML',
				name: 'gifHtml',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				required: true,
				description: 'Raw HTML to animate into a GIF. Include the CSS animation inline or in a &lt;style&gt; block.',
				displayOptions: {
					show: { resource: ['gif'], operation: ['renderGif'], gifSource: ['html'] },
				},
			},
			{
				displayName: 'GIF Options',
				name: 'gifOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { resource: ['gif'], operation: ['renderGif'] } },
				options: [
					{
						displayName: 'Binary Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property to attach the rendered GIF to',
						displayOptions: { show: { returnBinary: [true] } },
					},
					{ displayName: 'Height', name: 'height', type: 'number', default: 600 },
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'options',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
						default: 'medium',
						description: 'GIF quality preset',
					},
					{
						displayName: 'Return Binary',
						name: 'returnBinary',
						type: 'boolean',
						default: false,
						description:
							'Whether to download the rendered GIF and return it as a binary property on the item',
					},
					{ displayName: 'Width', name: 'width', type: 'number', default: 800 },
				],
			},

			// ============ PDF FIELDS (template-only) ============
			{
				displayName: 'Template ID',
				name: 'pdfTemplateId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'XL13XACH2V',
				description: 'UID of the Pictify template to render as a PDF',
				displayOptions: {
					show: { resource: ['pdf'], operation: ['renderPdf'] },
				},
			},
			{
				displayName: 'Variables',
				name: 'pdfVariables',
				type: 'json',
				default: '{}',
				description: 'JSON object of variables to inject into the template',
				displayOptions: {
					show: { resource: ['pdf'], operation: ['renderPdf'] },
				},
			},
			{
				displayName: 'PDF Options',
				name: 'pdfOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { resource: ['pdf'], operation: ['renderPdf'] } },
				options: [
					{
						displayName: 'Binary Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property to attach the rendered PDF to',
						displayOptions: { show: { returnBinary: [true] } },
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 0,
						description: 'Output height in pixels. Leave 0 to use the template default.',
					},
					{
						displayName: 'Return Binary',
						name: 'returnBinary',
						type: 'boolean',
						default: false,
						description:
							'Whether to download the rendered PDF and return it as a binary property on the item',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 0,
						description: 'Output width in pixels. Leave 0 to use the template default.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let endpoint = '';
				let method: IHttpRequestMethods = 'POST';
				const body: IDataObject = {};

				let wantsBinary = false;
				let binaryProp = 'data';

				if (resource === 'image') {
					if (operation === 'renderTemplate') {
						// POST /templates/:uid/render — body: { variables, format, quality, width, height, layout, layouts }
						const opts =
							(this.getNodeParameter('imageTemplateOptions', i, {}) as IDataObject) ?? {};
						wantsBinary = Boolean(opts.returnBinary);
						binaryProp = (opts.binaryPropertyName as string) || 'data';

						endpoint = `/templates/${encodeURIComponent(
							this.getNodeParameter('templateId', i) as string,
						)}/render`;
						body.variables = parseJson(
							this.getNodeParameter('variables', i, {}),
							'variables',
							this.getNode(),
						) as IDataObject;
						body.format = (opts.format as string) ?? 'png';
						if (opts.quality !== undefined) body.quality = opts.quality;
						if (isPositive(opts.width)) body.width = opts.width;
						if (isPositive(opts.height)) body.height = opts.height;
						if (opts.layout) body.layout = opts.layout;
						const layouts = splitCsv(opts.layouts);
						if (layouts.length) body.layouts = layouts;
					} else if (operation === 'renderHtml') {
						// POST /image — body: { html, width, height, selector, fileExtension }
						const opts =
							(this.getNodeParameter('imageHtmlOptions', i, {}) as IDataObject) ?? {};
						wantsBinary = Boolean(opts.returnBinary);
						binaryProp = (opts.binaryPropertyName as string) || 'data';

						endpoint = '/image';
						body.html = this.getNodeParameter('html', i) as string;
						if (opts.width !== undefined) body.width = opts.width;
						if (opts.height !== undefined) body.height = opts.height;
						if (opts.selector) body.selector = opts.selector;
						body.fileExtension = (opts.format as string) ?? 'png';
					} else if (operation === 'renderBatch') {
						// POST /templates/:uid/batch-render — body: { variableSets, format, quality, concurrency, layout, layouts }
						const opts =
							(this.getNodeParameter('imageBatchOptions', i, {}) as IDataObject) ?? {};

						endpoint = `/templates/${encodeURIComponent(
							this.getNodeParameter('templateId', i) as string,
						)}/batch-render`;

						const rawItems = parseJson(
							this.getNodeParameter('items', i),
							'items',
							this.getNode(),
						);
						if (!Array.isArray(rawItems)) {
							throw new NodeOperationError(
								this.getNode(),
								'"Items" must be a JSON array of objects, each with a `variables` object.',
								{ itemIndex: i },
							);
						}
						// Map the node's items[].variables to the API's variableSets[].
						body.variableSets = (rawItems as IDataObject[]).map((it) => {
							if (it && typeof it === 'object' && 'variables' in it) {
								return it.variables as IDataObject;
							}
							return it as IDataObject;
						});
						body.format = (opts.format as string) ?? 'png';
						if (opts.quality !== undefined) body.quality = opts.quality;
						if (opts.concurrency !== undefined) body.concurrency = opts.concurrency;
						if (opts.layout) body.layout = opts.layout;
						const layouts = splitCsv(opts.layouts);
						if (layouts.length) body.layouts = layouts;
					}
				} else if (resource === 'gif') {
					// POST /gif — body: { html | (template + variables), width, height, quality }
					const opts = (this.getNodeParameter('gifOptions', i, {}) as IDataObject) ?? {};
					const source = this.getNodeParameter('gifSource', i) as string;
					wantsBinary = Boolean(opts.returnBinary);
					binaryProp = (opts.binaryPropertyName as string) || 'data';

					endpoint = '/gif';
					if (opts.width !== undefined) body.width = opts.width;
					if (opts.height !== undefined) body.height = opts.height;
					body.quality = (opts.quality as string) ?? 'medium';

					if (source === 'template') {
						body.template = this.getNodeParameter('gifTemplateId', i) as string;
						body.variables = parseJson(
							this.getNodeParameter('gifVariables', i, {}),
							'gifVariables',
							this.getNode(),
						) as IDataObject;
					} else {
						body.html = this.getNodeParameter('gifHtml', i) as string;
					}
				} else if (resource === 'pdf') {
					// POST /templates/:uid/render with format:"pdf" — body: { variables, format, width, height }
					const opts = (this.getNodeParameter('pdfOptions', i, {}) as IDataObject) ?? {};
					wantsBinary = Boolean(opts.returnBinary);
					binaryProp = (opts.binaryPropertyName as string) || 'data';

					endpoint = `/templates/${encodeURIComponent(
						this.getNodeParameter('pdfTemplateId', i) as string,
					)}/render`;
					body.variables = parseJson(
						this.getNodeParameter('pdfVariables', i, {}),
						'pdfVariables',
						this.getNode(),
					) as IDataObject;
					body.format = 'pdf';
					if (isPositive(opts.width)) body.width = opts.width;
					if (isPositive(opts.height)) body.height = opts.height;
				} else if (resource === 'template') {
					method = 'GET';
					if (operation === 'get') {
						endpoint = `/templates/${encodeURIComponent(
							this.getNodeParameter('templateId', i) as string,
						)}`;
					} else if (operation === 'list') {
						endpoint = '/templates';
					}
				}

				if (!endpoint) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation: ${resource}.${operation}`,
						{ itemIndex: i },
					);
				}

				const requestOptions: IHttpRequestOptions = {
					method,
					url: endpoint,
					json: true,
					headers: {
						'User-Agent': 'n8n-nodes-pictify/1.0.2',
					},
				};
				if (method !== 'GET') {
					requestOptions.body = body;
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pictifyApi',
					requestOptions,
				)) as IDataObject;

				const item: INodeExecutionData = {
					json: response,
					pairedItem: { item: i },
				};

				if (wantsBinary) {
					const url = pickRenderUrl(response);
					if (url) {
						const binary = await this.helpers.httpRequest({
							method: 'GET',
							url,
							returnFullResponse: false,
							encoding: 'arraybuffer',
						});

						const filename = guessFilename(url, resource);
						item.binary = {
							[binaryProp]: await this.helpers.prepareBinaryData(
								binary as unknown as Buffer,
								filename,
							),
						};
					}
				}

				returnData.push(item);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

function parseJson(value: unknown, fieldName: string, node: INode): unknown {
	if (value === undefined || value === null || value === '') return {};
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch (e) {
		throw new NodeOperationError(node, `Invalid JSON in "${fieldName}": ${(e as Error).message}`);
	}
}

function splitCsv(value: unknown): string[] {
	if (!value) return [];
	return String(value)
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

function isPositive(value: unknown): boolean {
	return typeof value === 'number' && value > 0;
}

function pickRenderUrl(response: IDataObject): string | undefined {
	// /image and /gif both ultimately expose a URL; template renders nest it in results[].
	if (typeof response.url === 'string') return response.url;
	const gif = response.gif as IDataObject | undefined;
	if (gif && typeof gif.url === 'string') return gif.url;
	const results = response.results as IDataObject[] | undefined;
	if (Array.isArray(results) && results.length > 0 && typeof results[0].url === 'string') {
		return results[0].url as string;
	}
	return undefined;
}

function guessFilename(url: string, resource: string): string {
	const fromUrl = url.split('?')[0].split('/').pop();
	if (fromUrl && fromUrl.includes('.')) return fromUrl;
	const ext = resource === 'gif' ? 'gif' : resource === 'pdf' ? 'pdf' : 'png';
	return `pictify-render.${ext}`;
}
