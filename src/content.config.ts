import { execFileSync } from 'node:child_process';
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

/** CI passes GITHUB_TOKEN, and locally the gh login is used. Unauthenticated calls get 60 an hour. */
function githubToken(): string | null {
   const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
   if (token) return token;

   try {
      return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim() || null;
   } catch {
      return null;
   }
}

const token = githubToken();

async function github(path: string): Promise<unknown> {
   const response = await fetch(`https://api.github.com/${path}`, {
      headers: {
         accept: 'application/vnd.github+json',
         ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
   });
   if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}`);
   return response.json();
}

const REFRESH_MS = 60 * 60 * 1000;

const contributors = defineCollection({
   loader: {
      name: 'github-contributors',
      // Astro keeps the store between dev restarts and builds, so local runs stay under the limit.
      load: async ({ store, meta, parseData, logger }) => {
         const fetched = Number(meta.get('fetched') ?? 0);
         const cached = store.keys().length > 0;
         if (cached && Date.now() - fetched < REFRESH_MS) return;

         const response = await github(`repos/${REPOSITORY}/contributors`).catch(
            (error: unknown) => {
               if (!cached) throw error;
               logger.warn(`keeping the cached contributors: ${error}`);
               return null;
            },
         );
         if (response === null) return;

         const listed = z.array(Contributor).parse(response);
         const people = listed.filter((contributor) => contributor.type === 'User');
         const entries = await Promise.all(
            people.map(async (contributor) => {
               const user = User.parse(await github(`users/${contributor.login}`));
               const data = {
                  login: contributor.login,
                  name: user.name ?? contributor.login,
                  url: contributor.html_url,
                  avatar: contributor.avatar_url,
                  contributions: contributor.contributions,
               };
               return {
                  id: contributor.login,
                  data: await parseData({ id: contributor.login, data }),
               };
            }),
         );

         store.clear();
         for (const entry of entries) store.set(entry);
         meta.set('fetched', String(Date.now()));
      },
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
