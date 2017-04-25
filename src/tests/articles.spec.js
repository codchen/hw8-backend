import { expect } from 'chai'
import { resource, removeUser } from './testUtils'

// Validate the format of response article in every case
const validateArticleFormat = (articles) => {
	expect(articles).to.be.an('array')
	articles.forEach((article) => {
		expect(article._id).to.be.a('number')
		// Test for integer id
		expect(article._id % 1).to.be.equal(0)
		expect(article.author).to.be.a('string')
		expect(article.text).to.be.a('string')
		expect(article.date).to.be.a('string')
		if (article.img) {
			expect(article.img).to.be.a('string')
		}
		validateCommentFormat(article.comments)
	})
}

// Validate the format of response comment in every case
const validateCommentFormat = (comments) => {
	expect(comments).to.be.an('array')
	comments.forEach((comment) => {
		expect(comment.author).to.be.a('string')
		expect(comment.commentId).to.be.a('number')
		// Test for integer id
		expect(comment.commentId % 1).to.be.equal(0)
		expect(comment.date).to.be.a('string')
		expect(comment.text).to.be.a('string')
	})
}

// Test article-related backend logic
describe('Test Article Schema', () => {
	const me = 'me'
	const follower_1 = 'f1'
	const follower_2 = 'f2'
	const password = 'test-password'
	const email = 'test@rice.edu'
	const zipcode = '12345'
	const dob = '01/01/1971'
	before('Should register testing users', (done) => {
		resource('POST', 'register', {
			username: me, password, email, zipcode, dob
		}).then(() => resource('POST', 'register', {
			username: follower_1, password, email, zipcode, dob
		})).then(() => resource('POST', 'register', {
			username: follower_2, password, email, zipcode, dob
		})).then(() => resource('POST', 'login', {
			username: me, password
		})).then(() => resource('PUT', `following/${follower_1}`))
			.then(() => resource('PUT', `following/${follower_2}`))
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	const article_1 = 'this is the first article'
	const article_2 = 'this is the second article'
	const article_3 = 'this is the third article'

	it('should post an article', (done) => {
		const postArticle = (username, text) =>
			resource('POST', 'login', { username, password })
				.then(() => resource('POST', 'article', { text }))
				.then((body) => {
					validateArticleFormat(body.articles)
				} )
				.then(() => resource('PUT', 'logout'))
		postArticle(me, article_1)
			.then(() => postArticle(follower_1, article_2))
			.then(() => postArticle(follower_2, article_3))
			.then(() => done())
			.catch(done)
	})

	it('should get all articles', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('GET', 'articles'))
			.then((body) => {
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(3)
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	it('should get articles by user', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('GET', `articles/${follower_1}`))
			.then((body) => {
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(1)
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	let my_article_id

	it('should find my article id and get that article by id', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('GET', 'articles'))
			.then((body) => {
				my_article_id = body.articles.find((a) => a.author === me)._id
			})
			.then(() => resource('GET', `articles/${my_article_id}`))
			.then((body) => {
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(1)
				expect(body.articles[0]._id).to.equal(my_article_id)
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	const article_edit = 'ae'
	const new_comment = 'nc'
	const comment_edit = 'ce'

	it('should edit article', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('PUT', `articles/${my_article_id}`,
				{ text: article_edit }))
			.then((body) => {
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(1)
				expect(body.articles[0].text).to.equal(article_edit)
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	it('should not edit unauthored article', (done) => {
		const errorMsg = 'Should have error when editting unauthored article'
		resource('POST', 'login', { username: follower_1, password })
			.then(() => resource('PUT', `articles/${my_article_id}`,
				{ text: article_edit }))
			.then(() => {
				throw new Error(errorMsg)
			})
			.catch((e) => {
				expect(e.message).to.not.equal(errorMsg)
				return resource('PUT', 'logout')
			})
			.then(() => done())
			.catch(done)
	})

	let my_comment_id

	it('should post a new comment', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('PUT', `articles/${my_article_id}`,
				{ text: new_comment, commentId: -1 }))
			.then((body) => {
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(1)
				expect(body.articles[0].comments[0].text).to.equal(new_comment)
				my_comment_id = body.articles[0].comments[0].commentId
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	it('should edit a comment', (done) => {
		resource('POST', 'login', { username: me, password })
			.then(() => resource('PUT', `articles/${my_article_id}`,
				{ text: comment_edit, commentId: my_comment_id }))
			.then((body) => {
				console.log(body)
				validateArticleFormat(body.articles)
				expect(body.articles.length).to.equal(1)
				expect(body.articles[0].comments[0].text).to.equal(comment_edit)
			})
			.then(() => resource('PUT', 'logout'))
			.then(() => done())
			.catch(done)
	})

	it('should not edit unauthored comment', (done) => {
		const errorMsg = 'Should have error when editting unauthored comment'
		resource('POST', 'login', { username: follower_1, password })
			.then(() => resource('PUT', `articles/${my_article_id}`,
				{ text: comment_edit, commentId: my_comment_id }))
			.then(() => {
				throw new Error(errorMsg)
			})
			.catch((e) => {
				expect(e.message).to.not.equal(errorMsg)
				return resource('PUT', 'logout')
			})
			.then(() => done())
			.catch(done)
	})

	after('should remove test users', (done) => {
		removeUser(me)
		removeUser(follower_1)
		removeUser(follower_2, done)
	})
})