const WebSocket = require('ws')

exports.doLogin = function(data, wss, ws) {
    var loginSuccess = false
    if (data) {
        loginSuccess = true
        wss.clients.forEach(function each(client) {
            if (client != ws && client.readyState == WebSocket.OPEN) {
                if (client.id == data) {
                    console.log(`Login Attempt Failed: name ${data} already in use.`)
                    loginSuccess = false
                }
            }
        })
    }
    return loginSuccess
}