import { Auth, Profile, Link } from './db/model'

export const linkHandler = (nativeUser, thirdPartyUser, finalize) => {
	Auth.update({ username: nativeUser }, {
		$push: { links: thirdPartyUser }
	}).exec().then(() => Promise.all([
		Profile.findOne({ username: thirdPartyUser }).exec(),
		Profile.findOne({ username: nativeUser }).exec()
	])).then((results) => {
		const tFollower = results[0].following
		const nFollower = results[1].following
		const following = [...new Set([...tFollower, ...nFollower])]
		return Profile.update({ username: nativeUser }, { following })
			.exec()
	}).then(() => new Link({ from: thirdPartyUser, to: nativeUser }).save())
	.then(() => Promise.all([
		Profile.deleteMany({ username: thirdPartyUser }).exec(),
		Auth.deleteMany({ username: thirdPartyUser }).exec()
	])).then(finalize).catch(_ => {})
}