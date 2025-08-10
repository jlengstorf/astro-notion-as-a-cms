// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	image: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**.amazonaws.com',
			},
		],
	},
	adapter: netlify(),
});
