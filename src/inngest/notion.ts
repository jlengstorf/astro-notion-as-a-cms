import { inngest } from './client';

export const handleWebhook = inngest.createFunction(
	{ id: 'notion/handle-webhook' },
	{ event: 'notion/webhook' },
	async ({ event }) => {
		return { event };
	},
);
