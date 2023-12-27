
let TTJSIntegration = {
//  ^?
    okay: true,
    load: () => {
        console.info("Things should be loaded at this point, adding DOM elements")
        const footer_bar = document.querySelector("#unity-footer")
    }
}

interface Window {
    TTJSIntegration: typeof TTJSIntegration;
}
window.TTJSIntegration = TTJSIntegration;


if (window.Worker) {
    console.info("Injection worked! Installing the worker now before the webpage catches up...")
    const worker = new Worker("https://penguinencounter.github.io/dist/tt_worker.js")
    setTimeout(() => worker.terminate(), 1000)
} else {
    console.warn("Injection worked, but Web Workers are not supported.")
}
