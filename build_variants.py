import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Literal, Callable, NamedTuple

import bs4


class MapProvider:
    def process(
        self, source_path: Path, output_path: Path
    ) -> tuple[Literal[True], Path] | tuple[Literal[False] | Literal[None], Literal[None]]: ...


class DiscardMap(MapProvider):
    def __init__(self, inbound_pattern: str):
        self.inbound = inbound_pattern
        self.inbound_pat = re.compile(self.inbound)

    def process(
        self, source_path: Path, output: Path
    ) -> tuple[Literal[True], Path] | tuple[Literal[False] | Literal[None], Literal[None]]:
        local = source_path.relative_to(os.curdir)
        match = self.inbound_pat.search(str(local))
        if match is None:
            return None, None
        return False, None


class SourceMap(MapProvider):
    REPL_MATCHER = re.compile(r"\$([a-zA-Z0-9_-]*)\$")

    def __init__(self, inbound_pattern: str, outbound_pattern: str = r"$0$"):
        self.inbound = inbound_pattern
        self.inbound_pat = re.compile(self.inbound)
        self.outbound = outbound_pattern

    def process(
        self, source_path: Path, output: Path
    ) -> tuple[Literal[True], Path] | tuple[Literal[None], Literal[None]]:
        local = source_path.relative_to(os.curdir)
        match = self.inbound_pat.search(str(local))
        if match is None:
            return None, None
        bindings = (
            {"0": match.group(0), "": "$"}
            | {str(n + 1): v for n, v in enumerate(match.groups())}
            | match.groupdict()
        )
        result = ""
        at = 0
        for match in SourceMap.REPL_MATCHER.finditer(self.outbound):
            if match is None:
                continue
            result += self.outbound[at : match.start()]
            tag = match.group(1)
            if tag not in bindings:
                raise KeyError(
                    f"failed to parse outbound pattern: no group {tag} in inbound pattern captures"
                )
            result += bindings[tag]
            at = match.end()
        result += self.outbound[at:]
        return True, output / result


SOURCES = [
    DiscardMap(r"^node_modules"),
    DiscardMap(r"^deploy"),
    SourceMap(r"(dist/.*)$", r"$1$"),
    SourceMap(r"(static/.*)$", r"$1$"),
    SourceMap(r"(secret_deploy/.*)$", r"$1$"),
    SourceMap(r"^LICENSE$"),
    SourceMap(r"^src/(.*?\.html)$", "$1$"),
]

CRITICAL = [
    'var_unavailable.html',
    'dist/article.css'
]


def prepare(target: Path):
    copies = 0
    filec = 0
    validates = 0
    for base, dirs, files in os.walk("."):
        pb = Path(base)
        for file in files:
            filec += 1
            for source in SOURCES:
                validates += 1
                state, result = source.process(pb / file, target)
                if state:
                    k: Path = result
                    print(
                        f"\rcopy {str(pb / file)[-30:]} -> {str(k)[-30:]}".ljust(70),
                        end="",
                        flush=True,
                    )
                    os.makedirs(k.parent, exist_ok=True)
                    shutil.copy(pb / file, k)
                    copies += 1
                    print(
                        f"\rdone {str(pb / file)[-30:]} -> {str(k)[-30:]}".ljust(70),
                        end="",
                        flush=True,
                    )
                    break
                elif state is None:
                    continue
                elif not state:
                    break
    print(
        f"\rCopy completed ({copies} items): checked {filec} files / {validates} validations.".ljust(
            100
        ),
        flush=True,
    )


def process_variant_desc(page: bs4.BeautifulSoup, target_name: str) -> bool:
    # <meta name="variants" allow target="nojs">
    if page.select('meta[name="variants"][data-deny-all]'):
        return False
    allowlist = page.select('meta[name="variants"][data-allow][data-target]')
    denylist = page.select('meta[name="variants"][data-deny][data-target]')
    if not (allowlist or denylist):
        return True
    deny = True
    results = set()
    if allowlist:
        deny = False
    for tag in allowlist:
        results.add(tag.attrs["data-target"])
    for tag in denylist:
        if deny:
            results.add(tag.attrs["data-target"])
        else:
            results.discard(tag.attrs["data-target"])
    if deny:
        return target_name not in results
    else:
        return target_name in results


def process_noscript(target: Path, force: bool = False):
    with open(target) as f:
        content = f.read()
        struct = bs4.BeautifulSoup(content, "html.parser")
    if not force and not process_variant_desc(struct, "nojs"):
        return None
    for e in struct.find_all("script"):
        e.decompose()
    for e in struct.find_all(attrs={"data-js-required"}):
        e.decompose()
    return struct


def noscript(target: Path):
    targets = []
    for base, dirs, files in os.walk(target):
        for file in files:
            if file.endswith(".html"):
                targets.append(Path(base) / file)
            elif file.endswith(".js"):
                (Path(base)/file).unlink()
    missing_template = process_noscript(target/'var_unavailable.html', force=True)
    for target in targets:
        struct = process_noscript(target)
        if struct is None:
            struct = missing_template
        with open(target, 'w') as f:
            f.write(struct.decode())


def full(target: Path):
    pass


class BuildScript(NamedTuple):
    name: str
    target: Callable[[Path], None]
    mount: str


if __name__ == "__main__":
    builds = [
        BuildScript('nojs', noscript, 'v/nojs'),
        BuildScript('full', full, '')
    ]
    output = Path('deploy')
    shutil.rmtree(output, ignore_errors=True)
    os.makedirs(output)
    for script in builds:
        name, processor, mount = script.name, script.target, script.mount
        with tempfile.TemporaryDirectory() as td:
            p = Path(td)
            print(f'building {name}')
            prepare(p)
            processor(p)
            module_out = output / mount
            if module_out.exists():
                print(f'[WARNING] clobbering {module_out} - check mount points')
            module_out.mkdir(parents=True, exist_ok=True)
            shutil.copytree(p, module_out, dirs_exist_ok=True)
