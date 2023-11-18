const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const path = require('path')


const port = 8080
const app = express()

app.use(express.static(path.join(__dirname + '/public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/player.html'))
  })

const page_modules = require('./modules/page_modules.js')
const game_modules = require('./modules/game_modules.js')

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

wss.on('connection', function connection(ws) {
    ws.id = null;

    wss.clients.forEach(function each(client) {
        console.log(`Client Connected`)
    })
    ws.on('message', function incoming(data) {
        let message = JSON.parse(data.toString())
        console.log(message)
        switch (message.type) {
            case 'login':
                console.log("CASE: Login")
                if(!page_modules.doLogin(message.name, wss, ws)) {
                    ws.send(`{ "type" : "login", "name" : "${message.name}", "result" : "false"}`)
                } else {
                    console.log('success')
                    ws.id = message.name
                    ws.send(`{ "type" : "login", "name" : "${message.name}", "result" : "true"}`)
                }
                break;
            case 'drop':
                console.log("CASE: Drop")
                page_modules.doLogout(message.player_name, wss, ws)
                break
            case 'start_game':
                console.log("CASE: Start Game")
                game_modules.startGame(page_modules.getPlayers().length, message, wss, ws)
                break
            case 'validate':
                console.log("CASE: Validate")
                try {
                    game_modules.doValidation(message, ws)
                } catch (err) {
                    console.error(err)
                    let message = `{ "type" : "error", "text" : "Invalid Expression, please try again!" }`;
                    ws.send(message);
                }
                break
            case 'player_done':
                console.log("CASE: Player Done")
                break
        }
    })
})

server.listen(port, function() {
    console.log(`Server is listening on port ${port}`)
})