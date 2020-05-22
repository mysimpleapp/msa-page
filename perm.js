const { PermNum } = Msa.require("user/perm")
const { isAdmin } = Msa.require("user/utils")

const labels = [
    { name: "None" },
    { name: "Read" },
    { name: "Write" },
    { name: "Admin" }]

class PagePerm extends PermNum {
    getMaxVal() { return 3 }
    getLabels() { return labels }
    getDefaultValue() { return 2 }
    overwriteSolve(user) {
        if (isAdmin(user)) return 3
    }
}
PagePerm.NONE = 0
PagePerm.READ = 1
PagePerm.WRITE = 2
PagePerm.ADMIN = 3

module.exports = { PagePerm }