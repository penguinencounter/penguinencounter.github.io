// Handles content replacement and data management.

; (function () {
    const autoloadSize = 50000  // automatically load content less than 50 kb

    function loadReplacedImage() {
        
    }

    const observeOptions: MutationObserverInit = {
        childList: true,
        subtree: true
    } as const

    const observeCallback: MutationCallback = (mutationList, observer) => {

    }

    window.addEventListener("load", () => {
        const observer = new MutationObserver(observeCallback)
        observer.observe(document.body, observeOptions)
    })
})()
