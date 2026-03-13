import 'dotenv/config';

export interface AppConfig {
  port: number;
  host: string;
  jwtSecret: string;
  adminPassword: string;
  dataDir: string;
  corsOrigin: string;
  allowedPaths: string[];
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3927', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'change-me-to-a-random-secret',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  dataDir: process.env.DATA_DIR || './data',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  allowedPaths: (process.env.ALLOWED_PATHS || '/home:/var/www:/var/log:/opt:/etc/nginx:/tmp:/srv')
    .split(':')
    .filter(Boolean),
};
