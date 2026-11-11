// La clave "anon" es pública por diseño: la seguridad real está en las reglas (RLS) de schema.sql.
// NUNCA pongas aquí la clave "service_role".
export const SUPABASE_URL = 'https://uzvxcyqlifhcgdwubsdl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dnhjeXFsaWZoY2dkd3Vic2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0Mjg3MjksImV4cCI6MjExMDAwNDcyOX0.x2Bblg6vfx0k0hMR7lnLrKlsyOGNdRL0s-wBEM2KgnI';

// Clave de acceso directo al panel (admin.html). La base solo guarda su huella (ver schema.sql, paso 6).
// OJO: al estar aquí, cualquiera que abra admin.html entra al panel. Mantén la dirección de admin.html en privado.
export const ADMIN_KEY = '73f6946834627ff059972f6c1db758c5d47cdf79a703a3fea2ffc9828c828e34';
