/**
 * Schema barrel — re-exports every table + enum + relations for
 * `src/db/client.ts` and callers doing `import * as schema from "@/db/schema"`.
 */

export * from "./patients";
export * from "./gestantes";
export * from "./tuberculose";
export * from "./has";
export * from "./geocode-cache";
export * from "./relations";
