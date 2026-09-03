'use strict';
function createLobby(){return{players:{one:{id:'one',name:process.env.PLAYER_ONE_USERNAME||'player-one',side:'host',online:false,ready:false},two:{id:'two',name:process.env.PLAYER_TWO_USERNAME||'player-two',side:'guest',online:false,ready:false}},currentGameId:null}}
module.exports={createLobby};
