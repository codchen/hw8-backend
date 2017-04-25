// const frontend = 'https://hw8-frontend.surge.sh'
const frontend = 'http://localhost:8080'
const redisURL = 'redis://h:pfac6eb5f0d8fde5a5ba2328cb0e7fd230b1e684f26cf441699ccfc62081bcc22@ec2-34-206-56-30.compute-1.amazonaws.com:50619'

const cookieKey = 'sid'
const redis = require('redis').createClient(redisURL)
const objKey = 'username'

module.exports = {
	cookieKey,
	putToSession: (sessionHash, authInfo) => redis.hmset(sessionHash, authInfo),
	deleteFromSession: (sessionHash) => redis.del(sessionHash),
	// Check if user is logged middleware
	isLoggedIn: (return401) => (req, res, next) => {
		const sessionKey = req.cookies[cookieKey]
		if (sessionKey === undefined) {
			if (return401) {
				return res.status(401).send('Unauthenticated')
			} else {
				return next()
			}
		}
		redis.hgetall(sessionKey, (err, result) => {
			if (!result) {
				if (return401) {
					return res.status(401).send('Unauthenticated')
				} else {
					return next()
				}
			}
			req.loggedInUser = result.username
			return next()
		})
	},
	// Check if CORS request is allowed on the origin
	cors: (req, res, next) => {
		res.set({
			'Access-Control-Allow-Origin': frontend,
			'Access-Control-Allow-Credentials': true,
			'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
			'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Authorization, Content-Type, Accept'
		})
		if (req.method === 'OPTIONS') {
			return res.status(200).send('OK')
		}
		return next()
	}
}