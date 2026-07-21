/**
 * Atlassian Document Format (ADF) authoring helpers.
 *
 * The ADF *schemas* (`AdfDocumentSchema`, `AdfNodeSchema`, `textToAdf`,
 * `adfToText`) live in `src/schemas/common/adf.ts`; this module adds the
 * ergonomic builder layer on top of them.
 */
export { AdfBuilder, adf, adfFromText } from './builder.js';
