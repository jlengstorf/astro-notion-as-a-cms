import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { notionLoader } from './notion/loader';

const blog = defineCollection({
	loader: notionLoader({
		integration_token: import.meta.env.NOTION_TOKEN,
		database_id: import.meta.env.NOTION_DATABASE_ID,
		// Use Notion sorting and filtering
		filter: {
			property: 'Status',
			select: {
				equals: 'Published',
			},
		},
		sorts: [
			{
				property: 'Publish Date',
				direction: 'ascending',
			},
		],
	}),
	schema: z.object({
		title: z.string(),
		slug: z.string(),
		publishDate: z.coerce.date(),
		share_description: z.string().nullable(),
		share_image: z.string().nullable(),
	}),
});

export const collections = {
	blog,
};
