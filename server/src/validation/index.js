'use strict';
const { z } = require('zod');
const commandId = z.string().uuid();
const moveSchema = z.object({ commandId, kind: z.enum(['move', 'resign']), tileId: z.string().max(80).optional(), to: z.string().regex(/^-?\d+,-?\d+$/).optional() }).strict();
const rematchSchema = z.object({ gameId: z.string().uuid() }).strict();
module.exports = { moveSchema, rematchSchema };
