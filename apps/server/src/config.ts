import {z} from 'zod';
const schema=z.object({PLAYER_ONE_USERNAME:z.string().min(1),PLAYER_ONE_PASSWORD_HASH:z.string().min(20),PLAYER_TWO_USERNAME:z.string().min(1),PLAYER_TWO_PASSWORD_HASH:z.string().min(20),JWT_SECRET:z.string().min(32),FRONTEND_URL:z.string().url(),DATABASE_URL:z.string().min(1),PORT:z.coerce.number().default(4000),NODE_ENV:z.enum(['development','test','production']).default('development')});
export const config=schema.parse(process.env);
