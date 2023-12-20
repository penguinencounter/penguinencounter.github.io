// Handles content replacement and data management.

; (function () {
    const autoloadSize = 50000  // automatically load content less than 50 kb

    const APPLY_TAG = "content-replacement-stats-applied"
    function assert(yes: boolean, message?: string) {
        if (!yes) {
            if (message)
                throw Error(`Assertion failed: ${message}`)
            else
                throw Error(`Assertion failed.`)
        }
    }

    function siBytes(bytes: number) {
        const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
        let unitIndex = 0
        while (bytes > 1000) {
            bytes /= 1000
            unitIndex++
        }
        return `${bytes.toFixed(2)} ${units[unitIndex]}`
    }

    function loadReplacedImage(templateElement: HTMLElement) {
        // freeze the current size of the element

        const dataTarget = document.createElement("img")
        for (const key of templateElement.attributes) {
            if (!key.name.startsWith("data-img-")) continue
            const trueName = key.name.replace(/^data-img-/g, "")
            dataTarget.setAttribute(trueName, key.value)
        }
        const fin = () => templateElement.replaceWith(dataTarget)
        const callto = templateElement.querySelector(".replaced-info ._c2a")
        if (callto instanceof HTMLElement) {
            callto.innerText = "Loading..."
        }
        if (dataTarget.complete) {
            fin()
        } else {
            dataTarget.addEventListener("load", fin)
            dataTarget.addEventListener("error", fin)
        }
    }

    function statImage(source: HTMLElement, templateElement: HTMLElement) {
        const size = document.createElement("div")
        const sizeof = source.dataset.contentSize ? parseInt(source.dataset.contentSize) : 0
        if (sizeof > 0) {
            size.innerText = `${siBytes(sizeof)} image`
        } else {
            size.innerText = "???B image"
        }
        size.classList.add("_size")
        templateElement.appendChild(size)
        if ("width" in source.dataset && "height" in source.dataset && "format" in source.dataset) {
            const isize = document.createElement("div")
            isize.classList.add("_isize")
            isize.innerText = `${source.dataset.width}x${source.dataset.height} ${source.dataset.format}`
            templateElement.appendChild(isize)
        }
    }

    const observeOptions: MutationObserverInit = {
        childList: true,
        subtree: true
    } as const

    function load(e: HTMLElement) {
        assert('replacementType' in e.dataset)
        switch (e.dataset.replacementType) {
            case "img":
                loadReplacedImage(e)
                break
            default:
                console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                break
        }
    }

    function processMedia() {
        document.querySelectorAll(".replaced").forEach(e => {
            if (e instanceof HTMLElement) {
                assert('contentSize' in e.dataset)
                assert('replacementType' in e.dataset)
                if (parseInt(e.dataset.contentSize!) <= autoloadSize) {
                    // load the content now
                    load(e)
                } else {
                    if (e.classList.contains(APPLY_TAG)) return
                    const dataContainer = document.createElement("div")
                    dataContainer.classList.add("replaced-info")
                    // display stats
                    switch (e.dataset.replacementType) {
                        case "img":
                            statImage(e, dataContainer)
                            break
                        default:
                            console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                            break
                    }

                    const c2a = document.createElement("div")
                    c2a.classList.add("_c2a")
                    c2a.innerText = "Click to load"  // TODO: i18n
                    dataContainer.appendChild(c2a)

                    e.appendChild(dataContainer)
                    e.classList.add(APPLY_TAG)

                    e.addEventListener("click", (ev) => {
                        load(e)
                    })
                }
            }
        })
    }

    const observeCallback: MutationCallback = (mutationList, observer) => {
        processMedia()
    }

    window.addEventListener("DOMContentLoaded", () => {
        // initial loading pass...
        processMedia()
        // look to the future
        const observer = new MutationObserver(observeCallback)
        observer.observe(document.body, observeOptions)
    })
})()
