const mongoose = require('mongoose')
require('./db.js')

// Default headline and avatars for new users
const defaultHeadline = 'Try Elm'
const defaultAvatar = 'https://s-media-cache-ak0.pinimg.com/' + 
	'originals/5b/26/ff/5b26ff29982e6bd0aa05870ad84e9e7a.png'

// User info documents
const profileSchema = new mongoose.Schema({
	username: String,
	headline: { type: String, default: defaultHeadline },
	email: String,
	zipcode: { type: String, default: '00000' },
	avatar: { type: String, default: defaultAvatar },
	dob: { type: Number, default: 1 },
	following: { type: [String], default: [] }
}, { versionKey: false })
export const Profile = mongoose.model('profile', profileSchema)

///////////////////////////////////////////////////////////////////////////////

// Utility document for auto-increment index
// _id: 0 is the counter for articles
const counterSchema = new mongoose.Schema({
	_id: Number,
	next: Number
})
const Counter = mongoose.model('counter', counterSchema)
// Instantiate the auto-increment index for articles
new Counter({ _id: 0, next: 1 }).save().catch(_ => {})
// Helper function to return a promise that provides the next available article
// id, and update the new article id in counter document
const nextArticleId = () => {
	const query = Counter.findOneAndUpdate({ _id: 0 }, { $inc: { next: 1 } })
	return query.exec().then((result) => result.next)
}

// Sub-document for comments
const commentSchema = new mongoose.Schema({
	author: String,
	date: { type: Date, default: Date.now },
	text: String,
	commentId: Number
}, { versionKey: false })

// Article document
// counter field is the associated counter for comments ids of this article
const articleSchema = new mongoose.Schema({
	_id: { type: Number, index: { unique: true } },
	author: String,
	text: String,
	date: { type: Date, default: Date.now },
	img: String,
	comments: { type: [commentSchema], default: [] },
	counter: counterSchema
}, { versionKey: false })

// Pre-save hook for id-related housekeeping
articleSchema.pre('save', function(next) {
	const doc = this
	nextArticleId().then((_id) => {
		doc._id = _id
		doc.counter = { _id, next: 1 }
		next()
	}).catch((error) => {
		next(error)
	})
})

export const Article = mongoose.model('article', articleSchema)

// Helper function to return a promise that provides the next comment id of an
// article
export const nextCommentId = (postId) =>
	Article.findOneAndUpdate({ _id: postId }, { $inc: { 'counter.next': 1 } })
		.exec().then((result) => {
			if (result) {
				return result.counter.next
			} else {
				throw new Error('Article not found')
			}
		})

///////////////////////////////////////////////////////////////////////////////

// Authentication documents
const authSchema = new mongoose.Schema({
	username: { type: String, index: { unique: true } },
	salt: String,
	hash: String,
	links: [String]
}, { versionKey: false })
export const Auth = mongoose.model('auth', authSchema)

///////////////////////////////////////////////////////////////////////////////

const linkSchema = new mongoose.Schema({
	from: String,
	to: String
}, { versionKey: false })
export const Link = mongoose.model('link', linkSchema)