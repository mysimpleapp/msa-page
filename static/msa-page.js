import { importHtml, importOnCall, ajax, initMsaBox } from "/utils/msa-utils.js"

const editMsaBoxes = importOnCall("/utils/msa-utils-box-edition.js", "editMsaBoxes")
const exportMsaBoxes = importOnCall("/utils/msa-utils-box-edition.js", "exportMsaBoxes")

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
        return "/page"
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
        this.editing = false
        if (this.toFetch()) {
            await this.getPage()
        } else {
            await initMsaBox(this, {
                parent: this,
                boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box`
            })
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
        await this.initMsaBox(template.content)
        this.appendChild(template.content)
        this.setAttribute("editable", page.editable || false)
    }

    async postPage() {
        const content = (await exportMsaBoxes(this.children)).innerHTML
        await ajax("POST", `${this.getBaseUrl()}/${this.getId()}/_page`, {
            body: { content }
        })
    }
}

// register elem
customElements.define("msa-page", HTMLMsaPageElement)
