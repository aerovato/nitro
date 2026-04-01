import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fs, vol } from "memfs";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  SETTINGS_FILE,
} from "../src/logic/settings";
import { APP_DATA_DIR, ensureAppDataDir } from "../src/logic/config";

vi.mock("node:fs");
vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

beforeEach(() => {
  vol.reset();
  fs.mkdirSync("/home/testuser", { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ensureConfigDir", () => {
  it("creates config directory with 700 permissions if it does not exist", () => {
    ensureAppDataDir();

    expect(fs.existsSync(APP_DATA_DIR)).toBe(true);
    const stats = fs.statSync(APP_DATA_DIR);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it("sets permissions to 700 if directory already exists", () => {
    fs.mkdirSync(APP_DATA_DIR, { mode: 0o755 });

    ensureAppDataDir();

    const stats = fs.statSync(APP_DATA_DIR);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });
});

describe("saveSettings", () => {
  it("saves settings to file with 600 permissions", () => {
    const settings = { ...DEFAULT_SETTINGS, alwaysConfirm: true };

    saveSettings(settings);

    expect(fs.existsSync(SETTINGS_FILE)).toBe(true);
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8") as string;
    expect(JSON.parse(content)).toEqual(settings);
    const stats = fs.statSync(SETTINGS_FILE);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("creates config directory if it does not exist", () => {
    const settings = { ...DEFAULT_SETTINGS, showThinking: true };

    saveSettings(settings);

    expect(fs.existsSync(APP_DATA_DIR)).toBe(true);
    expect(fs.existsSync(SETTINGS_FILE)).toBe(true);
  });
});

describe("loadSettings", () => {
  it("returns default settings and creates file if it does not exist", () => {
    const settings = loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(fs.existsSync(SETTINGS_FILE)).toBe(true);
  });

  it("loads and returns settings from existing file", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      showThinking: true,
      alwaysConfirm: true,
    };
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(customSettings));

    const settings = loadSettings();

    expect(settings).toEqual(customSettings);
  });

  it("returns default settings and recreates file if file is corrupted", () => {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, "invalid json");

    const settings = loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8") as string;
    expect(JSON.parse(content)).toEqual(DEFAULT_SETTINGS);
  });

  it("sets file permissions to 600 when loading existing file", () => {
    const customSettings = { ...DEFAULT_SETTINGS, alwaysConfirm: true };
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(customSettings), {
      mode: 0o644,
    });

    loadSettings();

    const stats = fs.statSync(SETTINGS_FILE);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
