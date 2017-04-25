import { expect } from 'chai'
import { resource, removeUser } from './testUtils'

// Test authentication-related backend logic
describe('Test Authentication Schema', () => {
	const username = 'test-username'
	const password = 'test-password'
	const email = 'test@rice.edu'
	const zipcode = '12345'
	const dob = '01/01/1971'
	const profile = { username, password, email, zipcode, dob }

	it('should register the test user', (done) => {
		//remove existing user with the same name
		resource('POST', 'register', profile)
			.then((response) => {
				expect(response.result).to.equal('success')
				expect(response.username).to.equal(username)
				expect(Object.keys(response).length).to.equal(2)
				done()
			})
			.catch(done)
	})

	it('should log in the test user', (done) => {
		resource('POST', 'login', { username, password })
			.then((response) => {
				expect(response.result).to.equal('success')
				expect(response.username).to.equal(username)
				expect(Object.keys(response).length).to.equal(2)
			})
			.then(() => resource('PUT', 'password', { password: 'unused' }))
			.then((response) => {
				expect(response.status).to.equal('will not change')
				expect(response.username).to.equal(username)
				expect(Object.keys(response).length).to.equal(2)
				done()
			})
			.catch(done)
	})

	it('should log out', (done) => {
		const errorMsg = 'Should have authentication error'
		resource('PUT', 'logout')
			.then((response) => {
				expect(response).to.equal('OK')
			})
			.then(() => resource('PUT', 'password', { password: 'unused' }))
			.then((response) => {
				throw new Error('Should have authentication error')
			})
			.catch((e) => {
				expect(e.message).to.not.equal(errorMsg)
			})
			.then(done)
			.catch(done)
	})

	after('should remove test user', (done) => {
		removeUser(username, done)
	})
})