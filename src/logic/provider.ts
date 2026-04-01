import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { APP_DATA_DIR, ensureAppDataDir } from "./config";

export const ApiTypeSchema = z.enum([
  "openai-compatible",
  "openai-responses",
  "anthropic",
]);

export const ProviderInfoSchema = z.object({
  baseURL: z.string(),
  apiKey: z.string(),
  model: z.string(),
  apiType: ApiTypeSchema,
});

export const AuthSchema = z.object({
  defaultProvider: z.string().nullable().default(null),
  providers: z.record(z.string(), ProviderInfoSchema).default({}),
});

export type ApiType = z.infer<typeof ApiTypeSchema>;
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;
export type ProviderInfoWithName = ProviderInfo & { name: string };
export type Auth = z.infer<typeof AuthSchema>;

export const DEFAULT_AUTH: Auth = AuthSchema.parse({});

export const AUTH_FILE = join(APP_DATA_DIR, "auth.json");

function loadAuth(): Auth {
  ensureAppDataDir();
  if (!existsSync(AUTH_FILE)) {
    saveAuth(DEFAULT_AUTH);
    return DEFAULT_AUTH;
  }
  try {
    const content = readFileSync(AUTH_FILE, "utf-8");
    const parsed: unknown = JSON.parse(content);
    const auth = AuthSchema.parse(parsed);
    chmodSync(AUTH_FILE, 0o600);
    return auth;
  } catch {
    saveAuth(DEFAULT_AUTH);
    return DEFAULT_AUTH;
  }
}

function saveAuth(auth: Auth): void {
  ensureAppDataDir();
  const content = JSON.stringify(auth, null, 2);
  writeFileSync(AUTH_FILE, content, { mode: 0o600 });
}

export function listProviders(): string[] {
  const auth = loadAuth();
  return Object.keys(auth.providers);
}

export function getProvider(name: string): ProviderInfo | undefined {
  const auth = loadAuth();
  return auth.providers[name];
}

export function getDefaultProvider(): ProviderInfoWithName | undefined {
  const auth = loadAuth();
  if (!auth.defaultProvider) {
    return undefined;
  }
  const info = auth.providers[auth.defaultProvider];
  return info ? { ...info, name: auth.defaultProvider } : undefined;
}

export function setDefaultProvider(name: string): boolean {
  const auth = loadAuth();
  if (!auth.providers[name]) {
    return false;
  }
  auth.defaultProvider = name;
  saveAuth(auth);
  return true;
}

export function setProvider(name: string, info: ProviderInfo): void {
  const auth = loadAuth();
  auth.providers[name] = info;
  saveAuth(auth);
}

export function removeProvider(name: string): boolean {
  const auth = loadAuth();
  if (!auth.providers[name]) {
    return false;
  }
  if (auth.defaultProvider === name) {
    auth.defaultProvider = null;
  }
  delete auth.providers[name];
  saveAuth(auth);
  return true;
}
