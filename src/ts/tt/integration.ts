
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

type VersionSpec = {
    major: number,
    patch: number,
}
const VERSION_I: VersionSpec = {
    major: 0,
    patch: 3,
}

const NetQueue: MessagePacket[] = []
const wants: { [key: string]: ((target: MessagePacket) => boolean)[] } = {}

async function queueCycler() {
    while (true) {
        while (NetQueue.length > 0) {
            const packet = NetQueue.shift() as MessagePacket
            if (wants[packet.action]) {
                for (let i = 0; i < wants[packet.action].length; i++) {
                    const want = wants[packet.action][i]
                    if (want(packet)) {
                        wants[packet.action].splice(i, 1)
                        break
                    }
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 0))
    }
}

async function query(deliverTo: Worker, action: string, data: any): Promise<MessagePacket> {
    deliverTo.postMessage({
        action: action,
        data: data,
    })
    return await new Promise(
        resolve => {
            wants[action] = wants[action] || []
            wants[action].push(response => {
                resolve(response)
                return true
            })
        }
    )
}


function displayError(message: string) {
    const error = document.createElement("div")
    error.style.backgroundColor = "#ff8888"
    error.style.paddingLeft = "10px"
    error.style.paddingRight = "10px"
    error.style.float = "left"
    error.style.width = "max-content"
    error.style.lineHeight = "38px"
    error.style.fontSize = "18px"
    error.style.color = "#000000"
    error.style.fontFamily = "arial, Helvetica, sans-serif"
    error.textContent = message
    const footer_bar = document.querySelector("#unity-footer")!
    const append_before = footer_bar.querySelector("div#unity-fullscreen-button")!
    footer_bar.insertBefore(error, append_before)
}


async function mainInit(worker: Worker) {
    // ask the worker what version it is
    const workerVersion = (await query(worker, "version", null)).data as VersionSpec
    if (workerVersion.major !== VERSION_I.major) {
        console.error("Major version mismatch! Stopping!")
        displayError("Service wrong version")
        worker.terminate()
        return
    }
    if (workerVersion.patch < VERSION_I.patch) {
        console.warn("Outdated worker build! Stopping!")
        displayError("Service outdatated")
        worker.terminate()
        return
    }
}


if (window.Worker) {
    console.info("Injection worked! Installing the worker now before the webpage catches up...")
    const worker = new Worker("worker.js")
    worker.onmessage = function (e) {
        try {
            console.log(`Message received from worker script: ${JSON.stringify(e.data)}`)
        } catch (err) {
            console.log(`Message received from worker script: (JSONify failed) ${e.data}`)
        }
        const packet = e.data as MessagePacket
        NetQueue.push(packet)
    }
    queueCycler()
    window.addEventListener("DOMContentLoaded", () => mainInit(worker))
} else {
    console.warn("Injection worked, but Web Workers are not supported.")
}
