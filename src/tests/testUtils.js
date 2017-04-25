import fetch from 'isomorphic-fetch'
import * as Schema from '../db/model'

// The ajax helper function
let sid
export const resource = (method, endpoint, payload) => {
	const url = `http://localhost:3000/${endpoint}`
	const options = { method, headers: { 'Content-Type': 'application/json' }}
	if (payload) {
		options.body = JSON.stringify(payload)
	}
	if (sid) {
		options.headers.cookie = 'sid=' + sid
	}
	return fetch(url, options).then(r => {
			if (r.status == 200) {
				if (r.headers._headers['set-cookie']) {
					const tmp = r.headers._headers['set-cookie'][0].split(';')[0].split('=')
					sid = tmp[tmp.length - 1]
				}
				if (r.headers._headers['content-type'][0].indexOf('json') >= 0) {
					return r.json()
				} else {
					return r.text()
				}
			} else {	
				throw new Error(r.status)
			}
		})
}

// Helper function to clear up testing artifacts
export const removeUser = (username, done) => {
	Schema.Auth.remove({ username })
		.then(() => Schema.Article.remove({ author: username }))
		.then(() => Schema.Profile.remove({ username }))
		.then(() => {
			if (done) {
				done()
			}
		})
		.catch((err) => {
			if (done) {
				done(err)
			} else {
				console.error('DB ERROR: ' + err)
			}
		})
}