import { serve } from 'inngest/astro';
import { functions, inngest } from '../../inngest';

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions,
});
