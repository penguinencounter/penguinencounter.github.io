
let TTJSIntegration = {
//  ^?
    okay: true,
}

interface Window {
    TTJSIntegration: typeof TTJSIntegration;
}
window.TTJSIntegration = TTJSIntegration;

console.info("Injection worked!!!!")
