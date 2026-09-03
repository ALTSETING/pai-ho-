'use strict';
const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),crypto=require('node:crypto');const sessions=new Map();
const accounts=()=>[{id:'one',username:process.env.PLAYER_ONE_USERNAME||'player-one',hash:process.env.PLAYER_ONE_PASSWORD_HASH||''},{id:'two',username:process.env.PLAYER_TWO_USERNAME||'player-two',hash:process.env.PLAYER_TWO_PASSWORD_HASH||''}];
const secret=()=>process.env.JWT_SECRET||'development-only-secret-change-me';
async function login(username,password){const a=accounts().find(x=>x.username===username);if(!a||!a.hash||!await bcrypt.compare(password,a.hash))return null;const sid=crypto.randomUUID();sessions.set(sid,a.id);return{token:jwt.sign({sub:a.id,sid},secret(),{expiresIn:'2h',issuer:'pai-sho-server'}),player:{id:a.id,name:a.username}}}
function verify(token){try{const p=jwt.verify(token,secret(),{issuer:'pai-sho-server'});return sessions.get(p.sid)===p.sub?p.sub:null}catch{return null}}const bearer=(h='')=>h.startsWith('Bearer ')?h.slice(7):'';function logout(token){const p=jwt.decode(token);if(p?.sid)sessions.delete(p.sid)}const name=id=>accounts().find(a=>a.id===id)?.username;
function middleware(req,res,next){const id=verify(bearer(req.headers.authorization));if(!id)return res.status(401).json({error:'Необхідна авторизація'});req.playerId=id;next()}
module.exports={login,verify,bearer,logout,name,middleware};
