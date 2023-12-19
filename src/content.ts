// Handles content replacement and data management.

; (function () {
    const autoloadSize = 100000  // automatically load content less than 100 kb

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
        const dataTarget = document.createElement("img")
        for (const key of templateElement.attributes) {
            if (!key.name.startsWith("data-img-")) continue
            const trueName = key.name.replace(/^data-img-/g, "")
            dataTarget.setAttribute(trueName, key.value)
        }
        templateElement.replaceWith(dataTarget)
    }

    function statImage(source: HTMLElement, templateElement: HTMLElement) {
        const size = document.createElement("div")
        const sizeof = source.dataset.contentSize ? parseInt(source.dataset.contentSize) : 0
        if (sizeof > 0) {
            size.innerText = siBytes(sizeof)
        } else {
            size.innerText = "???B"
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

    function processMedia() {
        document.querySelectorAll(".replaced").forEach(e => {
            if (e instanceof HTMLElement) {
                assert('contentSize' in e.dataset)
                assert('replacementType' in e.dataset)
                if (parseInt(e.dataset.contentSize!) <= autoloadSize) {
                    // load the content now
                    switch (e.dataset.replacementType) {
                        case "img":
                            loadReplacedImage(e)
                            break
                        default:
                            console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                            break
                    }
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
                    e.appendChild(dataContainer)
                    e.classList.add(APPLY_TAG)
                }
            }
        })
    }

    const observeCallback: MutationCallback = (mutationList, observer) => {
        processMedia()
    }

    window.addEventListener("load", () => {
        // initial loading pass...
        processMedia()
        // look to the future
        const observer = new MutationObserver(observeCallback)
        observer.observe(document.body, observeOptions)
    })
})()
