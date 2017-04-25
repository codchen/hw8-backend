import { Profile } from './db/model'
import { isLoggedIn } from './middlewares'
// Handles all following-related requests

// Handlers
// GET handler -> /following
const getFollowing = (req, res) => {
	const username = req.params.user === undefined ? req.loggedInUser : req.params.user
	Profile.findOne({ username })
		.exec((err, result) => {
			if (!result) {
				return res.status(404).send(`User ${username} not found`)
			} else {
				return res.send({
					username,
					following: result.following
				})
			}
		})
}

// PUT handler -> /following
const putFollowing = (req, res) => {
	if (req.params.user === undefined) {
		return res.status(400).send('Bad request')
	}
	const user = req.loggedInUser
	const username = req.params.user
	Profile.findOne({ username })
		.exec((err, toFollow) => {
			if (!toFollow) {
				return res.status(404).send(`User ${username} not found`)
			}
			Profile.findOne({ username: user })
				.exec((err, result) => {
					if (result.following.includes(username)) {
						return res.send({
							username: user,
							following: result.following
						})
					} else {
						Profile.updateOne({ username: user }, {
							$push: {
								following: username
							}
						}).exec(() => {
							return res.send({
								username: user,
								following: result.following.concat([username])
							})
						})
					}
				})
		})
}

// DELETE handler -> /following
const deleteFollowing = (req, res) => {
	if (req.params.user === undefined) {
		return res.status(400).send('Bad request')
	}
	const user = req.loggedInUser
	const username = req.params.user
	Profile.findOneAndUpdate({ username: user }, { 
		$pull: {
			following: username
		} 
	}).exec((err, result) => {
		return res.send({
			username: user,
			following: result.following.filter((f) => f !== req.params.user)
		})
	})
}

module.exports = app => {
     app.get('/following/:user?', isLoggedIn(true), getFollowing)
     app.put('/following/:user', isLoggedIn(true), putFollowing)
     app.delete('/following/:user', isLoggedIn(true), deleteFollowing)
}