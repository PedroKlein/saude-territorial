#!/usr/bin/env node
/**
 * DEV-ONLY: Generate a Playwright storage state file with authenticated cookies.
 * 
 * Usage: node scripts/dev-auth-state.mjs
 * 
 * This creates .auth-state.json which agent_browser can load via --state flag.
 * Requires the dev server to be running at localhost:3000.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const STATE_FILE = join(import.meta.dirname, '..', '.auth-state.json');

async function main() {
  console.log('Fetching dev session cookie...');
  
  const response = await fetch(`${BASE_URL}/api/auth/dev-session`, {
    method: 'GET',
    redirect: 'manual', // Don't follow redirect, just get the Set-Cookie
  });

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    console.error('No Set-Cookie header received. Is the dev server running?');
    console.error('Response status:', response.status);
    console.error('Response body:', await response.text());
    process.exit(1);
  }

  // Parse the cookie
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!match) {
    console.error('Could not find session_token in Set-Cookie header');
    console.error('Header:', setCookie);
    process.exit(1);
  }

  const cookieValue = decodeURIComponent(match[1]);
  
  // Parse expires
  const expiresMatch = setCookie.match(/Expires=([^;]+)/);
  const expires = expiresMatch 
    ? Math.floor(new Date(expiresMatch[1]).getTime() / 1000)
    : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  // Create Playwright storage state
  const state = {
    cookies: [
      {
        name: 'better-auth.session_token',
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        expires,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };

  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`✓ Auth state saved to ${STATE_FILE}`);
  console.log(`  Cookie expires: ${new Date(expires * 1000).toISOString()}`);
  console.log(`  Use with agent_browser: --state .auth-state.json`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
