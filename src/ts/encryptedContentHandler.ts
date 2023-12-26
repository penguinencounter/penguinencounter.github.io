function canDecrypt() {
    const par = window.location.search
    const parameters = new URLSearchParams(par)
    return crypto.subtle && isSecureContext && parameters.get("nocrypt") === null
}
function hex2ui8(hex_str: string): Uint8Array {
    return new Uint8Array([...hex_str.matchAll(/[0-9a-f]{2}/g)].map(v => parseInt(v[0], 16)))
}
function str2bytes(str: string): Uint8Array {
    return new Uint8Array([...str].map(v => v.charCodeAt(0)))
}
function bytes2b64(bytes: Uint8Array): string {
    return window.btoa(bytes.reduce((acc, v) => acc + String.fromCharCode(v), ""))
}

const FORM_ADDED_LABEL = "encrypted-content--form-added"
let inuse = false
let UUIDCounter = 0

async function addForms() {
    if (inuse) return
    inuse = true
    const targets = document.querySelectorAll(".encrypted-content:not(." + FORM_ADDED_LABEL + ")")
    const templ = `
<form action="" method="post" class="encryption-form">
    <h2>This content is encrypted</h2>
    <label for="decryption-key-$UUID">Enter key:</label>
    <input type="password" placeholder="passwd" id="decryption-key-$UUID" autocomplete="off" required>
    <button type="submit" disabled>Unlock</button>
    <div class="encryption-form--errormsgbox"></div>
</form>`
    for (const target of targets) {
        target.classList.add(FORM_ADDED_LABEL)
        const uuid = (UUIDCounter++).toString()
        target.innerHTML = templ.replace(/\$UUID/g, uuid) // If the template is malicious, it's already too late.

        // Add the event listener
        const form = target.querySelector("form.encryption-form") as HTMLFormElement
        const passwd = form.querySelector("#decryption-key-" + uuid) as HTMLInputElement
        const button = form.querySelector("button") as HTMLButtonElement
        const msgbox = form.querySelector(".encryption-form--errormsgbox") as HTMLDivElement
        function setMessageBox(msg: string) {
            msgbox.classList.add("--show")
            msgbox.innerHTML = msg
        }if (target.getAttribute("data-encryption-info-by") === null) {
            setMessageBox("This content cannot be decrypted because critical information is missing! (ERR_NO_INFO_REF)")
            continue
        } else if (target.getAttribute("data-content") === null) {
            setMessageBox("This content cannot be decrypted because there is no content to decrypt (not sure how this happened...) (ERR_NO_CONTENT)")
            continue
        } else if (document.getElementById(target.getAttribute("data-encryption-info-by")!!) === null) {
            setMessageBox("This content cannot be decrypted because the encryption information is missing! (ERR_BROKEN_INFO_REF)")
            continue
        }
        // we have all the info we need to decrypt
        const infoElementId = target.getAttribute("data-encryption-info-by")!!
        const infoElement = document.getElementById(infoElementId)!!
        const info = loadEncryptedMetadata(infoElement)
        const content = target.getAttribute("data-content")!!
        if (!info) {
            console.error("No metadata found.")
            setMessageBox("Critical information is missing! (ERR_BROKEN_INFO_REF_LATE)")
            return
        }
        if (!canDecrypt()) {
            const LinkTemplate = `https://gchq.github.io/CyberChef/#recipe=Register('KEY:%20(.*)$',true,true,false)Register('salt:(%5Ba-zA-Z0-9%2B/%3D%5D*)$',true,true,false)Register('iv:(%5Ba-zA-Z0-9%2B/%3D%5D*)$',true,true,false)Register('data:(%5B0-9a-f%5D*)$',true,true,false)Register('tag:(%5Ba-zA-Z0-9%2B/%3D%5D*)$',true,true,false)Find_/_Replace(%7B'option':'Regex','string':'.*'%7D,'',true,false,true,true)Derive_PBKDF2_key(%7B'option':'UTF8','string':'$R0'%7D,256,${info.iterations},'${info.hash.toString().replace(/-/g, '')}',%7B'option':'Base64','string':'$R1'%7D)Register('(%5B%5C%5Cs%5C%5CS%5D*)',true,false,false)Find_/_Replace(%7B'option':'Regex','string':'%5E.*$'%7D,'$R3',true,false,false,false)AES_Decrypt(%7B'option':'Hex','string':'$R5'%7D,%7B'option':'Base64','string':'$R2'%7D,'GCM','Hex','Raw',%7B'option':'Base64','string':'$R4'%7D,%7B'option':'Hex','string':''%7D)&input=`
            const CyberChefTemplate = `Only change the KEY line. You may need to press the blue BAKE button to refresh the output.\nKEY: <type your key here>\n\nsalt:${bytes2b64(info.salt)}\niv:${bytes2b64(info.init)}\ndata:${content}\ntag:${bytes2b64(info.tag)}\n`
            console.log(CyberChefTemplate)
            const urlparam = encodeURIComponent(window.btoa(CyberChefTemplate).replace(/=/g, ""))
            const finalLink = LinkTemplate + urlparam
            setMessageBox(`The website is not being delivered over a secure connection, so the Web Cryptography API is not available. (ERR_NOT_SECURE_CONTEXT)<br>You can, however, decrypt the content using CyberChef, an external tool.<br>`)
            const link = document.createElement("a")
            link.href = finalLink
            link.target = "_blank"
            link.rel = "noopener noreferrer"
            link.innerText = "Decrypt using CyberChef (opens in new tab)"
            msgbox.appendChild(link)
            continue
        }

        // this also implicitly includes the above checks (they 'continue' if they fail)
        const valid = () => passwd.value.length > 0
        form.addEventListener("input", () => {
            // Validate input fields.
            button.disabled = !valid()
        })
        form.addEventListener("submit", async (ev) => {
            ev.preventDefault()
            if (!valid()) return
            const contentBytes = hex2ui8(content)
            let resp
            try {
                resp = await attemptDecrypt(passwd.value, info, contentBytes)
            } catch (e) {
                console.error("Decryption failed.")
                setMessageBox("Decryption failed. Check your password and try again?")
                return
            }
            const dec = new TextDecoder().decode(resp)
            target.classList.add("unlocked")  // prevent using CSS for encrypted content form box
            target.innerHTML = dec
        })
    }
    inuse = false
}

type EncryptionInfo = {
    salt: Uint8Array,
    init: Uint8Array,
    hash: HashAlgorithmIdentifier,
    tag: Uint8Array,
    iterations: number,
}
function loadEncryptedMetadata(source: HTMLElement): EncryptionInfo | null {
    const metadata = source
    if (!metadata) {
        return null
    }
    const asserts = {
        salt: metadata.getAttribute("data-salt"),
        init: metadata.getAttribute("data-init"),
        hash: metadata.getAttribute("data-hash"),
        tag: metadata.getAttribute("data-tag"),
        iterations: metadata.getAttribute("data-iterations"),
    }
    if (Object.values(asserts).some(v => v === null)) {
        return null
    }
    return {
        salt: str2bytes(window.atob(asserts.salt!!)),
        init: str2bytes(window.atob(asserts.init!!)),
        hash: asserts.hash!! as HashAlgorithmIdentifier,
        tag: hex2ui8(asserts.tag!!),
        iterations: parseInt(asserts.iterations!!),
    }
}

async function attemptDecrypt(passwd: string, about: EncryptionInfo, content: Uint8Array): Promise<ArrayBuffer> {
    const enc = new TextEncoder()
    const passwdAsKey = await crypto.subtle.importKey("raw", enc.encode(passwd), "PBKDF2", false, ["deriveBits", "deriveKey"])
    const actualKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            hash: about.hash,
            salt: about.salt,
            iterations: about.iterations
        } as Pbkdf2Params,
        passwdAsKey,
        {
            name: "AES-GCM",
            length: 256
        } as AesDerivedKeyParams,
        false,
        ["encrypt", "decrypt"]
    )
    console.debug(`Attaching ${about.tag.length}-byte tag to content.`)
    const mergedContent = new Uint8Array([...content, ...about.tag])
    console.log(
        `About to decrypt. Here are the parameters: `
        + `with ${about.hash}, ${about.salt.length}B salt, ${about.iterations} iter, ${about.init.length}B IV, ${about.tag.length}B tag. `
        + `${content.length}B content (original). ${mergedContent.length}B content (with tag).`
    )
    return crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: about.init,
            tagLength: 128
        } as AesGcmParams,
        actualKey,
        mergedContent
    )
}

declare global {
    interface Window {
        loadEncryptedMetadata: typeof loadEncryptedMetadata,
        attemptDecrypt: typeof attemptDecrypt,
        hex2ui8: typeof hex2ui8,
    }
}
window.loadEncryptedMetadata = loadEncryptedMetadata
window.attemptDecrypt = attemptDecrypt
window.hex2ui8 = hex2ui8

window.addEventListener("DOMContentLoaded", addForms)

export {
    hex2ui8,
    canDecrypt,
    loadEncryptedMetadata,
    attemptDecrypt,
}
