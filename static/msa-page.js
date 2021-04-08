import { importHtml, importOnCall, ajax, exposeMsaBoxCtx } from "/msa/utils/msa-utils.js"

const srcMsaBoxEdition = "/msa/utils/msa-utils-box-edition.js"
const editMsaBoxes = importOnCall(srcMsaBoxEdition, "editMsaBoxes")
const exportMsaBoxes = importOnCall(srcMsaBoxEdition, "exportMsaBoxes")

importHtml(`<style>
	msa-page {
        margin: .5em;
        display: flex;
        flex-direction: column;
		flex: 1;
    }
</style>`)

export class HTMLMsaPageElement extends HTMLElement {

    getBaseUrl() {
        return "/msa/page"
    }
    getId() {
        return this.getAttribute("page-id")
    }
    isEditable() {
        return (this.getAttribute("editable") === "true")
    }
    toFetch() {
        return (this.getAttribute("fetch") !== "false")
    }

    async connectedCallback() {

        exposeMsaBoxCtx(this, {
            parent: this,
            boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box`
        })

        this.editing = false
        if (this.toFetch()) {
            await this.getPage()
        }

        if(this.isEditable()) {
            await editMsaBoxes(this, {
                boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box`
            })
            this.addEventListener("msa-box-inserted", () => this.postPage())
            this.addEventListener("msa-box-edited", () => this.postPage())
        }
    }

    async getPage() {
        const page = await ajax("GET", `${this.getBaseUrl()}/${this.getId()}/_page`)
        const template = document.createElement("template")
        template.innerHTML = page.content || ""
        this.appendChild(template.content)
        this.setAttribute("editable", page.editable || false)
    }

    async postPage() {
        const exported = await exportMsaBoxes(this.children)
        await ajax("POST", `${this.getBaseUrl()}/${this.getId()}/_page`, {
            body: {
                head: exported.head.innerHTML,
                body: exported.body.innerHTML
            }
        })
    }
}

// register elem
customElements.define("msa-page", HTMLMsaPageElement)
