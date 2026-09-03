import { z } from 'zod';
export const RULES_VERSION='Skud Pai Sho — Garden Gate rules, accessed 2026-09-03';
export type PlayerId='one'|'two'; export type Side='host'|'guest';
export type TileType='rose'|'chrysanthemum'|'rhododendron'|'jasmine'|'lily'|'whiteJade'|'knotweed'|'rock'|'wheel'|'boat'|'whiteLotus'|'orchid';
export type TileKind='basic'|'accent'|'special';
export interface Player{id:PlayerId;name:string;side:Side;online:boolean;ready:boolean}
export interface BoardPoint{id:string;x:number;y:number;gate:boolean;garden:'red'|'white'|'neutral'|'gate';midline:boolean}
export interface Tile{id:string;type:TileType;kind:TileKind;owner:PlayerId;position:string|null;blooming:boolean}
export interface Harmony{a:string;b:string;midline:boolean}
export interface Move{commandId:string;kind:'plant'|'arrange'|'resign'|'bonus';tileId?:string;to?:string;secondaryTileId?:string;secondaryTo?:string}
export type GamePhase='setup'|'playing'|'finished';
export interface GameResult{winner:PlayerId|null;reason:'harmony-ring'|'last-basic'|'resignation'|'draw'}
export interface MoveRecord{turn:number;player:PlayerId;move:Move;at:string;notation:string}
export interface GameState{id:string;rulesVersion:string;players:Record<PlayerId,Player>;board:Tile[];reserves:Record<PlayerId,Tile[]>;selectedAccents:Record<PlayerId,TileType[]>;activePlayer:PlayerId;turn:number;phase:GamePhase;harmonies:Harmony[];moves:MoveRecord[];result:GameResult|null;createdAt:string;updatedAt:string;version:number;rematch:Record<PlayerId,boolean>;lastMove:Move|null}
export interface LobbyState{players:Record<PlayerId,Player>;currentGameId:string|null}
export const moveSchema=z.object({commandId:z.string().uuid(),kind:z.enum(['plant','arrange','resign','bonus']),tileId:z.string().max(80).optional(),to:z.string().max(20).optional(),secondaryTileId:z.string().max(80).optional(),secondaryTo:z.string().max(20).optional()}).strict();
export const readySchema=z.object({ready:z.boolean()}).strict();
export const rematchSchema=z.object({gameId:z.string().uuid()}).strict();
export interface ClientToServerEvents{'lobby:join':()=>void;'player:ready':()=>void;'player:unready':()=>void;'game:move':(m:Move)=>void;'game:resign':(v:{commandId:string})=>void;'game:rematch':(v:{gameId:string})=>void}
export interface ServerToClientEvents{'lobby:state':(s:LobbyState)=>void;'game:started':(s:GameState)=>void;'game:state':(s:GameState)=>void;'game:move_rejected':(e:{commandId:string;reason:string})=>void;'game:finished':(r:GameResult)=>void;'connection:status':(s:{connected:boolean})=>void}
