const msaPage = module.exports = new Msa.Module()

// user
const { mdw:userMdw } = Msa.require("user")
// sheet
const MsaSheet = Msa.require("sheet/module")
const msaSheet = new MsaSheet("page")
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
msaPage.app.get("/:key", userMdw, async (req, res, next) => {
	try {
		const { key } = req.params
		const sheet = await msaSheet.getSheet(req, key)
		if(sheet === null) return next(404)
		res.sendPage(msaSheet.renderSheetAsHtml(sheet, "/page/_sheet", key))
	} catch(err) { next(err) }
})

msaPage.app.use("/_sheet", msaSheet.app)
