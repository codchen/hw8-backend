// Handles all authentication-related requests
import { Profile, Auth, Link } from './db/model'
import { isLoggedIn, cookieKey, 
	putToSession, deleteFromSession } from './middlewares'
import { linkHandler } from './link'

const md5 = require('md5')

const hashcode = (salt, password) => md5(salt + password)

// Handler for POST /login
const login = (req, res) => {
	if (typeof req.body.username !== 'string' 
		|| typeof req.body.password !== 'string') {
		return res.status(400).send('Bad request')
	}
	// Check if user is already registered
	// If so get his salted value to compare
	const username = req.body.username
	const thirdPartyLogged = req.loggedInUser !== undefined && 
		req.loggedInUser.includes('@')
	Auth.findOne({ username }).exec()
		.then((result) => {
			if (!result) {
				return res.status(401).send('Username not registered')
			}
			if (hashcode(result.salt, req.body.password) !== result.hash) {
				return res.status(401).send('Password incorrect')
			}
			// Update session information
			const sessionKey = md5(Math.random().toString(36) + username)
			res.cookie(cookieKey, sessionKey, {
				maxAge: 3600 * 1000,
				httpOnly: true
			})
			putToSession(sessionKey, { username })
			if (thirdPartyLogged) {
				linkHandler(username, req.loggedInUser, 
					() => { res.send('OK') })
				return
			} else {
				return res.send({
					username,
					links: result.links ? result.links : [],
					result: 'success'
				})
			}
		}).catch((err) => {
			console.err(err)
			return res.status(500).send('Internal server error')
		})
}

// Handler for POST /register
const register = (req, res) => {
	if (typeof req.body.username !== 'string' 
		|| typeof req.body.password !== 'string'
		|| typeof req.body.email !== 'string'
		|| typeof req.body.zipcode !== 'string'
		|| typeof req.body.dob !== 'string') {
		return res.status(400).send('Bad request')
	}
	const salt = Math.random().toString(36)
	const hash = hashcode(salt, req.body.password)
	const username = req.body.username
	// Check if username already existed
	Auth.findOneAndUpdate({ username }, { $setOnInsert: 
		{ salt, hash, links: [] }}, { upsert: true }).exec().then((result) => {
			if (result !== null) {
				return res.status(401).send('Username existed')
			}
			new Profile({
				username,
				email: req.body.email,
				zipcode: req.body.zipcode,
				dob: new Date(req.body.dob).getTime(),
			}).save(() => {
				return res.send({
					username,
					result: 'success'
				})
			})
		}).catch((err) => {
			console.err(err)
			return res.status(500).send('Internal server error')
		})
}

// Handler for PUT /logout
const logout = (req, res) => {
	const sessionKey = req.cookies[cookieKey]
	deleteFromSession(sessionKey)
	res.clearCookie(cookieKey)
	return res.send('OK')
}

// Handler for PUT /password
const password = (req, res) => {
	const result = {
		username: req.loggedInUser,
		status: 'will not change'
	}
	return res.send(result)
}

const getSession = (req, res) => {
	const payload = {
		username: req.loggedInUser
	}
	if (!payload.username) {
		return res.send(payload)
	}
	Auth.findOne({ username: req.loggedInUser }).exec()
		.then((result) => {
			if (!result.links) {
				payload.links = []
			} else {
				payload.links = result.links
			}
			return res.send(payload)
		})
}

const unlink = (req, res) => {
	Auth.findOne({ username: req.loggedInUser }).exec()
		.then((result) => {
			const account = result.links.find((a) => 
				a.includes('@' + req.body.type))
			return Promise.all([
				Auth.update({ username: req.loggedInUser }, {
					$pull: { links: account }
				}).exec(), Link.deleteOne({ from: account }).exec()])
		}).then(() => Auth.findOne({ username: req.loggedInUser }).exec())
		.then((result) => {
			return res.send({
				links: result.links
			})
		})
}

module.exports = (app) => {
    app.post('/login', isLoggedIn(false), login)
    app.post('/register', register)
    app.put('/logout', isLoggedIn(true), logout)
    app.put('/password', isLoggedIn(true), password)
    app.get('/session', isLoggedIn(false), getSession)
    app.put('/unlink', isLoggedIn(true), unlink)
}