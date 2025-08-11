# Notion as a CMS for Astro

This is an experiment using Astro’s content collections to use Notion as a CMS powering a blog.

A custom loader hits a Notion database, with each page in the database being used as an individual blog post.

This is very bare bones and very much limited to my specific use case, but it’s here as a good starting point if you want to do something similar.

See the deployed demo: https://astro-notion-as-a-cms.netlify.app

## A note about images

Notion delivers the images with AWS S3 URLs that will expire in a day or so, so you _have_ to move the images somewhere.

I originally built this with Astro's built-in image service but I hit [this bug](https://github.com/withastro/astro/issues/12689) and eventually gave up.

This now uses [Cloudinary](https://codetv.link/cloudinary), which does require an account and credentials. You could also potentially download the images, or use another service, or just decide to ignore images from Notion altogether. You can do anything you want, really. I'm not your dad.
