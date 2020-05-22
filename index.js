const { Page } = require("./model")
const { PagePerm } = require("./perm")
const { useMsaBoxesRouter } = Msa.require("utils")
const { withDb } = Msa.require("db")
const { userMdw, unauthHtml } = Msa.require("user")
const { MsaSheet, renderSheetAsHtml } = Msa.require("sheet/module")

class MsaPageModule extends Msa.Module {

	constructor() {
		super()
		this.initApp()
		//this.initSheetMod()
	}

	getId(ctx, reqId) {
		return `page-${reqId}`
	}

	getUserId(ctx) {
		const user = ctx.user
		return user ? user.id : ctx.connection.remoteAddress
	}

	getUserName(ctx, reqUserName) {
		const user = ctx.user
		return user ? user.name : reqUserName
	}

	canRead(ctx, page) {
		const perm = page.params.perm.get()
		return perm.check(ctx.user, PagePerm.READ)
	}

	canWrite(ctx, page) {
		const perm = page.params.perm.get()
		return perm.check(ctx.user, PagePerm.WRITE)
	}

	canAdmin(ctx, page) {
		const perm = page.params.perm.get()
		return perm.check(ctx.user, PagePerm.ADMIN)
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
		this.app.get("/:id", (req, res, next) => {
			const id = req.params.id
			if (id.indexOf('-') >= 0 || id[0] === '_')
				return next()
			res.sendPage({
				wel: "/page/msa-page.js",
				attrs: { 'page-id': id }
			})
		})

		this.app.get("/:id/_page", userMdw, (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const id = this.getId(ctx, req.params.id)
				const page = await this.getPage(ctx, id)
				res.json(this.exportPage(ctx, page))
			}).catch(next)
		})

		this.app.post("/:id/_page", userMdw, (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const id = this.getId(ctx, req.params.id)
				const { content, by } = req.body
				await this.upsertPage(ctx, id, content, { by })
				res.sendStatus(Msa.OK)
			}).catch(next)
		})

		// MSA boxes
		useMsaBoxesRouter(this.app, '/:id/_box', req => ({ parentId: "page" }))
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
	async getPage(ctx, id) {
		const dbPage = await ctx.db.getOne("SELECT id, content, createdById, createdBy, updatedBy, createdAt, updatedAt, params FROM msa_pages WHERE id=:id", { id })
		const page = Page.newFromDb(id, dbPage)
		if (!this.canRead(ctx, page)) throw Msa.FORBIDDEN
		return page
	}

	exportPage(ctx, page) {
		return {
			id: page.id,
			content: page.content,
			createdById: page.createdById,
			createdBy: page.createdBy,
			updatedBy: page.updatedBy,
			createdAt: page.createdAt ? page.createdAt.toISOString() : null,
			updatedAt: page.updatedAt ? page.updatedAt.toISOString() : null,
			canEdit: this.canWrite(ctx, page)
		}
	}

	async upsertPage(ctx, id, content, kwargs) {
		const page = await this.getPage(ctx, id)
		if (!this.canWrite(ctx, page)) throw Msa.FORBIDDEN
		page.content = content
		page.updatedBy = this.getUserName(ctx, kwargs && kwargs.by)
		page.updatedAt = new Date(Date.now())
		if (!page.dbPage) {
			page.createdById = this.getUserId(ctx)
			page.createdBy = page.updatedBy
			page.createdAt = page.updatedAt
		}
		if (page.dbPage) {
			await ctx.db.run("UPDATE msa_pages SET content=:content, updatedBy=:updatedBy, updatedAt=:updatedAt WHERE id=:id",
				page.formatForDb(["id", "content", "updatedBy", "updatedAt"]))
		} else {
			await ctx.db.run("INSERT INTO msa_pages (id, content, createdById, createdBy, createdAt, updatedBy, updatedAt) VALUES (:id, :content, :createdById, :createdBy, :createdAt, :updatedBy, :updatedAt)",
				page.formatForDb(["id", "content", "createdById", "createdBy", "createdAt", "updatedBy", "updatedAt"]))
		}
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


// utils

function newCtx(req, kwargs) {
	const ctx = Object.create(req)
	Object.assign(ctx, kwargs)
	return ctx
}

// export

module.exports = {
	installMsaModule: async itf => {
		await require("./install")(itf)
	},
	startMsaModule: () => new MsaPageModule(),
	MsaPageModule
}
