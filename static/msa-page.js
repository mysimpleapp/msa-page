import { importHtml, importOnCall, ajax, createMsaBox, initMsaBox, exportMsaBox, editMsaBox, forEachDeepMsaBox } from "/utils/msa-utils.js"

const popupSrc = "/utils/msa-utils-popup.js"
const addPopup = importOnCall(popupSrc, "addPopup")

importHtml(`<style>
	msa-page {
        margin: .5em;
        display: flex;
        flex-direction: column;
		flex: 1;
    }
    msa-page .msa-page-box:hover, 
    msa-page .msa-page-box.msa-page-editing {
        box-shadow: 2px 2px 10px grey;
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
        return (this.getAttribute("editable") == "true")
    }
    toFetch() {
        return (this.getAttribute("fetch") !== "false")
    }

    async connectedCallback() {
        this.editing = false
        if (this.toFetch())
            await this.getPage()
        // dynamically import msa-page-menu
        //if (this.isEditable())
        //    importHtml({ wel: '/page/msa-page-menu.js' }, this)
        this.initAddButtons()
    }

    initAddButtons() {
        const addBut = this.createAddButton()
        this.appendChild(addBut)
    }

    createAddButton() {
        const addBut = document.createElement("button")
        addBut.classList.add("msa-page-editor")
        addBut.textContent = "Add"
        addBut.onclick = async () => {
            await import("/utils/msa-utils-boxes-menu.js")
            const popup = await addPopup(this, document.createElement("msa-utils-boxes-menu"))
            popup.content.onSelect = async tag => {
                popup.remove()
                const box = await createMsaBox(tag, this)
                await this.initMsaBox(box)
                this.insertBefore(box, addBut)
                this.postPage()
            }
        }
        return addBut
    }

    async initMsaBox(el) {
        await initMsaBox(el, { boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box` })
        await forEachDeepMsaBox(el, box => {
            box.classList.add("msa-page-box")
            box.addEventListener("click", () => this.editMsaBox(box))
            box.addEventListener("blur", () => this.stopEditMsaBox(box))
        })
    }

    async editMsaBox(box) {
        if (box === this.editingBox) return
        if (this.editingBox) this.stopEditMsaBox(this.editingBox)
        this.editingBox = box
        box.msaPageContentBeforeEdition = (await exportMsaBox(box)).outerHTML
        box.classList.add("msa-page-editing")
        editMsaBox(box, true)
    }

    async stopEditMsaBox(box) {
        if (box !== this.editingBox) return
        delete this.editingBox
        box.classList.remove("msa-page-editing")
        await editMsaBox(box, false)
        const content = (await exportMsaBox(box)).outerHTML
        if (content != box.msaPageContentBeforeEdition)
            this.postPage()
        delete box.msaPageContentBeforeEdition
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
        const tmpl = await exportMsaBox(this.children)
        for (let ed of tmpl.content.querySelectorAll(".msa-page-editor"))
            ed.remove()
        for (let box of tmpl.content.querySelectorAll(".msa-page-box"))
            box.classList.remove("msa-page-box")
        await ajax("POST", `${this.getBaseUrl()}/${this.getId()}/_page`, {
            body: { content: tmpl.innerHTML }
        })
    }
}

// register elem
customElements.define("msa-page", HTMLMsaPageElement)


// register editable element
export class HTMLMsaPageTextElement extends HTMLElement {
    initContent() {
        for (let c of this.children)
            if (c.classList.contains("content"))
                return c
        const res = document.createElement("div")
        res.classList.add("content")
        res.style.flex = 1
        this.appendChild(res)
        return res
    }
}
customElements.define("msa-page-text", HTMLMsaPageTextElement)

export class HTMLMsaPageBoxesElement extends HTMLElement { }
customElements.define("msa-page-boxes", HTMLMsaPageBoxesElement)