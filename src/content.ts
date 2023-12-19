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

    function loadReplacedImage(templateElement: HTMLElement) {
        const dataTarget = document.createElement("img")
        for (const key of templateElement.attributes) {
            if (!key.name.startsWith("data-img-")) continue
            const trueName = key.name.replace(/^data-img-/g, "")
            dataTarget.setAttribute(trueName, key.value)
        }
        templateElement.replaceWith(dataTarget)
    }

    function statImage(templateElement: HTMLElement) {
        
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
                    // display stats
                    switch (e.dataset.replacementType) {
                        case "img":
                            statImage(e)
                            break
                        default:
                            console.warn(`unknown replacement type: ${e.dataset.replacementType}`)
                            break
                    }
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
