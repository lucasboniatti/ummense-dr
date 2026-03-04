const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

export function getMissingRequiredEnvVars(
  env: NodeJS.ProcessEnv = process.env
): RequiredEnvVar[] {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return !value || value.trim() === '';
  });
}

export function assertRequiredEnv(
  env: NodeJS.ProcessEnv = process.env
): void {
  const missingVars = getMissingRequiredEnvVars(env);

  if (missingVars.length === 0) {
    return;
  }

  const message = `Missing required environment variables: ${missingVars.join(
    ', '
  )}`;

  throw new Error(message);
}

export function getRequiredEnvVar(key: RequiredEnvVar): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
