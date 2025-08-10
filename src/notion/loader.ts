import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import type { BlockObjectResponse } from '@notionhq/client';
import type { GetImageResult } from 'astro';
import type { Loader } from 'astro/loaders';
import { Client, collectPaginatedAPI } from '@notionhq/client';
import { getImage } from 'astro:assets';
import { z } from 'astro:schema';
import { blocksToHTML } from './render';

const notion = new Client();

const NotionRichText = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('text'),
		text: z.object({
			content: z.string(),
			link: z.any().optional(),
		}),
		annotations: z.object({
			bold: z.boolean(),
			italic: z.boolean(),
			strikethrough: z.boolean(),
			underline: z.boolean(),
			code: z.boolean(),
			color: z.string(),
		}),
		plain_text: z.string(),
		href: z.any().optional(),
	}),
]);

const NotionFile = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('file'),
		file: z.object({
			url: z.string().url(),
			expiry_time: z.coerce.date(),
		}),
	}),
	z.object({
		type: z.literal('external'),
		external: z.object({
			url: z.string().url(),
		}),
	}),
]);

const NotionProperty = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('select'),
		id: z.string(),
		select: z.object({
			id: z.string(),
			name: z.string(),
			color: z.string(),
		}),
	}),
	z.object({
		type: z.literal('date'),
		id: z.string(),
		date: z.object({
			start: z.coerce.date(),
			end: z.coerce.date(),
			time_zone: z.coerce.string(),
		}),
	}),
	z.object({
		id: z.string(),
		type: z.literal('button'),
		button: z.object({}),
	}),
	z.object({
		type: z.literal('rich_text'),
		id: z.string(),
		rich_text: z.array(NotionRichText),
	}),
	z.object({
		type: z.literal('title'),
		id: z.string(),
		title: z.array(NotionRichText),
	}),
	z.object({
		type: z.literal('files'),
		id: z.string(),
		files: z.array(NotionFile),
	}),
]);

const NotionPage = z.object({
	object: z.literal('page'),
	id: z.string(),
	created_time: z.coerce.date(),
	last_edited_time: z.coerce.date(),
	created_by: z.object({
		object: z.literal('user'),
		id: z.string(),
	}),
	last_edited_by: z.object({
		object: z.literal('user'),
		id: z.string(),
	}),
	cover: z.any().nullable(),
	icon: z.any().nullable(),
	parent: z.object({
		type: z.string(),
		database_id: z.string(),
	}),
	archived: z.boolean(),
	in_trash: z.boolean(),
	properties: z.record(z.string(), NotionProperty),
	url: z.string().url(),
	public_url: z.string().url().nullable(),
});

const NotionResult = z.object({
	object: z.literal('list'),
	results: z.array(NotionPage),
	next_cursor: z.string().nullable(),
	has_more: z.boolean(),
	type: z.string(),
	page_or_database: z.object({}),
	request_id: z.string(),
});

async function parseNotionProperty(property: z.infer<typeof NotionProperty>) {
	switch (property.type) {
		case 'rich_text':
			return property.rich_text.at(0)?.plain_text ?? '';

		case 'title':
			return property.title.at(0)?.plain_text ?? '';

		case 'date':
			return property.date.start;

		case 'select':
			return property.select.name;

		case 'files':
			const details = property.files.at(0);

			let image: GetImageResult;

			try {
				switch (details?.type) {
					// NOTE: this ONLY expects images right now.
					// It will fail if any other file is supplied.
					case 'external':
						console.log(`loading image: ${details.external.url}`);
						image = await getImage({
							src: details.external.url,
							height: 900,
							width: 1600,
						});
						break;

					case 'file':
						console.log(`loading image: ${details.file.url}`);
						image = await getImage({
							src: details.file.url,
							height: 900,
							width: 1600,
						});
						break;

					default:
						throw new Error(
							`unhandled file type ${JSON.stringify(details, null, 2)}`,
						);
				}

				return image.src;
			} catch (error) {
				console.log(
					`error parsing notion property ${JSON.stringify(property, null, 2)}`,
				);
				console.error(JSON.stringify(error, null, 2));
				return '';
			}

		default:
			console.log(`unhandled property type ${property.type}`);
			return '';
	}
}

export function notionLoader({
	integration_token,
	database_id,
	filter,
	sorts,
}: {
	integration_token: string;
} & Pick<QueryDatabaseParameters, 'database_id'> &
	Pick<QueryDatabaseParameters, 'filter'> &
	Pick<QueryDatabaseParameters, 'sorts'>): Loader {
	return {
		name: 'notion-loader',
		schema: z.object({
			title: z.string(),
			slug: z.string(),
			publishDate: z.coerce.date(),
			share_description: z.string().nullable(),
			share_image: z.string().nullable(),
		}),
		load: async ({ store, logger, parseData, generateDigest }) => {
			const notionResult = await notion.databases.query({
				auth: integration_token,
				database_id,
				filter,
				sorts,
			});

			try {
				const data = NotionResult.parse(notionResult);
				const pages = data.results;

				logger.info(`loaded ${pages.length} pages from Notion`);

				store.clear();

				await Promise.all(
					pages.map(async (page) => {
						const property_title = page.properties['Title'];
						const property_slug = page.properties['Slug'];
						const property_publishDate = page.properties['Publish Date'];
						const property_share_description =
							page.properties['Sharing Description'];
						const property_share_image = page.properties['Sharing Image'];

						if (property_slug.type !== 'rich_text') {
							console.log('Invalid slug value');
							return;
						}

						const rt = property_slug.rich_text.at(0);

						if (!rt?.plain_text) {
							console.log('Invalid slug value');
							return;
						}

						const [
							title,
							slug,
							publishDate,
							share_description,
							share_image,
							blocks,
						] = await Promise.all([
							parseNotionProperty(property_title),
							parseNotionProperty(property_slug),
							parseNotionProperty(property_publishDate),
							parseNotionProperty(property_share_description),
							parseNotionProperty(property_share_image),
							collectPaginatedAPI(notion.blocks.children.list, {
								auth: integration_token,
								block_id: page.id,
							}),
						]);

						const data = await parseData({
							id: rt.plain_text,
							data: {
								title,
								slug,
								publishDate,
								share_description,
								share_image,
							},
						});

						const html = await blocksToHTML(blocks as BlockObjectResponse[]);

						return store.set({
							id: rt.plain_text,
							data,
							body: JSON.stringify(blocks),
							rendered: {
								html,
							},
							digest: generateDigest(data),
						});
					}),
				);
			} catch (err) {
				logger.error(JSON.stringify(err, null, 2));
			}
		},
	};
}
