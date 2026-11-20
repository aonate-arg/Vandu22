/* Cliente único de Supabase para todo el sitio (cuenta, registro, prode).
   Se importa desde npm: ya no depende de que un <script> del CDN cargue antes. */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG as cfg } from './supabase-config.js';

const configured = /^https:\/\//.test(cfg.url || '') && cfg.key && !cfg.key.startsWith('PEGAR');

export const client = configured ? createClient(cfg.url, cfg.key) : null;
if (!client) console.warn('Supabase sin configurar: completá src/lib/supabase-config.js');
