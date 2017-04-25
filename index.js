const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('./lib/middlewares').cors

const app = express()
app.use(bodyParser.json())
app.use(cookieParser())
app.use(cors)
app.get('/', (req, res) => {
     res.send({ hello: 'world' })
})
require('./lib/auth')(app)
require('./lib/profile')(app)
require('./lib/articles')(app)
require('./lib/following')(app)
require('./lib/oauth')(app)

// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
     const addr = server.address()
     console.log(`Server listening at http://${addr.address}:${addr.port}`)
})
