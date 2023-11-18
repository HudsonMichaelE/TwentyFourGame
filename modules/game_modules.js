const WebSocket = require('ws')
const math = require('mathjs')

const gameState = {
	WAITING: 0,
    ROUND: 1,
    TRANSITIONING: 2
}

const gameType = {
	SPEED: 0,
    FIRST: 1,
    ELIMINATION: 2
}

const gameMode = {
    RANDOM: -1,
    TWENTYFOUR: 0
}

//DEFAULT SETTINGS

//how rounds are played
var _type = gameType.FIRST;

//what gamemode is being played
var _mode = gameMode.TWENTYFOUR;

//rounds to win for first gametype
var _rounds_to_win = 3;

//rounds to win for first gametype
var _round_timer = 60;

//points to win for speed gametype
var _points_to_win = 200;

//elimination timer for elimination gametype
var _elimination_timer = 30;

//number range for twenty four gamemode
var _numeral_range = [0, 10];

const ROUND_DELAY = 6000;


exports.startGame = function (playerCount, data, wss, ws) {
    switch (parseInt(data.game_mode)) {
        case -1:
            _type = gameMode.RANDOM;
            break;
        case 0:
            _type = gameMode.TWENTYFOUR;
            break;
    }

    switch (parseInt(data.game_type)) {
        case 0:
            _mode = gameType.SPEED;
            break;
        case 1:
            _mode = gameType.FIRST;
            break;
        case 2:
            _mode = gameType.ELIMINATION;
            break;
    }

    _rounds_to_win = parseInt(data.game_round);
    _round_timer = parseInt(data.game_timer);
    _points_to_win = parseInt(data.game_point);
    _elimination_timer = parseInt(data.game_elim);

    _numeral_range = JSON.parse("[" + data.game_range + "]");

    //buffer round
    setTimeout(doRound, 6000, wss, ws)
}

function doRound(wss, ws) {
    var int1 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int2 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int3 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int4 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];

    let message = `{ "type" : "player_round", "numbers" : ["${int1}","${int2}","${int3}","${int4}"]}`
    console.log(message);

    wss.clients.forEach(function each(client) {
        if (client != ws && client.readyState == WebSocket.OPEN) {
            client.send(message);
        }
    })
}

function endRound(wss, ws) {

}

exports.doValidation = function(data, ws) {
    let answer = math.evaluate(data.equation);

    let message = `{ "type" : "validated", "answer" : "${answer}" }`;
    ws.send(message);
}