import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/config.js";

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "oma-test-"));
}

test("loadConfig returns empty object when no config file exists", async () => {
  const dir = await createTempDir();
  try {
    const config = await loadConfig(dir);
    assert.deepEqual(config, {});
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig reads .oma.json from the given directory", async () => {
  const dir = await createTempDir();
  try {
    await writeFile(join(dir, ".oma.json"), JSON.stringify({ model: "gpt-4.1", format: "json" }));
    const config = await loadConfig(dir);
    assert.equal(config.model, "gpt-4.1");
    assert.equal(config.format, "json");
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig walks up parent directories", async () => {
  const dir = await createTempDir();
  const sub = join(dir, "a", "b", "c");
  try {
    await mkdir(sub, { recursive: true });
    await writeFile(join(dir, ".oma.json"), JSON.stringify({ model: "gpt-4.1" }));
    const config = await loadConfig(sub);
    assert.equal(config.model, "gpt-4.1");
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig ignores invalid JSON", async () => {
  const dir = await createTempDir();
  try {
    await writeFile(join(dir, ".oma.json"), "not json{{{");
    const config = await loadConfig(dir);
    assert.deepEqual(config, {});
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig reads prompts configuration", async () => {
  const dir = await createTempDir();
  try {
    await writeFile(
      join(dir, ".oma.json"),
      JSON.stringify({
        prompts: {
          system: "Custom system prompt",
          triage: "Custom triage template with {{body}}",
        },
      }),
    );
    const config = await loadConfig(dir);
    assert.equal(config.prompts?.system, "Custom system prompt");
    assert.equal(config.prompts?.triage, "Custom triage template with {{body}}");
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig rejects invalid model type", async () => {
  const dir = await createTempDir();
  try {
    await writeFile(join(dir, ".oma.json"), JSON.stringify({ model: 123 }));
    const config = await loadConfig(dir);
    assert.deepEqual(config, {});
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("loadConfig rejects invalid format value", async () => {
  const dir = await createTempDir();
  try {
    await writeFile(join(dir, ".oma.json"), JSON.stringify({ format: "xml" }));
    const config = await loadConfig(dir);
    assert.deepEqual(config, {});
  } finally {
    await rm(dir, { recursive: true });
  }
});
