const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const {addUser, getUser, getUsersInRoom, removeUser} = require("./activeMembers.js")


const port = process.env.PORT || 5000

const app = express()
const server = http.createServer(app)
const io = socketIo(server, { wsEngine: 'ws' })

app.use(cors())

app.get("/noWinner/:drawingName", (req, res) => {
  console.log(req.params.drawingName)
  io.emit('message', {username: "admin", message: `No correct guesses! The correct answer is close to ${req.params.drawingName}`})
  return 200
})

io.on('connect', (socket) => {
  socket.on('join', ({username}, callback) => {
    const {error, user} = addUser({id: socket.id, username})

    if (error) return callback(error)

    socket.join("game")

    socket.broadcast
        .emit('message', {username: "admin", message: `${user.username} has joined!`})

    callback()
  })

  socket.on('sendMessage', (message, callback) => {
    http.get(`http://10.20.40.57:8000/guess/${message.message}`, (res) => {
      let data;
      res.on('data',(t) => {
        data = t
      }).on('end', () => {
	console.log(data.toString())
        response = JSON.parse(data.toString())
        if (response && response["correct"]) {
          console.log("correct")
          socket.broadcast.emit('message', {username: "admin", message: `${message.username} guessed correctly! It was ${message.message}`})
        }
      })
    })

    io.emit('message', {username: message.username, message: message.message})
    callback(message)
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
