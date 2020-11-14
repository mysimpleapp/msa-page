const { PageParamDict } = require("./params")

const exp = module.exports = {}

const FIELDS = [ "content", "createdById", "createdBy", "updatedBy", "createdAt", "updatedAt", "params" ]

exp.Page = class {

    constructor(id) {
        this.id = id
        this.params = new PageParamDict()
    }

    formatForDb() {
        const res = {}
        res._id = this.id
        FIELDS.forEach(f => res[f] = this[f])
        res.params = res.params.getAsDbVal()
        return res
    }

    parseFromDb(dbPage) {
        FIELDS.forEach(f => this[f] = dbPage[f])
        this.params = PageParamDict.newFromDbVal(dbPage.params)
    }

    static newFromDb(id, dbPage) {
        const page = new this(id)
        if (dbPage) page.parseFromDb(dbPage)
        return page
    }
}