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

//timer for round holder
var roundTimer;
var delayTimeout;

//Current Round Time
var currentTime = _round_timer;

const ROUND_DELAY = 10000;

/* const playerData = {
    name: '',
    first_points:0,
    speed_points:0.0,
    elim_points:30
} */

const playersData = [];

var startElim = false;
var dontBurn = [];
var eliminated = [];

exports.startGame = function (playerCount, data, wss, ws) {
    switch (parseInt(data.game_mode)) {
        case -1:
            _mode = gameMode.RANDOM;
            break;
        case 0:
            _mode = gameMode.TWENTYFOUR;
            break;
    }

    switch (parseInt(data.game_type)) {
        case 0:
            _type = gameType.SPEED;
            break;
        case 1:
            _type = gameType.FIRST;
            break;
        case 2:
            _type = gameType.ELIMINATION;
            break;
    }

    _rounds_to_win = parseInt(data.game_round);
    _round_timer = parseInt(data.game_timer);
    currentTime = _round_timer;
    _points_to_win = parseInt(data.game_point);
    _elimination_timer = parseInt(data.game_elim);

    _numeral_range = JSON.parse("[" + data.game_range + "]");

    //setup players
    wss.clients.forEach(function each(client) {
        if (client != ws && client.readyState == WebSocket.OPEN) {
            var playerData = {
                name: client.id,
                first_points:0,
                speed_points:0.0,
                elim_points:30
            }
            playersData.push(playerData);
        }
    })

    //buffer round
    delayTimeout = setTimeout(doRound, ROUND_DELAY, wss)
}

function doRound(wss) {
    clearTimeout(delayTimeout);
    currentTime = _round_timer;

    var int1 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int2 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int3 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];
    var int4 = Math.floor(Math.random() * _numeral_range[1]) + _numeral_range[0];

    let message = `{ "type" : "player_round", "numbers" : ["${int1}","${int2}","${int3}","${int4}"]}`
    console.log(message);

    wss.clients.forEach(function each(client) {
        if (client.readyState == WebSocket.OPEN) {
            client.send(message);

            var clientExists = false;
            for(var i = 0; i < playersData.length; i++) {
                if(client.id == playersData[i].name) {
                    clientExists = true;
                }
            }
            if(!clientExists) {
                var playerData = {
                    name: client.id,
                    first_points:0,
                    speed_points:0.0,
                    elim_points:30
                }
                playersData.push(playerData);
            }
        }
    })
    
    switch (_type) {
        case gameType.FIRST:
            roundTimer = setInterval(doTick, 1000, wss);
            break;
        case gameType.SPEED:
            roundTimer = setInterval(doTick, 1000, wss);
            break;
        case gameType.ELIMINATION:
            startElim = false;
            roundTimer = setInterval(doElim, 1000, wss);
            break;
    }
}

function endRound(wss) {
    clearInterval(roundTimer);

    wss.clients.forEach(function each(client) {
        let message = '{ "type" : "end_round" }';
        if (client.readyState == WebSocket.OPEN) {
            client.send(message);
        }
    })
    delayTimeout = setTimeout(doRound, ROUND_DELAY, wss)
}

exports.doValidation = function(data, ws) {
    let answer = math.evaluate(data.equation);

    let message = `{ "type" : "validated", "answer" : "${answer}" }`;
    ws.send(message);
}

exports.playerDone = function(data, wss, ws) {
    switch (_type) {
        case gameType.FIRST:
            addFirstPoints(wss, ws);
            endRound(wss);
            break;
        case gameType.SPEED:
            addSpeedPoints(wss, ws);
            break;
        case gameType.ELIMINATION:
            noBurn(ws);
    }
    updatePointValues(wss, ws, data);
}



function updatePointValues(wss, ws, data) {
    var points = 0;

    for(var i = 0; i < playersData.length; i++) {
        if(ws.id == playersData[i].name) {
            switch (_type) {
                case gameType.FIRST:
                    points = playersData[i].first_points;
                    break;
                case gameType.SPEED:
                    points = playersData[i].speed_points;
                    break;;
            }
        }
    }

    let message = `{ "type" : "point_update", "player_name" : "${ws.id}", "points" : "${points}"}`;
    let equation_message = `{ "type" : "show_equation", "player_name" : "${ws.id}", "equation" : "${data.equation}" }`

    wss.clients.forEach(function each(client) {
        if (client.id == 'HOST' && client.readyState == WebSocket.OPEN) {
            client.send(message);
            client.send(equation_message);
        }
    })
}

function addFirstPoints(wss, ws) {
    playersData.forEach((player) => {
        if (player.name == ws.id) {
            player.first_points += 1;
            if(player.first_points == _rounds_to_win) {
                gameEnd(wss, player.name, player.first_points);
            }
        }
    })
    endRound(wss);
}

function addSpeedPoints(wss, ws) {
    playersData.forEach((player) => {
        if (player.name == ws.id) {
            player.speed_points += currentTime;
            if(player.speed_points >= _points_to_win) {
                gameEnd(wss, player.name, player.speed_points);
            }
        }
    })
}

function doTick(wss) {
    currentTime -= 1;
    if(currentTime <= 0) {
        clearInterval(roundTimer);
        endRound(wss);
    } else {
        let message = `{ "type" : "time", "time_max" : "${_round_timer}", "time_left" : "${currentTime}"}`;
        wss.clients.forEach(function each(client) {
            if (client.readyState == WebSocket.OPEN) {
                client.send(message);
            }
        })
    }
}

function noBurn(ws) {
    if(!startElim) {
        startElim = true;
    }
    dontBurn.push(ws.id);
}

function doElim(wss) {
    if(startElim) {
        playersData.forEach((player) => {
            if (dontBurn.indexOf(player.name) !== -1) {
                player.elim_points -= 1;
                if(player.elim_points <= 0) {
                    eliminated.push(player.name);
                }
            }
        })
    }
    checkEndElim(wss)
}

function checkEndElim(wss) {
    if(playersData.length == eliminated.length - 1) {
        clearInterval(roundTimer);
        roundTimer = null;
        gameEnd(wss, "NOT_IMPLEMENTED", 0);
        return;
    }

    if (playersData.length == eliminated.length + dontBurn.length) {
        clearInterval(roundTimer);
        endRound(wss);
    }
}

function gameEnd(wss, name, points) {
    console.log("Game End");
    clearInterval(roundTimer);
    let message = `{ "type" : "end_game", "winner" : "${name}", "points" : "${points}" }`;

    wss.clients.forEach(function each(client) {
        if (client.readyState == WebSocket.OPEN) {
            client.send(message);
        }
    })
}