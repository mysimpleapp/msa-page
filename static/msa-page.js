import { importHtml, importOnCall, ajax, createMsaBox, initMsaBox, exportMsaBox, editMsaBox, forEachDeepMsaBox } from "/utils/msa-utils.js"

const addPopup = importOnCall("/utils/msa-utils-popup.js", "addPopup")
const setPositionRelativeTo = importOnCall("/utils/msa-utils-position.js", "setPositionRelativeTo")

importHtml(`<style>
	msa-page {
        margin: .5em;
        display: flex;
        flex-direction: column;
		flex: 1;
    }

    msa-page .msa-page-line {
        display: flex;
        flex-direction: row;
    }

    msa-page .msa-page-box:hover, 
    msa-page .msa-page-box.msa-page-editing {
        box-shadow: 2px 2px 10px grey;
    }
    
    msa-page .msa-page-first-add-btn {
        display: block;
        height: 3em;
        background: white;
        background-image: url('/utils/img/add');
        background-size: 1.5em;
        background-repeat: no-repeat;
        background-position: center;
        border: 2px dashed black;
        border-radius: .5em;
        cursor: pointer;
    }
    
    msa-page .msa-page-box-add-btn {
        display: block;
        position: absolute;
        width: 3em;
        height: 3em;
        background: white;
        background-image: url('/utils/img/add');
        background-size: 80%;
        background-repeat: no-repeat;
        background-position: center;
        box-shadow: 1px 1px 5px grey;
        border-radius: 1em;
        cursor: pointer;
    }
    msa-page .msa-page-box-add-btn:hover {
        box-shadow: 1px 1px 5px black;
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
        this.initFirstAddButtons()
    }

    initFirstAddButtons() {
        if(this.querySelectorAll(".msa-page-line").length === 0) {
            const btnEl = document.createElement("div")
            btnEl.classList.add("msa-page-first-add-btn", "msa-page-editor")
            this.initAddButton(btnEl, newBoxEl => {
                insertBefore(this.createLine(newBoxEl), btnEl)
                btnEl.remove()
            })
            this.appendChild(btnEl)
        }
    }

    initAddButton(addBtn, insertBoxFn) {
        addBtn.onclick = async () => {
            await import("/utils/msa-utils-boxes-menu.js")
            const popup = await addPopup(this, document.createElement("msa-utils-boxes-menu"))
            popup.content.onSelect = async tag => {
                popup.remove()
                const box = await createMsaBox(tag, {
                    parent: this,
                    boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box`
                })
                await this.initMsaBox(box)
                insertBoxFn(box)
                this.postPage()
            }
        }
    }

    async initMsaBox(el) {
        await initMsaBox(el, { boxesRoute: `${this.getBaseUrl()}/${this.getId()}/_box` })
        await forEachDeepMsaBox(el, box => {
            box.classList.add("msa-page-box")
            box.addEventListener("click", () => this.editMsaBox(box))
            box.addEventListener("blur", () => this.stopEditMsaBox(box))
            box.addEventListener("mouseenter", () => this.addBoxAddButtons(box))
            box.addEventListener("mouseleave", () => this.rmBoxAddButtons(box))
        })
    }

    addBoxAddButtons(boxEl) {
        const lineEl = boxEl.parentNode
        const addBtn = (posX, posY, onNewBox) => {
            const btnEl = document.createElement("button")
            btnEl.classList.add("msa-page-box-add-btn", "msa-page-editor")
            setPositionRelativeTo(btnEl, boxEl, posX, posY)
            boxEl.appendChild(btnEl)
            this.initAddButton(btnEl, onNewBox)
        }
        addBtn("left", "center", newBoxEl => insertBefore(newBoxEl, boxEl))
        addBtn("right", "center", newBoxEl => insertAfter(newBoxEl, boxEl))
        addBtn("center", "top", newBoxEl => insertBefore(this.createLine(newBoxEl), lineEl))
        addBtn("center", "bottom", newBoxEl => insertAfter(this.createLine(newBoxEl), lineEl))
    }

    rmBoxAddButtons(box) {
        box.querySelectorAll(".msa-page-box-add-btn").forEach(b => b.remove())
    }

    createLine(box) {
        const lineEl = document.createElement("div")
        lineEl.classList.add("msa-page-line")
        lineEl.appendChild(box)
        return lineEl
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

// utils

function insertBefore(newNode, refNode) {
    refNode.parentNode.insertBefore(newNode, refNode)
}

function insertAfter(newNode, refNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling)
}