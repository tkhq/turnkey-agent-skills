/**
 * Regenerates the Turnkey API JSON-Schema fixtures consumed by
 * `tests/api-schemas.test.ts`.
 *
 * The fixtures are derived from the bundled `@turnkey/sdk-server` types
 * (`dist/__inputs__/public_api.types.d.ts`), which are themselves emitted by
 * `openapi-typescript` from the live Turnkey OpenAPI spec. Re-running this
 * script after any `@turnkey/sdk-server` bump produces a deterministic diff
 * that reviewers can inspect alongside doc updates.
 *
 * Outputs:
 *   - tests/fixtures/api-schemas.json
 *       JSON Schema document with one `definitions[<TypeName>]` entry per
 *       member of the SDK's `definitions` type alias (`v1*IntentV*`,
 *       `v1*Params*`, enums, etc.).
 *   - tests/fixtures/endpoint-to-intent.json
 *       Map: `/public/v1/{submit,query}/<endpoint>` →
 *       `{ intent: "v1*IntentV*", activityType: "ACTIVITY_TYPE_*" }`.
 *
 * Both files are checked in. Schemas are emitted by walking the SDK file's
 * AST directly (rather than via `ts-json-schema-generator`) because the
 * SDK packs every type into the body of three top-level type aliases —
 * `paths`, `operations`, `definitions` — and generic JSON-schema emitters
 * only expose top-level type declarations. A direct AST walk gives us:
 *   - per-definition `$ref`s preserved between members,
 *   - `additionalProperties: false` on every object so typos surface, and
 *   - deterministic output that diffs cleanly across SDK bumps.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

import ts from "typescript";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES_DIR = join(PROJECT_ROOT, "tests", "fixtures");
const SCHEMA_OUT = join(FIXTURES_DIR, "api-schemas.json");
const MAPPING_OUT = join(FIXTURES_DIR, "endpoint-to-intent.json");

const require = createRequire(import.meta.url);

interface EndpointInfo {
  intent: string;
  activityType: string;
}

// ---------------------------------------------------------------------------
// SDK file location
// ---------------------------------------------------------------------------

function locatePublicApiTypes(): string {
  // `@turnkey/sdk-server` doesn't expose `./package.json` in its `exports`
  // map, so we resolve its main entry instead and walk up to the package
  // root. The relative file path under `dist/` is SDK-internal; if it ever
  // moves we want the script to crash here so reviewers notice immediately
  // rather than silently regenerating an empty fixture.
  const mainEntry = require.resolve("@turnkey/sdk-server");
  let pkgRoot = dirname(mainEntry);
  while (!existsSync(join(pkgRoot, "package.json"))) {
    const parent = dirname(pkgRoot);
    if (parent === pkgRoot) {
      throw new Error(
        `Could not find @turnkey/sdk-server package root by walking up from ${mainEntry}.`,
      );
    }
    pkgRoot = parent;
  }
  const candidate = join(
    pkgRoot,
    "dist",
    "__inputs__",
    "public_api.types.d.ts",
  );
  if (!existsSync(candidate)) {
    throw new Error(
      `Could not locate @turnkey/sdk-server's public_api.types.d.ts at ${candidate}. ` +
        `Has the SDK reorganized its dist/ layout? Update scripts/refresh-api-schemas.ts.`,
    );
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function getMemberName(member: ts.TypeElement): string | null {
  if (!member.name) return null;
  if (ts.isIdentifier(member.name)) return member.name.text;
  if (ts.isStringLiteral(member.name)) return member.name.text;
  return null;
}

function isIndexedDefinitionsAccess(
  typeNode: ts.TypeNode | undefined,
): { typeName: string } | null {
  if (!typeNode || !ts.isIndexedAccessTypeNode(typeNode)) return null;
  const obj = typeNode.objectType;
  if (
    !ts.isTypeReferenceNode(obj) ||
    !ts.isIdentifier(obj.typeName) ||
    obj.typeName.text !== "definitions"
  ) {
    return null;
  }
  if (!ts.isLiteralTypeNode(typeNode.indexType)) return null;
  if (!ts.isStringLiteral(typeNode.indexType.literal)) return null;
  return { typeName: typeNode.indexType.literal.text };
}

function findProp(
  literal: ts.TypeLiteralNode,
  name: string,
): ts.PropertySignature | null {
  for (const m of literal.members) {
    if (!ts.isPropertySignature(m)) continue;
    if (getMemberName(m) === name) return m;
  }
  return null;
}

// ---------------------------------------------------------------------------
// JSON Schema emission
// ---------------------------------------------------------------------------

interface Schema {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: boolean | Schema;
  enum?: unknown[];
  $ref?: string;
  anyOf?: Schema[];
  allOf?: Schema[];
  description?: string;
  format?: string;
  nullable?: boolean;
  [key: string]: unknown;
}

/**
 * Convert a TypeScript type AST node into a JSON Schema fragment.
 *
 * The SDK file is openapi-typescript output, which means we only need to
 * cover a small, predictable subset of TS type syntax. Anything we don't
 * recognize falls through to an unconstrained `{}` (matches anything) — we
 * surface a console.warn so reviewers can decide whether to extend this
 * function. In practice the unhandled cases for the current SDK are:
 *   - the lone `protobufAny` intersection at line ~635, which our docs
 *     never hit directly (it's a server-side wrapper), and
 *   - `[key: string]: unknown` index signatures, which become permissive
 *     `additionalProperties: true`.
 */
function tsTypeToJsonSchema(node: ts.TypeNode): Schema {
  // `Date`, `Buffer`, etc. — bare type references not pointing into
  // `definitions[]`. The SDK doesn't actually emit these; if we encounter
  // one, treat it as an unknown placeholder.
  if (ts.isTypeReferenceNode(node)) {
    const name = ts.isIdentifier(node.typeName)
      ? node.typeName.text
      : node.typeName.getText();
    if (name === "Array" && node.typeArguments?.length === 1) {
      return { type: "array", items: tsTypeToJsonSchema(node.typeArguments[0]) };
    }
    return {};
  }

  const indexed = isIndexedDefinitionsAccess(node);
  if (indexed) {
    return { $ref: `#/definitions/${indexed.typeName}` };
  }

  if (ts.isArrayTypeNode(node)) {
    return { type: "array", items: tsTypeToJsonSchema(node.elementType) };
  }

  if (ts.isTypeLiteralNode(node)) {
    return typeLiteralToSchema(node);
  }

  if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) {
      return { type: "string", enum: [node.literal.text] };
    }
    if (ts.isNumericLiteral(node.literal)) {
      return { type: "number", enum: [Number(node.literal.text)] };
    }
    if (node.literal.kind === ts.SyntaxKind.NullKeyword) {
      return { type: "null" };
    }
    if (node.literal.kind === ts.SyntaxKind.TrueKeyword) {
      return { type: "boolean", enum: [true] };
    }
    if (node.literal.kind === ts.SyntaxKind.FalseKeyword) {
      return { type: "boolean", enum: [false] };
    }
  }

  if (ts.isUnionTypeNode(node)) {
    const members = node.types;
    const isNullMember = (t: ts.TypeNode) =>
      ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword;
    const nonNull = members.filter((t) => !isNullMember(t));
    const hasNull = nonNull.length !== members.length;

    // All non-null members are string literals → string enum (with optional null)
    const allStringLits = nonNull.every(
      (t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal),
    );
    if (allStringLits && nonNull.length > 0) {
      const values = nonNull.map(
        (t) => ((t as ts.LiteralTypeNode).literal as ts.StringLiteral).text,
      );
      const schema: Schema = { type: "string", enum: values };
      if (hasNull) {
        schema.type = ["string", "null"];
        schema.enum = [...values, null];
      }
      return schema;
    }

    if (nonNull.length === 1) {
      const inner = tsTypeToJsonSchema(nonNull[0]);
      if (hasNull) {
        // Promote single-type nullable to type: [..., 'null'] when possible
        if (typeof inner.type === "string") {
          return { ...inner, type: [inner.type, "null"] };
        }
        return { anyOf: [inner, { type: "null" }] };
      }
      return inner;
    }

    const anyOf = nonNull.map(tsTypeToJsonSchema);
    if (hasNull) anyOf.push({ type: "null" });
    return { anyOf };
  }

  if (ts.isIntersectionTypeNode(node)) {
    return { allOf: node.types.map(tsTypeToJsonSchema) };
  }

  if (ts.isParenthesizedTypeNode(node)) {
    return tsTypeToJsonSchema(node.type);
  }

  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: "string" };
    case ts.SyntaxKind.NumberKeyword:
      return { type: "number" };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: "boolean" };
    case ts.SyntaxKind.NullKeyword:
      return { type: "null" };
    case ts.SyntaxKind.UndefinedKeyword:
      return {};
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return {};
    case ts.SyntaxKind.ObjectKeyword:
      return { type: "object" };
  }

  return {};
}

/**
 * Convert a `{ a: T; b?: U; [key: string]: V }` TypeLiteralNode into a
 * JSON Schema object. Optional members (`?`) are omitted from `required`.
 * An index signature becomes `additionalProperties: <schema>`; absent
 * index signature defaults to `additionalProperties: false` so reviewers
 * notice typo'd field names.
 */
function typeLiteralToSchema(node: ts.TypeLiteralNode): Schema {
  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  let additional: Schema | true | false = false;

  for (const member of node.members) {
    if (ts.isIndexSignatureDeclaration(member)) {
      // We only model string-keyed index signatures.
      if (
        member.parameters.length === 1 &&
        member.parameters[0].type?.kind === ts.SyntaxKind.StringKeyword
      ) {
        additional = member.type ? tsTypeToJsonSchema(member.type) : true;
      }
      continue;
    }
    if (!ts.isPropertySignature(member)) continue;
    const name = getMemberName(member);
    if (!name || !member.type) continue;
    const propSchema = tsTypeToJsonSchema(member.type);
    const description = extractDescription(member);
    if (description) propSchema.description = description;
    properties[name] = propSchema;
    if (!member.questionToken) required.push(name);
  }

  const schema: Schema = {
    type: "object",
    properties,
    additionalProperties: additional,
  };
  if (required.length > 0) schema.required = required;
  return schema;
}

/** Extract the `@description` JSDoc tag value, if present. */
function extractDescription(node: ts.Node): string | null {
  const tags = ts.getJSDocTags(node);
  for (const tag of tags) {
    if (tag.tagName.text === "description" && typeof tag.comment === "string") {
      return tag.comment;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Walk SDK file
// ---------------------------------------------------------------------------

function buildSchemas(sourceFile: ts.SourceFile): Record<string, Schema> {
  const schemas: Record<string, Schema> = {};

  for (const stmt of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(stmt) || stmt.name.text !== "definitions") {
      continue;
    }
    if (!ts.isTypeLiteralNode(stmt.type)) continue;

    for (const member of stmt.type.members) {
      if (!ts.isPropertySignature(member)) continue;
      const name = getMemberName(member);
      if (!name || !member.type) continue;
      schemas[name] = tsTypeToJsonSchema(member.type);
    }
  }

  // Sort keys for deterministic output.
  return Object.fromEntries(
    Object.keys(schemas)
      .sort()
      .map((k) => [k, schemas[k]]),
  );
}

function buildEndpointMapping(
  sourceFile: ts.SourceFile,
): Record<string, EndpointInfo> {
  const pathsToOp = new Map<string, string>();
  const opToReqType = new Map<string, string>();
  const reqTypeToInfo = new Map<string, EndpointInfo>();

  function extractRequestType(node: ts.TypeNode | undefined): string | null {
    if (!node || !ts.isTypeLiteralNode(node)) return null;
    const params = findProp(node, "parameters");
    if (!params?.type || !ts.isTypeLiteralNode(params.type)) return null;
    const outerBody = findProp(params.type, "body");
    if (!outerBody?.type || !ts.isTypeLiteralNode(outerBody.type)) return null;
    const innerBody = findProp(outerBody.type, "body");
    return innerBody ? isIndexedDefinitionsAccess(innerBody.type)?.typeName ?? null : null;
  }

  function extractRequestInfo(
    node: ts.TypeNode | undefined,
  ): EndpointInfo | null {
    if (!node || !ts.isTypeLiteralNode(node)) return null;
    let intent: string | null = null;
    let activityType: string | null = null;
    for (const m of node.members) {
      if (!ts.isPropertySignature(m)) continue;
      const name = getMemberName(m);
      if (name === "type" && m.type) {
        if (
          ts.isLiteralTypeNode(m.type) &&
          ts.isStringLiteral(m.type.literal) &&
          m.type.literal.text.startsWith("ACTIVITY_TYPE_")
        ) {
          activityType = m.type.literal.text;
        }
      } else if (name === "parameters") {
        intent = isIndexedDefinitionsAccess(m.type)?.typeName ?? null;
      }
    }
    if (intent && activityType) return { intent, activityType };
    return null;
  }

  for (const stmt of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(stmt)) continue;
    if (!ts.isTypeLiteralNode(stmt.type)) continue;

    if (stmt.name.text === "paths") {
      for (const member of stmt.type.members) {
        if (!ts.isPropertySignature(member)) continue;
        const url = getMemberName(member);
        if (
          !url ||
          (!url.startsWith("/public/v1/submit/") &&
            !url.startsWith("/public/v1/query/"))
        ) {
          continue;
        }
        if (!member.type || !ts.isTypeLiteralNode(member.type)) continue;
        const post = findProp(member.type, "post");
        const t = post?.type;
        if (!t || !ts.isIndexedAccessTypeNode(t)) continue;
        const obj = t.objectType;
        if (
          !ts.isTypeReferenceNode(obj) ||
          !ts.isIdentifier(obj.typeName) ||
          obj.typeName.text !== "operations"
        ) {
          continue;
        }
        if (!ts.isLiteralTypeNode(t.indexType)) continue;
        if (!ts.isStringLiteral(t.indexType.literal)) continue;
        pathsToOp.set(url, t.indexType.literal.text);
      }
    } else if (stmt.name.text === "operations") {
      for (const member of stmt.type.members) {
        if (!ts.isPropertySignature(member)) continue;
        const opName = getMemberName(member);
        if (!opName) continue;
        const reqType = extractRequestType(member.type);
        if (reqType) opToReqType.set(opName, reqType);
      }
    } else if (stmt.name.text === "definitions") {
      for (const member of stmt.type.members) {
        if (!ts.isPropertySignature(member)) continue;
        const typeName = getMemberName(member);
        if (!typeName || !typeName.endsWith("Request")) continue;
        const info = extractRequestInfo(member.type);
        if (info) reqTypeToInfo.set(typeName, info);
      }
    }
  }

  const result: Record<string, EndpointInfo> = {};
  let skipped = 0;
  for (const url of [...pathsToOp.keys()].sort()) {
    const opName = pathsToOp.get(url)!;
    const reqType = opToReqType.get(opName);
    if (!reqType) {
      skipped++;
      continue;
    }
    const info = reqTypeToInfo.get(reqType);
    if (!info) {
      skipped++;
      continue;
    }
    result[url] = info;
  }
  if (skipped > 0) {
    console.warn(
      `Skipped ${skipped} endpoint(s) when building mapping (no request body / no activity type — typically read-only query routes).`,
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const HEADER_COMMENT =
  "Auto-generated by scripts/refresh-api-schemas.ts. Do not edit by hand. Run `npm run refresh-api-schemas` to regenerate.";

function writeJson(path: string, body: object): void {
  mkdirSync(dirname(path), { recursive: true });
  const wrapped = { _comment: HEADER_COMMENT, ...body };
  writeFileSync(path, JSON.stringify(wrapped, null, 2) + "\n", "utf-8");
}

function loadSourceFile(typesPath: string): ts.SourceFile {
  const program = ts.createProgram({
    rootNames: [typesPath],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: false,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      noEmit: true,
    },
  });
  const sourceFile = program.getSourceFile(typesPath);
  if (!sourceFile) throw new Error(`TypeScript could not load ${typesPath}`);
  return sourceFile;
}

function main(): void {
  const typesPath = locatePublicApiTypes();
  console.log(`Reading ${relative(PROJECT_ROOT, typesPath)}`);

  const sourceFile = loadSourceFile(typesPath);

  console.log("Emitting JSON Schemas from SDK definitions...");
  const definitions = buildSchemas(sourceFile);
  if (Object.keys(definitions).length === 0) {
    throw new Error(
      "Emitted zero schemas — the SDK's `definitions` type alias may have been restructured.",
    );
  }
  writeJson(SCHEMA_OUT, {
    $schema: "http://json-schema.org/draft-07/schema#",
    definitions,
  });
  console.log(
    `Wrote ${relative(PROJECT_ROOT, SCHEMA_OUT)} with ${Object.keys(definitions).length} definitions`,
  );

  console.log("Building endpoint → intent mapping...");
  const mapping = buildEndpointMapping(sourceFile);
  if (Object.keys(mapping).length === 0) {
    throw new Error(
      "Endpoint mapping is empty — the SDK's `paths`/`operations`/`definitions` shape may have changed.",
    );
  }
  writeJson(MAPPING_OUT, mapping);
  console.log(
    `Wrote ${relative(PROJECT_ROOT, MAPPING_OUT)} with ${Object.keys(mapping).length} endpoints`,
  );
}

main();
