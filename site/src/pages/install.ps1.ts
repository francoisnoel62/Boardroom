// Serves the installer from the repository verbatim; a built-site test checks the bytes.
import type { APIRoute } from 'astro';
import script from '../../../scripts/install.ps1?raw';

export const GET: APIRoute = () => new Response(script, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
