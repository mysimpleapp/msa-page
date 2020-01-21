const { withDb } = Msa.require("db")
const { userMdw, unauthHtml } = Msa.require("user")
const MsaSheet = Msa.require("sheet/module")

class MsaPageModule extends Msa.Module {

	constructor(){
		super()
		this.initApp()
		this.initSheetMod()
	}

	initApp(){

		this.app.get("/:id", userMdw, async (req, res, next) => {
			withDb(async db => {
				const ctx = newCtx(req, { db })
				const id = this.sheetMod.getId(ctx, req.params.id)
				const sheet = await this.sheetMod.getSheet(ctx, id)
				if(sheet === null) return next(404)
				res.sendPage(this.sheetMod.renderSheetAsHtml(sheet, "/page/_sheet", id))
			}).catch(err => {
				if(err === Msa.FORBIDDEN) res.sendPage(unauthHtml)
				else next(err)
			})
		})
	}

	initSheetMod(){
		this.sheetMod = new class extends MsaSheet {
			getId(ctx, reqId){
				return `page-${reqId}`
			}
		}
		this.app.use("/_sheet", this.sheetMod.app)
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

function newCtx(req, kwargs){
	const ctx = Object.create(req)
	Object.assign(ctx, kwargs)
	return ctx
}

// export

module.exports = new MsaPageModule()
