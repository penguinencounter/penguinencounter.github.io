// THIS IS A WORKER SCRIPT :D
// globals are actually WorkerGlobalScope / WindowOrWorkerGlobalScope
// Remember, the only way out of here is postMessage(), and the only way in is onmessage()
// (well, there's also FetchEvent but who would use that for communication?)

const VERSION_W: VersionSpec = {
    major: 0,
    patch: 3
}

type MessagePacket = {
    action: string,
    data: any,
}

/**
 * Rules for postMessage():
 * - no Functions
 * - no DOM elements (maybe use an object as a proxy, have the main script parse the effects?)
 * - RegExps will be rewound (lastIndex set to 0)
 * - Everything is read/write
 * - Prototypes are not transferred
 * - If you need to send an ArrayBuffer or other low-level data, transfer it
 *     - warning! the data will be unusable in the source context after transfer!
 */
onmessage = function(e) {
    try {
        console.log(`Message received from host script: ${JSON.stringify(e.data)}`)
    } catch (err) {
        console.log(`Message received from host script: (JSONify failed) ${e.data}`)
    }
    const packet = e.data as MessagePacket
    switch (packet.action) {
        case "version":
            self.postMessage({
                action: "version",
                data: VERSION_W,
            })
            break
        default:
            console.warn("Unknown message type! ", packet)
            break
    }
}

console.info("Worker started. oh yeah self is")
console.info(self)
