const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PROD = NODE_ENV === 'production';

export function parsePort(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateEnv() {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (IS_PROD && !process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS');

  if (missing.length) {
    const msg = `[ENV] Missing required env vars: ${missing.join(', ')}`;
    console.error(msg);
    // process.exit(1); // Or throw
    throw new Error(msg);
  }

  const cloudinaryMissing = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ].filter((k) => !process.env[k]);

  if (cloudinaryMissing.length) {
    console.warn(
      `[ENV] Cloudinary not fully configured (optional in dev): missing ${cloudinaryMissing.join(
        ', ',
      )}`,
    );
  }
}
