import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

const config: NextConfig = {
  output: 'standalone',
};

export default config;
