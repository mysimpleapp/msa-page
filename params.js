const { ParamDict } = Msa.require("params")
const { PagePerm } = require("./perm")

class PageParamDict extends ParamDict {
    constructor() {
        super()
        this.perm = PagePerm.newParam()
    }
}

module.exports = { PageParamDict }
