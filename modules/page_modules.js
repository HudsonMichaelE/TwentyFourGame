const WebSocket = require('ws')

var players_list = [];
exports.getPlayers = function() {
    return players_list
}
exports.doLogin = function(data, wss, ws) {
    var hostExists = false
    var loginSuccess = true
    if (data) {
        if (data == 'HOST') {
            wss.clients.forEach(function each(client) {
                if (client != ws && client.readyState == WebSocket.OPEN) {
                    if (client.id == 'HOST') {
                        console.log(`Login Attempt Failed: HOST already established.`)
                        loginSuccess = false;
                    }
                }
            })
            return loginSuccess
        } 

        wss.clients.forEach(function each(client) {
            if (client != ws && client.readyState == WebSocket.OPEN) {
                loginSuccess = true;
                if (client.id == 'HOST') hostExists = true
            }
        })
    }
    if(hostExists) {
        doPlayerJoin(data, wss, ws)
    }
    return hostExists && loginSuccess
}

exports.doLogout = function(data, wss, ws) {
    var index = players_list.indexOf(data);
    if (index !== -1) {
        players_list.splice(index, 1);
    }

    let player_drop_message = `{ "type" : "player_drop", "player_name" : "${data}"}`
    wss.clients.forEach(function each(client) {
        if (client != ws && client.readyState == WebSocket.OPEN) {
            if (client.id == 'HOST') {
                client.send(player_drop_message);
            }
        }
    })
}

function doPlayerJoin (data, wss, ws) {
    let player_join_message = `{ "type" : "player_join", "player_name" : "${data}"}`
    
    if(players_list.indexOf(data) == -1) players_list.push(data);

    wss.clients.forEach(function each(client) {
        if (client != ws && client.readyState == WebSocket.OPEN) {
            if (client.id == 'HOST') {
                client.send(player_join_message);
            }
        }
    })
}