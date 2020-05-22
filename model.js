const { PageParamDict } = require("./params")

const exp = module.exports = {}


exp.Page = class {

    constructor(id) {
        this.id = id
        this.params = new PageParamDict()
    }

    formatForDb(keys) {
        const res = {}
        const _format = (key, format) => {
            if (!keys || keys.indexOf(key) >= 0)
                res[key] = format(this[key])
        }
        const _formatRaw = key =>
            _format(key, val => val)
        const _formatDate = key =>
            _format(key, val => val ? val.toISOString() : null)
        _formatRaw("id")
        _formatRaw("content")
        _formatRaw("createdById")
        _formatRaw("createdBy")
        _formatRaw("updatedBy")
        _formatDate("createdAt")
        _formatDate("updatedAt")
        _format("params", val => val.getAsDbStr())
        return res
    }

    parseFromDb(dbPage) {
        const _parseRaw = key => this[key] = dbPage[key]
        const _parseDate = key => this[key] = dbPage[key] ? new Date(dbPage[key]) : null
        _parseRaw("content")
        _parseRaw("createdById")
        _parseRaw("createdBy")
        _parseRaw("updatedBy")
        _parseDate("createdAt")
        _parseDate("updatedAt")
        this.params = PageParamDict.newFromDbStr(dbPage.params)
    }

    static newFromDb(id, dbPage) {
        const page = new this(id)
        if (dbPage) page.parseFromDb(dbPage)
        page.dbPage = dbPage
        return page
    }
}