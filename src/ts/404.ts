import '../styles/404.scss'

enum SearchResultT {
    does_not_exist,
    exists,
    renamed
}
type SearchResult = {
    type: SearchResultT,
    rename?: string
}

let repoCache: {[key: string]: SearchResult} = {}
async function doesProjectExist(name: string): Promise<SearchResult> {
    if (repoCache[name]) return repoCache[name]
    const resp = await fetch(`https://api.github.com/repos/penguinencounter/${name}`)
    let result: SearchResultT = resp.status === 200 ? SearchResultT.exists : SearchResultT.does_not_exist
    let renamed_to: string | undefined
    if (result == SearchResultT.exists) {
        const resp_data = await resp.json();
        const repo_parts: string[] = resp_data.full_name.split('/').filter((x: string) => x != '')
        const reponame = repo_parts.slice(1).join('/')
        if (name != reponame) {
            result = SearchResultT.renamed
            renamed_to = reponame
        }
    }
    repoCache[name] = {
        type: result,
        rename: renamed_to
    }
    sessionStorage.setItem('repoExistsCache', JSON.stringify(repoCache))
    return repoCache[name]
}


window.addEventListener('load', async () => {
    repoCache = JSON.parse(sessionStorage.getItem('repoExistsCache')!) || {}
    const path = window.location.pathname.split('/').filter(x => x != '')
    if (path.length != 1) {
        document.querySelectorAll('.not-sure').forEach(x => x.classList.add('hidden'))
        document.querySelectorAll('.repo-not-exists').forEach(x => x.classList.remove('hidden'))
        return;
    }
    const repoExists = await doesProjectExist(path[0])
    document.querySelectorAll('.not-sure').forEach(x => x.classList.add('hidden'))
    if (repoExists.type == SearchResultT.exists) {
        document.querySelectorAll('.repo-exists').forEach(x => x.classList.remove('hidden'))
        ;(document.querySelectorAll('a.linktarget') as NodeListOf<HTMLAnchorElement>).forEach(x => x.href = `https://github.com/penguinencounter/${path[0]}`)
    } else if (repoExists.type == SearchResultT.renamed) {
        document.querySelectorAll('.repo-renamed').forEach(x => x.classList.remove('hidden'))
        ;(document.querySelectorAll('a.linktarget') as NodeListOf<HTMLAnchorElement>).forEach(x => x.href = `/${repoExists.rename}`)
        document.querySelectorAll('a.linkvalue').forEach(x => x.innerHTML = `${repoExists.rename}`)
    } else {
        document.querySelectorAll('.repo-not-exists').forEach(x => x.classList.remove('hidden'))
    }

    document.querySelectorAll('.clear-caches').forEach(element => element.addEventListener('click', ev => {
        sessionStorage.removeItem('repoExistsCache')
        document.location.reload()
    }));
})
