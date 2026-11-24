import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineCollection } from 'astro:content';
import { file, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';

// sunbird's web/tools/bundle-plugins.ts writes the list, scripts/fetch.nu puts it in public/.
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
const BRANCH = 'main';
const CLONE = '.cache/sunbird.git';
const PAGE = 100;

const Commit = z.object({
   sha: z.string(),
   author: z
      .object({
         login: z.string(),
         type: z.enum(['User', 'Bot']),
         html_url: z.url(),
         avatar_url: z.url(),
      })
      .nullable(),
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

async function listCommits(): Promise<z.infer<typeof Commit>[]> {
   const commits = [];
   for (let page = 1; ; page++) {
      const batch = z
         .array(Commit)
         .parse(
            await github(`repos/${REPOSITORY}/commits?sha=${BRANCH}&per_page=${PAGE}&page=${page}`),
         );
      commits.push(...batch);
      if (batch.length < PAGE) return commits;
   }
}

function git(args: string[]): string {
   return execFileSync('git', ['-c', 'log.showSignature=false', `--git-dir=${CLONE}`, ...args], {
      encoding: 'utf8',
      maxBuffer: 256 << 20,
   });
}

interface Lines {
   additions: number;
   deletions: number;
}

interface Person extends Lines {
   login: string;
   url: string;
   avatar: string;
   commits: number;
}

/**
 * Lines per commit from a bare clone. GitHub's stats endpoint counts vendored code like the
 * QuickJS sources, so paths the repository's .gitattributes marks linguist-vendored or
 * linguist-generated are left out, and renames count only their edits.
 */
function lineCounts(): Map<string, Lines> {
   if (existsSync(CLONE)) {
      git(['fetch', '--quiet', 'origin', `+refs/heads/${BRANCH}:refs/heads/${BRANCH}`]);
   } else {
      execFileSync('git', [
         'clone',
         '--quiet',
         '--bare',
         `https://github.com/${REPOSITORY}`,
         CLONE,
      ]);
   }

   const log = git([
      `--attr-source=${BRANCH}`,
      'log',
      '--numstat',
      '-M',
      '--format=%x00%H',
      BRANCH,
      '--',
      ':(attr:!linguist-vendored !linguist-generated)',
   ]);
   const counts = new Map<string, Lines>();
   for (const record of log.split('\0').slice(1)) {
      const [sha = '', ...files] = record.trim().split('\n');
      const lines = { additions: 0, deletions: 0 };
      for (const file of files) {
         const [added, deleted] = file.split('\t');
         if (added === '-' || added === undefined || deleted === undefined) continue;
         lines.additions += Number(added);
         lines.deletions += Number(deleted);
      }
      counts.set(sha, lines);
   }
   return counts;
}

const REFRESH_MS = 60 * 60 * 1000;

interface Entry {
   id: string;
   data: Record<string, unknown>;
}

/** Astro keeps the store between dev restarts and builds, so local runs stay under the limit. */
function hourly(name: string, fetchEntries: () => Promise<Entry[]>): Loader {
   return {
      name,
      load: async ({ store, meta, parseData, logger }) => {
         const fetched = Number(meta.get('fetched') ?? 0);
         const cached = store.keys().length > 0;
         if (cached && Date.now() - fetched < REFRESH_MS) return;

         let entries: Entry[];
         try {
            entries = await fetchEntries();
         } catch (error) {
            if (!cached) throw error;
            logger.warn(`keeping the cached ${name}: ${error}`);
            return;
         }

         const parsed = await Promise.all(
            entries.map(async (entry) => ({ id: entry.id, data: await parseData(entry) })),
         );
         store.clear();
         for (const entry of parsed) store.set(entry);
         meta.set('fetched', String(Date.now()));
      },
   };
}

const contributors = defineCollection({
   loader: hourly('github-contributors', async () => {
      const lines = lineCounts();
      const people = new Map<string, Person>();
      for (const { sha, author } of await listCommits()) {
         if (author?.type !== 'User') continue;

         const person = people.get(author.login) ?? {
            login: author.login,
            url: author.html_url,
            avatar: author.avatar_url,
            commits: 0,
            additions: 0,
            deletions: 0,
         };
         person.commits += 1;
         person.additions += lines.get(sha)?.additions ?? 0;
         person.deletions += lines.get(sha)?.deletions ?? 0;
         people.set(author.login, person);
      }

      return Promise.all(
         [...people].map(async ([login, person]) => {
            const user = User.parse(await github(`users/${login}`));
            return { id: login, data: { ...person, name: user.name ?? login } };
         }),
      );
   }),
   schema: z.object({
      login: z.string(),
      name: z.string(),
      url: z.url(),
      avatar: z.url(),
      commits: z.number(),
      additions: z.number(),
      deletions: z.number(),
   }),
});

const Repository = z.object({ stargazers_count: z.number(), forks_count: z.number() });
const Languages = z.record(z.string(), z.number());

const repository = defineCollection({
   loader: hourly('github-repository', async () => {
      const [stats, languages] = await Promise.all([
         github(`repos/${REPOSITORY}`).then((body) => Repository.parse(body)),
         github(`repos/${REPOSITORY}/languages`).then((body) => Languages.parse(body)),
      ]);
      return [
         {
            id: 'sunbird',
            data: { stars: stats.stargazers_count, forks: stats.forks_count, languages },
         },
      ];
   }),
   schema: z.object({ stars: z.number(), forks: z.number(), languages: Languages }),
});

export const collections = { plugins, contributors, repository };
