import { Profile, Link } from './db/model'
import { isLoggedIn } from './middlewares'
// Handles all profile-related requests

// DB-query helper functions
const findByUser = (user, callback) => {
	Link.findOne({ from: user }).exec().then((result) => {
		if (result) {
			return result.to
		} else {
			return user
		}
	}).then((username) => {
		Profile.find({ username })
			.exec((err, result) => {
				callback(result, err)
			})
	}).catch((err) => {
		callback(undefined, err)
	})
}

const findByUsers = (users, callback) => {
	Promise.all(users.map((user) => Link.findOne({ from: user })
		.exec().then((result) => {
			if (result) {
				return result.to
			} else {
				return user
			}
		}))).then((users) => {
		Profile.find({ username: { $in: users } })
			.exec((err, result) => {
				callback(result, err)
			})
	}).catch((err) => {
		callback(undefined, err)
	})
}

const updateByUser = (user, payload, callback) => {
	Profile.update({ username: user }, payload)
		.exec((err, result) => {
			callback(result, err)
		})
}

// Helper function to retrieve specific information
const extract = (type, originalUsers) => (p) => {
	const info = {}
	return Link.findOne({ to: p.username }).exec().then((result) => {
		if (result && originalUsers.includes(result.from)) {
			info.username = result.from
		} else {
			info.username = p.username
		}
		info[type] = p[type]
		return info
	})
}

// Template GET handler for array responses
const getCollection = (type) => (req, res) => {
	const key = type + 's'
	const payload = {}
	const callback = (originalUsers) => (result, error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else {
			Promise.all(result.map(extract(type, originalUsers)))
				.then((results) => {
					payload[key] = results
					return res.send(payload)
				})
		}
	}
	if (req.params.user !== undefined) {
		const users = req.params.user.split(',')
		findByUsers(users, callback(users))
	} else {
		findByUser(req.loggedInUser, callback([req.loggedInUser]))
	}
}

// Template GET handler for non-array responses
const getItem = (type) => (req, res) => {
	const user = req.params.user !== undefined ? req.params.user :
		req.loggedInUser
	findByUser(user, (result ,error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else if (result.length === 0) {
			return res.status(404).send(`User ${user} not found`)
		} else {
			extract(type)(result[0]).then((results) => {
				return res.send(results)
			})
		}
	})
}

// Template PUT handler for non-array responses
const putItem = (type) => (req, res) => {
	if (req.body[type] === undefined) {
		return res.status(400).send('Bad request')
	}
	if (typeof req.body[type] !== 'string') {
		return res.status(400).send('Bad request: expect a string')
	}
	const payload = {}
	payload[type] = req.body[type]
	const user = req.loggedInUser
	updateByUser(user, payload, (result, error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else {
			payload.username = user
			return res.send(payload)
		}
	})
}

const uploadImage = require('./uploadCloudinary')

const uploadAvatar = (req, res) => {
	const payload = {
		avatar: req.fileurl
	}
	const user = req.loggedInUser
	updateByUser(user, payload, (result, error) => {
		if (error) {
			console.error(error)
			return res.status(500).send('Internal server error')
		} else {
			payload.username = user
			return res.send(payload)
		}
	})
}

module.exports = app => {
     app.get('/headlines/:user?', isLoggedIn(true), getCollection('headline'))
     app.put('/headline', isLoggedIn(true), putItem('headline'))
     app.get('/avatars/:user?', isLoggedIn(true), getCollection('avatar'))
     app.put('/avatar', isLoggedIn(true), uploadImage('avatar'), uploadAvatar)
     app.get('/zipcode/:user?', isLoggedIn(true), getItem('zipcode'))
     app.put('/zipcode', isLoggedIn(true), putItem('zipcode'))
     app.get('/email/:user?', isLoggedIn(true), getItem('email'))
     app.put('/email', isLoggedIn(true), putItem('email'))
     app.get('/dob', isLoggedIn(true), getItem('dob'))
}
