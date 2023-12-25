function canDecrypt() {
    return crypto.subtle && isSecureContext;
}

type EncryptionInfo = {
    salt: Uint8Array,
    init: Uint8Array,
    hash: HashAlgorithmIdentifier,
    tag: Uint8Array,
    iterations: number,
}
function loadEncryptedMetadata(): EncryptionInfo | null {
    const metadata = document.querySelector("meta[name='encryption-info']");
    if (!metadata) {
        return null;
    }
    const asserts = {
        salt: metadata.getAttribute("data-salt"),
        init: metadata.getAttribute("data-init"),
        hash: metadata.getAttribute("data-hash"),
        tag: metadata.getAttribute("data-tag"),
        iterations: metadata.getAttribute("data-iterations"),
    }
    if (Object.values(asserts).some(v => v === null)) {
        return null;
    }
    const enc = new TextEncoder();
    function hex2ui8(hex_str: string): Uint8Array {
        return new Uint8Array([...hex_str.matchAll(/[0-9a-f]{2}/g)].map(v => parseInt(v[0], 16)));
    }
    return {
        salt: enc.encode(window.atob(asserts.salt!!)),
        init: enc.encode(window.atob(asserts.init!!)),
        hash: asserts.hash!! as HashAlgorithmIdentifier,
        tag: hex2ui8(asserts.tag!!),
        iterations: parseInt(asserts.iterations!!),
    }
}

async function attemptDecrypt(passwd: string, about: EncryptionInfo, content: Uint8Array): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const passwdAsKey = await crypto.subtle.importKey("raw", enc.encode(passwd), "PBKDF2", false, ["deriveBits", "deriveKey"]);
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
    return crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: about.init,
            tagLength: 128
        } as AesGcmParams,
        actualKey,
        content
    )
}

declare global {
    interface Window {
        loadEncryptedMetadata: typeof loadEncryptedMetadata,
        attemptDecrypt: typeof attemptDecrypt,
    }
}
window.loadEncryptedMetadata = loadEncryptedMetadata;
window.attemptDecrypt = attemptDecrypt;

export {
    canDecrypt,
    loadEncryptedMetadata,
    attemptDecrypt,
}
