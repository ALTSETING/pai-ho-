'use strict';
const { z } = require('zod');
const commandId = z.string().uuid();
const cellId = z.string().regex(/^-?\d+,-?\d+$/);
const moveSchema = z.discriminatedUnion('kind', [
  z.object({ commandId, kind: z.literal('move'), gameId: z.string().uuid(), expectedTurnNumber: z.number().int().positive(), pieceId: z.string().min(1).max(80), path: z.array(cellId).min(1).max(64) }).strict(),
  z.object({ commandId, kind: z.literal('resign') }).strict(),
]);
const rematchSchema = z.object({ gameId: z.string().uuid() }).strict();
module.exports = { moveSchema, rematchSchema };
