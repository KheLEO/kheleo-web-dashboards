import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import internals from "@prisma/internals";
import { format, resolveConfig } from "prettier";

const check = process.argv.includes("--check");
const argument = process.argv.find((value: string) => value.startsWith("--schema="));
const schemaPath = resolve(
  argument?.slice(9) ?? process.env.BACKEND_SCHEMA ?? "../KheLEO-backend/prisma/schema.prisma",
);
const snapshotPath = resolve("docs/contracts/schema.prisma");
const schema = await readFile(check ? snapshotPath : schemaPath, "utf8");
if (check) {
  try {
    if ((await readFile(schemaPath, "utf8")) !== schema)
      throw new Error(
        "Backend schema differs from the committed contract snapshot. Review the contracts and run pnpm contracts:sync.",
      );
  } catch (error: unknown) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  const source: { schemaSha256: string } = JSON.parse(
    await readFile("docs/contracts/source.json", "utf8"),
  ) as { schemaSha256: string };
  if (createHash("sha256").update(schema).digest("hex") !== source.schemaSha256)
    throw new Error("Contract source checksum mismatch.");
}
const dmmf = await internals.getDMMF({ datamodel: schema });
const enums = dmmf.datamodel.enums
  .map(
    (entry) =>
      `export const ${entry.name}Values = ${JSON.stringify(entry.values.map((value) => value.name))} as const;\nexport type ${entry.name} = typeof ${entry.name}Values[number];`,
  )
  .join("\n\n");
const enumNames = new Set(dmmf.datamodel.enums.map((entry) => entry.name));
const scalars: Record<string, string> = {
  String: "string",
  Boolean: "boolean",
  Int: "number",
  Float: "number",
  DateTime: "ISODateString",
  Decimal: "DecimalString",
  Json: "JsonValue",
  BigInt: "string",
  Bytes: "string",
};
const models = dmmf.datamodel.models
  .map((model) => {
    const fields = model.fields
      .filter((field) => field.kind !== "object" && field.kind !== "unsupported")
      .map((field) => {
        const base = enumNames.has(field.type) ? field.type : scalars[field.type];
        if (!base) throw new Error(`Unsupported scalar ${field.type}`);
        return `  ${field.name}: ${base}${field.isList ? "[]" : ""}${field.isRequired ? "" : " | null"};`;
      });
    return `export interface ${model.name}Scalar {\n${fields.join("\n")}\n}`;
  })
  .join("\n\n");
const imports = dmmf.datamodel.enums
  .filter((entry) =>
    dmmf.datamodel.models.some((model) => model.fields.some((field) => field.type === entry.name)),
  )
  .map((entry) => entry.name)
  .join(", ");
const files = new Map<string, string>([
  [
    "src/contracts/enums.generated.ts",
    `// Generated from the committed backend schema snapshot.\n${enums}\n`,
  ],
  [
    "src/contracts/prisma-scalars.generated.ts",
    `// Schema references only. Relations and unsupported geometry are excluded.\nimport type { ISODateString, DecimalString, JsonValue } from "./common";\nimport type { ${imports} } from "./enums.generated";\n\n${models}\n`,
  ],
]);
for (const [path, content] of files) {
  const formatted = await format(content, { ...(await resolveConfig(path)), parser: "typescript" });
  if (check) {
    if ((await readFile(path, "utf8")) !== formatted)
      throw new Error(`Contract snapshot drift: ${path}; run pnpm contracts:sync`);
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, formatted);
  }
}
if (!check) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, schema);
  const revision = execFileSync("git", ["-C", dirname(dirname(schemaPath)), "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  await writeFile(
    "docs/contracts/source.json",
    JSON.stringify(
      { revision, schemaSha256: createHash("sha256").update(schema).digest("hex") },
      null,
      2,
    ) + "\n",
  );
}
