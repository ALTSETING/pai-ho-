'use strict';
const { z } = require('zod');
const commandId = z.string().uuid();
const moveSchema = z.object({ commandId, kind: z.enum(['plant', 'arrange', 'resign']), tileId: z.string().max(80).optional(), to: z.string().regex(/^-?\d,-?\d$/).optional(), secondaryTo: z.string().regex(/^-?\d,-?\d$/).optional() }).strict();
const accentSchema = z.object({ commandId, accents: z.array(z.enum(['rock', 'wheel', 'knotweed', 'boat'])).length(2) }).strict();
const rematchSchema = z.object({ gameId: z.string().uuid() }).strict();
module.exports = { moveSchema, accentSchema, rematchSchema };
