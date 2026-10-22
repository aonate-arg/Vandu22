/* Datos del proyecto de Supabase: Project Settings → API (o el botón "Connect").
   Van en la página a propósito: la "publishable key" (o "anon key") es pública
   y la seguridad la dan las reglas de la tabla perfiles.
   NUNCA pongas acá la "secret key" ni la "service_role key". */
window.SUPABASE_CONFIG = {
  url: 'PEGAR_ACA_PROJECT_URL', // ej. https://abcdefghijkl.supabase.co
  key: 'PEGAR_ACA_PUBLISHABLE_KEY', // ej. sb_publishable_... o eyJhbGciOi...
};
