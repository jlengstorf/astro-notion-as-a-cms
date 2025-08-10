import { z } from 'zod/v3';
import { EventSchemas } from 'inngest';

const NotionWebhook = z.any();

const events = {
	'notion/webhook': {
		data: NotionWebhook,
	},
};

export const schemas = new EventSchemas().fromZod(events);
