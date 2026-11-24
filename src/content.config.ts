import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// sunbird's web/tools/bundle-plugins.mjs writes the list, scripts/fetch.nu puts it in public/.
const plugins = defineCollection({
   loader: file('public/plugins/index.json', {
      parser: (text) =>
         (JSON.parse(text) as { name: string }[]).map((plugin) => ({
            id: plugin.name,
            ...plugin,
         })),
   }),
   schema: z.object({
      name: z.string(),
      description: z.string(),
      warning: z.string().optional(),
   }),
});

const REPOSITORY = 'sunbird-tools/sunbird';

const Contributor = z.object({
   login: z.string(),
   type: z.enum(['User', 'Bot']),
   html_url: z.url(),
   avatar_url: z.url(),
   contributions: z.number(),
});

const User = z.object({ name: z.string().nullable() });

// Unauthenticated calls get 60 an hour per IP, which shared CI runners run out of.
async function github(path: string): Promise<unknown> {
   const token = process.env.GITHUB_TOKEN;
   const response = await fetch(`https://api.github.com/${path}`, {
      headers: {
         accept: 'application/vnd.github+json',
         ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
   });
   if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}`);
   return response.json();
}

const contributors = defineCollection({
   loader: async () => {
      const listed = z.array(Contributor).parse(await github(`repos/${REPOSITORY}/contributors`));
      const people = listed.filter((contributor) => contributor.type === 'User');

      return Promise.all(
         people.map(async (contributor) => {
            const user = User.parse(await github(`users/${contributor.login}`));
            return {
               id: contributor.login,
               login: contributor.login,
               name: user.name ?? contributor.login,
               url: contributor.html_url,
               avatar: contributor.avatar_url,
               contributions: contributor.contributions,
            };
         }),
      );
   },
   schema: z.object({
      login: z.string(),
      name: z.string(),
      url: z.url(),
      avatar: z.url(),
      contributions: z.number(),
   }),
});

export const collections = { plugins, contributors };
