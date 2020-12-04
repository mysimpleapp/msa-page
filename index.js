const { Page } = require("./model")
const { PagePerm } = require("./perm")
const { useMsaBoxesRouter } = Msa.require("utils")
const { db } = Msa.require("db")
const { userMdw, unauthHtml } = Msa.require("user")
//const { MsaSheet, renderSheetAsHtml } = Msa.require("sheet/module")

class MsaPageModule extends Msa.Module {

	constructor() {
		super()
		this.initApp()
		//this.initSheetMod()
	}

	getId(req, reqId) {
		return `page-${reqId}`
	}

	getUserId(req) {
		const user = req.user
		return user ? user.id : req.connection.remoteAddress
	}

	getUserName(req, reqUserName) {
		const user = req.user
		return user ? user.name : reqUserName
	}

	canRead(req, page) {
		const perm = page.params.perm.get()
		return perm.check(req.user, PagePerm.READ)
	}

	canWrite(req, page) {
		const perm = page.params.perm.get()
		return perm.check(req.user, PagePerm.WRITE)
	}

	canAdmin(req, page) {
		const perm = page.params.perm.get()
		return perm.check(req.user, PagePerm.ADMIN)
	}

	initApp() {
		/*
				this.app.get("/:id", userMdw, async (req, res, next) => {
					withDb(async db => {
						const ctx = newCtx(req, { db })
						const reqId = req.params.id
						const id = this.sheetMod.getId(ctx, reqId)
						const sheet = await this.sheetMod.getSheet(ctx, id)
						if (sheet === null) return next(Msa.NOT_FOUND)
						res.sendPage(renderSheetAsHtml(sheet, "/page/_sheet", reqId))
					}).catch(err => {
						if (err === Msa.FORBIDDEN) res.sendPage(unauthHtml)
						else next(err)
					})
				})
		*/

		// get page
		this.app.get("/:id", async (req, res, next) => {
			const reqId = req.params.id
			if (reqId.indexOf('.') >= 0)
				return next()
			const id = this.getId(req, reqId)
			const page = await this.getPage(req, id)
			res.sendPage({
				wel: "/page/msa-page.js",
				attrs: {
					'page-id': reqId,
					'editable': this.canWrite(req, page),
					'fetch': 'false'
				},
				content: page.content
			})
		})

		this.app.get("/:id/_page", userMdw, async (req, res, next) => {
			try {
				const id = this.getId(req, req.params.id)
				const page = await this.getPage(req, id)
				res.json(this.exportPage(req, page))
			} catch(err) { next(err) }
		})

		this.app.post("/:id/_page", userMdw, async (req, res, next) => {
			try {
				const id = this.getId(req, req.params.id)
				const { content, by } = req.body
				await this.upsertPage(req, id, content, { by })
				res.sendStatus(Msa.OK)
			} catch(err) { next(err) }
		})

		// MSA boxes
		useMsaBoxesRouter(this.app, '/:id/_box', req => ({
			parentId: `page-${req.params.id}`
		}))
	}
	/*
		initSheetMod() {
			this.sheetMod = new class extends MsaSheet {
				getId(ctx, reqId) {
					return `page-${reqId}`
				}
			}
			this.app.use("/_sheet", this.sheetMod.app)
		}
	*/
	async getPage(req, id) {
		const dbPage = await db.collection("msa_pages").findOne({ _id:id })
		const page = Page.newFromDb(id, dbPage)
		if (!this.canRead(req, page)) throw Msa.FORBIDDEN
		return page
	}

	exportPage(req, page) {
		return {
			id: page.id,
			content: page.content,
			createdById: page.createdById,
			createdBy: page.createdBy,
			updatedBy: page.updatedBy,
			createdAt: page.createdAt ? page.createdAt.toISOString() : null,
			updatedAt: page.updatedAt ? page.updatedAt.toISOString() : null,
			canEdit: this.canWrite(req, page)
		}
	}

	async upsertPage(req, id, content, kwargs) {
		const page = await this.getPage(req, id)
		if (!this.canWrite(req, page)) throw Msa.FORBIDDEN
		page.content = content
		page.updatedBy = this.getUserName(req, kwargs && kwargs.by)
		page.updatedAt = new Date(Date.now())
		if (!page.createdById) {
			page.createdById = this.getUserId(req)
			page.createdBy = page.updatedBy
			page.createdAt = page.updatedAt
		}
		await db.collection("msa_pages").updateOne({ _id:id }, { $set: page.formatForDb() }, { upsert: true })
	}
}

/*
// register page sheets
msaSheet.registerType("page", {
	perms: {
		create: { group: "admin" }
	},
	content: {
		tag: "msa-sheet-boxes",
		content: {
			tag: "msa-sheet-text"
		}
	}
})
*/

// export

module.exports = {
	startMsaModule: () => new MsaPageModule(),
	MsaPageModule
}
