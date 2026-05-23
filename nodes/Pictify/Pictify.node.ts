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
				'User-Agent': 'n8n-nodes-pictify/0.1.0',
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
						description: 'Generate an image from raw HTML and optional CSS',
					},
					{
						name: 'Render Batch',
						value: 'renderBatch',
						action: 'Render many images from one template',
						description: 'Render up to 500 images from a single template in one call',
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
						description: 'Render an animated GIF from a template or raw HTML with frames',
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
						description: 'Render a single-page or multi-page PDF from a template or HTML',
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
				placeholder: 'tpl_123abc',
				description: 'ID of the Pictify template to render',
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
				description: 'Raw HTML to render',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderHtml'] },
				},
			},
			{
				displayName: 'CSS',
				name: 'css',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Optional CSS to apply to the HTML',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderHtml'] },
				},
			},

			// ============ IMAGE: Render Batch ============
			{
				displayName: 'Items',
				name: 'items',
				type: 'json',
				default: '[\n  { "variables": { "title": "Hello" } }\n]',
				required: true,
				description:
					'Array of items to render. Each item has `variables` (object) and optional `filename`.',
				displayOptions: {
					show: { resource: ['image'], operation: ['renderBatch'] },
				},
			},

			// ============ COMMON IMAGE OPTIONS ============
			{
				displayName: 'Output Options',
				name: 'imageOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: { resource: ['image'], operation: ['renderTemplate', 'renderHtml', 'renderBatch'] },
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
						displayName: 'Device Scale Factor',
						name: 'deviceScaleFactor',
						type: 'number',
						default: 1,
						description: 'Multiplier for retina-quality output (1-3 typical)',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
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
						default: 630,
					},
					{
						displayName: 'Layout',
						name: 'layout',
						type: 'string',
						default: '',
						description: 'Optional layout variant name (e.g. "landscape", "story")',
					},
					{
						displayName: 'Layouts',
						name: 'layouts',
						type: 'string',
						default: '',
						placeholder: 'landscape,square,story',
						description: 'Comma-separated layout variant names to render in one call',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						default: 90,
						description: 'JPG/WebP quality 1-100',
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
						displayName: 'Transparent Background',
						name: 'transparent',
						type: 'boolean',
						default: false,
						description: 'Whether to keep the background transparent (PNG only)',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 1200,
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
				default: 'template',
				displayOptions: { show: { resource: ['gif'], operation: ['renderGif'] } },
			},
			{
				displayName: 'Template ID',
				name: 'gifTemplateId',
				type: 'string',
				default: '',
				required: true,
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
				displayOptions: {
					show: { resource: ['gif'], operation: ['renderGif'], gifSource: ['html'] },
				},
			},
			{
				displayName: 'CSS',
				name: 'gifCss',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: {
					show: { resource: ['gif'], operation: ['renderGif'], gifSource: ['html'] },
				},
			},
			{
				displayName: 'Frames',
				name: 'frames',
				type: 'json',
				default:
					'[\n  { "variables": { "text": "Frame 1" } },\n  { "variables": { "text": "Frame 2" } }\n]',
				required: true,
				description: 'Array of frame objects. Each frame has a `variables` object.',
				displayOptions: { show: { resource: ['gif'], operation: ['renderGif'] } },
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
						displayName: 'Delay (Ms)',
						name: 'delay',
						type: 'number',
						default: 100,
						description: 'Delay between frames in milliseconds',
					},
					{ displayName: 'Height', name: 'height', type: 'number', default: 600 },
					{
						displayName: 'Loop',
						name: 'loop',
						type: 'number',
						default: 0,
						description: '0 = infinite loop, otherwise number of loops',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'number',
						default: 80,
					},
					{ displayName: 'Width', name: 'width', type: 'number', default: 800 },
				],
			},

			// ============ PDF FIELDS ============
			{
				displayName: 'Source',
				name: 'pdfSource',
				type: 'options',
				options: [
					{ name: 'Template', value: 'template' },
					{ name: 'HTML', value: 'html' },
				],
				default: 'template',
				displayOptions: { show: { resource: ['pdf'], operation: ['renderPdf'] } },
			},
			{
				displayName: 'Template ID',
				name: 'pdfTemplateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['pdf'], operation: ['renderPdf'], pdfSource: ['template'] },
				},
			},
			{
				displayName: 'Variables',
				name: 'pdfVariables',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: { resource: ['pdf'], operation: ['renderPdf'], pdfSource: ['template'] },
				},
			},
			{
				displayName: 'HTML',
				name: 'pdfHtml',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['pdf'], operation: ['renderPdf'], pdfSource: ['html'] },
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
						displayOptions: { show: { returnBinary: [true] } },
					},
					{
						displayName: 'Landscape',
						name: 'landscape',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Margin (CSS)',
						name: 'margin',
						type: 'string',
						default: '0',
						description: 'CSS margin string (e.g. "1cm" or "10px 20px")',
					},
					{
						displayName: 'Page Format',
						name: 'pageFormat',
						type: 'options',
						options: [
							{ name: 'A4', value: 'A4' },
							{ name: 'Legal', value: 'Legal' },
							{ name: 'Letter', value: 'Letter' },
							{ name: 'Tabloid', value: 'Tabloid' },
						],
						default: 'A4',
					},
					{
						displayName: 'Print Background',
						name: 'printBackground',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Return Binary',
						name: 'returnBinary',
						type: 'boolean',
						default: false,
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
					const opts = (this.getNodeParameter('imageOptions', i, {}) as IDataObject) ?? {};
					wantsBinary = Boolean(opts.returnBinary);
					binaryProp = (opts.binaryPropertyName as string) || 'data';

					const common: IDataObject = {
						format: opts.format ?? 'png',
					};
					if (opts.width !== undefined) common.width = opts.width;
					if (opts.height !== undefined) common.height = opts.height;
					if (opts.deviceScaleFactor !== undefined)
						common.deviceScaleFactor = opts.deviceScaleFactor;
					if (opts.transparent !== undefined) common.transparent = opts.transparent;
					if (opts.quality !== undefined) common.quality = opts.quality;
					if (opts.layout) common.layout = opts.layout;
					if (opts.layouts) {
						common.layouts = String(opts.layouts)
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean);
					}

					if (operation === 'renderTemplate') {
						endpoint = '/render';
						body.templateId = this.getNodeParameter('templateId', i) as string;
						body.variables = parseJson(
							this.getNodeParameter('variables', i, {}),
							'variables',
							this.getNode(),
						) as IDataObject;
						Object.assign(body, common);
					} else if (operation === 'renderHtml') {
						endpoint = '/render/html';
						body.html = this.getNodeParameter('html', i) as string;
						const cssVal = this.getNodeParameter('css', i, '') as string;
						if (cssVal) body.css = cssVal;
						Object.assign(body, common);
					} else if (operation === 'renderBatch') {
						endpoint = '/render/batch';
						body.templateId = this.getNodeParameter('templateId', i) as string;
						body.items = parseJson(
							this.getNodeParameter('items', i),
							'items',
							this.getNode(),
						) as IDataObject[];
						Object.assign(body, common);
					}
				} else if (resource === 'gif') {
					const opts = (this.getNodeParameter('gifOptions', i, {}) as IDataObject) ?? {};
					const source = this.getNodeParameter('gifSource', i) as string;
					endpoint = '/render/gif';
					body.frames = parseJson(
						this.getNodeParameter('frames', i),
						'frames',
						this.getNode(),
					) as IDataObject[];
					if (opts.width !== undefined) body.width = opts.width;
					if (opts.height !== undefined) body.height = opts.height;
					body.delay = opts.delay ?? 100;
					body.loop = opts.loop ?? 0;
					if (opts.quality !== undefined) body.quality = opts.quality;
					if (source === 'template') {
						body.templateId = this.getNodeParameter('gifTemplateId', i) as string;
					} else {
						body.html = this.getNodeParameter('gifHtml', i) as string;
						const css = this.getNodeParameter('gifCss', i, '') as string;
						if (css) body.css = css;
					}
				} else if (resource === 'pdf') {
					const opts = (this.getNodeParameter('pdfOptions', i, {}) as IDataObject) ?? {};
					wantsBinary = Boolean(opts.returnBinary);
					binaryProp = (opts.binaryPropertyName as string) || 'data';
					const source = this.getNodeParameter('pdfSource', i) as string;
					endpoint = '/render/pdf';
					body.pageFormat = opts.pageFormat ?? 'A4';
					body.landscape = opts.landscape ?? false;
					body.printBackground = opts.printBackground ?? true;
					body.margin = opts.margin ?? '0';
					if (source === 'template') {
						body.templateId = this.getNodeParameter('pdfTemplateId', i) as string;
						body.variables = parseJson(
							this.getNodeParameter('pdfVariables', i, {}),
							'pdfVariables',
							this.getNode(),
						) as IDataObject;
					} else {
						body.html = this.getNodeParameter('pdfHtml', i) as string;
					}
				} else if (resource === 'template') {
					method = 'GET';
					if (operation === 'get') {
						endpoint = `/templates/${this.getNodeParameter('templateId', i) as string}`;
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
						'User-Agent': 'n8n-nodes-pictify/0.1.0',
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

function pickRenderUrl(response: IDataObject): string | undefined {
	if (typeof response.url === 'string') return response.url;
	if (typeof response.imageUrl === 'string') return response.imageUrl;
	if (typeof response.gifUrl === 'string') return response.gifUrl;
	if (typeof response.pdfUrl === 'string') return response.pdfUrl;
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
