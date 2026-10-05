import { neon } from 'https://esm.sh/@neondatabase/serverless';

// Tu cadena de conexión a Neon DB
const DATABASE_URL = 'postgresql://neondb_owner:npg_H4KaIClctB8y@ep-patient-cake-b5a1r4md-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Exporta exactamente 'sql' para que login.js y registro.js puedan usarlo
export const sql = neon(DATABASE_URL);