import bcrypt from 'bcrypt';
import type Database from 'better-sqlite3';
import { getSetting, setSetting } from '../db/models/settings-model.js';

const BCRYPT_ROUNDS = 12;
const PASSWORD_KEY = 'admin_password_hash';

export function isInitialized(db: Database.Database): boolean {
  return getSetting(db, PASSWORD_KEY) !== null;
}

export async function setupPassword(db: Database.Database, password: string): Promise<void> {
  if (isInitialized(db)) {
    throw new Error('Admin password already configured');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  setSetting(db, PASSWORD_KEY, hash);
}

export async function verifyPassword(db: Database.Database, password: string): Promise<boolean> {
  const hash = getSetting(db, PASSWORD_KEY);
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function changePassword(
  db: Database.Database,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const valid = await verifyPassword(db, oldPassword);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  setSetting(db, PASSWORD_KEY, hash);
}
