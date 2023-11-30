let repoCache: {[key: string]: {exists: boolean}} = {}
async function doesProjectExist(name: string): Promise<boolean> {
    if (repoCache[name]) return repoCache[name].exists
    const resp = await fetch(`https://api.github.com/repos/penguinencounter/${name}`)
    const result = resp.status === 200
    repoCache[name] = {exists: result}
    sessionStorage.setItem('repoExistsCache', JSON.stringify(repoCache))
    return result
}


window.addEventListener('load', async () => {
    repoCache = JSON.parse(sessionStorage.getItem('repoExistsCache')!) || {}
    const path = window.location.pathname.split('/').filter(x => x != '')
    if (path.length != 1) return // TODO do something specific...
    const repoExists = await doesProjectExist(path[0])
    if (repoExists) {
        document.querySelectorAll('.repo-exists').forEach(x => x.classList.remove('hidden'))
        document.querySelectorAll('.repo-not-exists').forEach(x => x.classList.add('hidden'))
        ;(document.querySelectorAll('a.linktarget') as NodeListOf<HTMLAnchorElement>).forEach(x => x.href = `https://github.com/penguinencounter/${path[0]}`)
    }
})
