import { Auth, Profile, Link } from './db/model'
import { cookieKey, putToSession, isLoggedIn } from './middlewares'
import { linkHandler } from './link'

const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const config = require('../config/config.json')
const md5 = require('md5')

///////////////////////////////////////////////////////////////////////////////
// Dummy implementations to suppress passport errors
// Sessions are maintained manually instead
passport.serializeUser((username, done) => {
  	done(null, username)
});
passport.deserializeUser((id, done) => {
  	done(null, id)
});
///////////////////////////////////////////////////////////////////////////////

passport.use(new GoogleStrategy(
	config.google,
    (accessToken, refreshToken, profile, done) => {
    	const username = profile.displayName + '@google'
    	const email = profile.emails.length > 0 ? 
    		profile.emails[0].value : 'no@email'
    	Auth.findOne({ username }).exec().then((result) => {
			if (result) {
				return done(null, username)
			}
			return Link.findOne({ from: username }).exec()
    	}).then((result) => {
			if (result) {
				return done(null, result.to)
			}
			Promise.all([new Auth({ username }).save(),
				new Profile({
					username,
					email
				}).save()]).then(() => done(null, username))
		}).catch((err) => {
			done(err)
		})
  	}
));

const authSuccess = (req, res) => {
	const thirdPartyUser = req.user
	if (req.loggedInUser && !req.loggedInUser.includes('@')) {
		const nativeUser = req.loggedInUser
		linkHandler(req.loggedInUser, thirdPartyUser, () => {
			res.redirect('https://squirrelspace-frontend.surge.sh')
		})
	} else {
		const sessionKey = md5(Math.random().toString(36) + thirdPartyUser)
		res.cookie(cookieKey, sessionKey, {
			maxAge: 3600 * 1000,
			httpOnly: true
		})
		putToSession(sessionKey, { username: thirdPartyUser })
		res.redirect('https://squirrelspace-frontend.surge.sh')
	}
}

module.exports = app => {
	app.use(session({ secret: config.secret, 
		resave: false, saveUninitialized: false }))
	app.use(passport.initialize())
	app.use(passport.session())
	app.use('/auth/google', 
		passport.authenticate('google', { scope: ['email'] }))
	app.use('/google/callback', passport.authenticate('google', {
		successRedirect: '/auth/success',
		failureRedirect: '/auth/failure'
	}))
	app.use('/auth/success', isLoggedIn(false), authSuccess)
	app.use('/auth/failure', (req, res) => {
		res.redirect('https://squirrelspace-frontend.surge.sh')
	})
}