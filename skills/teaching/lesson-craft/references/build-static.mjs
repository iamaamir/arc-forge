#!/usr/bin/env node
/**
 * build-static.mjs — Optional static build for GitHub Pages deployment.
 *
 * Usage:  node scripts/build-static.mjs
 *
 * Copies the course to dist/ with a flat lesson URL structure
 * (0001-title.html, etc.) suitable for GitHub Pages.
 *
 * Customize the includes array to match your project structure.
 */

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, parse } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');

const INCLUDES = [
  'lessons',
  'assets',
  'reference',
  'index.html',
];

async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true });
  await mkdir(DIST, { recursive: true });

  for (const item of INCLUDES) {
    const src = join(ROOT, item);
    if (!existsSync(src)) continue;
    await cp(src, join(DIST, item), { recursive: true });
  }

  console.log(`Built to ${DIST}`);
  console.log('Deploy dist/ to GitHub Pages or any static host.');
}

build().catch(console.error);
