const msaPage = module.exports = new Msa.Module("page")

// user
const { mdw:userMdw } = Msa.require("user")
// sheet
const msaSheet = Msa.require("sheet")

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

const renderSheetAsHtml = msaSheet.renderSheetAsHtml
msaPage.app.get("/:key", userMdw, (req, res, next) => {
	const pageKey = req.params.key
	msaSheet.getSheet("page", pageKey,
		{ user:req.session.user, ifNotExist:"create", insertInDb:false },
		(err, sheet) => {
			// page not found => blank page
			if(err===404) res.sendPage("")
			else if(err) return next(err)
			else res.sendPage(renderSheetAsHtml(sheet))
			next()
		})
})
