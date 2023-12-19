// Handles content replacement and data management.

; (function () {
    const autoloadSize = 100000  // automatically load content less than 100 kb
    function assert(yes: boolean, message?: string) {
        if (!yes) {
            if (message)
                throw Error(`Assertion failed: ${message}`)
            else
                throw Error(`Assertion failed.`)
        }
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

    const observeOptions: MutationObserverInit = {
        childList: true,
        subtree: true
    } as const

    function processMedia() {
        document.querySelectorAll(".replaced").forEach(e => {
            if (e instanceof HTMLElement) {
                assert('contentSize' in e.dataset)
                if (parseInt(e.dataset.contentSize!) > autoloadSize) {
                    return
                }
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
