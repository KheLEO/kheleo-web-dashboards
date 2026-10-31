import { mkdir, readFile, writeFile, readdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("@mediapipe/tasks-vision"));
const packageInfo: { version: string } = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
) as { version: string };
await mkdir("public/mediapipe/wasm", { recursive: true });
await mkdir("public/models", { recursive: true });
for (const name of await readdir(join(packageRoot, "wasm")))
  if (/\.(wasm|js)$/.test(name))
    await copyFile(join(packageRoot, "wasm", name), join("public/mediapipe/wasm", name));
const url =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const modelPath = "public/models/pose_landmarker_lite.task";
let model: Buffer;
try {
  model = await readFile(modelPath);
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pose model download failed: ${response.status}`);
  model = Buffer.from(await response.arrayBuffer());
  await writeFile(modelPath, model);
}
const expectedHash = "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
if (createHash("sha256").update(model).digest("hex") !== expectedHash)
  throw new Error("Pose model checksum mismatch. Remove the cached model and retry.");
await writeFile(
  "public/mediapipe/manifest.json",
  JSON.stringify(
    {
      tasksVisionVersion: packageInfo.version,
      modelSource: url,
      modelSha256: createHash("sha256").update(model).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
