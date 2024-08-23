from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Literal, NamedTuple, Protocol, cast

import bs4
from bs4 import Tag
from jinja2 import Environment, FileSystemLoader, select_autoescape
from rich import print as rp
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TaskID,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

TEMPLATE_DIR = Path("src")
jinja = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=select_autoescape())


class MapProvider:
    def process(
        self, source_path: Path, output_path: Path
    ) -> tuple[Literal[True], Path] | tuple[Literal[False] | Literal[None], Literal[None]]: ...


class DiscardMap(MapProvider):
    def __init__(self, inbound_pattern: str):
        self.inbound = inbound_pattern
        self.inbound_pat = re.compile(self.inbound)

    def process(
        self, source_path: Path, output_path: Path
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
        self, source_path: Path, output_path: Path
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
        return True, output_path / result


SOURCES = [
    DiscardMap(r"^node_modules"),
    DiscardMap(r"^deploy"),
    SourceMap(r"(dist[/\\].*)$", r"$1$"),
    SourceMap(r"(static[/\\].*)$", r"$1$"),
    SourceMap(r"(secret_deploy[/\\].*)$", r"$1$"),
    SourceMap(r"^LICENSE$"),
    SourceMap(r"^src[/\\](.*?\.html)$", "$1$"),
]


class ProcessingAction:
    KEEP = 0
    DELETE = -1
    REPLACE = -2


class Attachments:
    def __init__(self, build_script: BuildScript, base_path: Path, /):
        self.build_script: BuildScript = build_script
        self.base_path: Path = base_path


class FileAttachments(Attachments):
    def __init__(self, build_script: BuildScript, base_path: Path, /):
        super().__init__(build_script, base_path)
        self.soup: bs4.BeautifulSoup | None = None
        self.soup_modified: bool = False


class FileActionType(Protocol):
    __name__: str
    def __call__(self, path: Path, attachments: FileAttachments, /): ...


class ProjectActionType(Protocol):
    __name__: str
    def __call__(
        self, path: Path, attachments: Attachments, progress: Progress | None = None, task: TaskID | None = None, /
    ): ...


class BuildScript(NamedTuple):
    name: str
    targets: list[
        tuple[str, FileActionType | ProjectActionType]
    ]
    mount: str


def prepare(target: Path, progress: Progress, prog_task: TaskID):
    copies = 0
    filec = 0
    validates = 0

    total = 0
    for base, dirs, files in os.walk(".", followlinks=True):
        total += len(files)
    progress.update(prog_task, total=total)

    for base, dirs, files in os.walk(".", followlinks=True):
        pb = Path(base)
        for file in files:
            filec += 1
            if progress is not None and prog_task is not None:
                progress.advance(prog_task, 1)
            for source in SOURCES:
                validates += 1
                state, result = source.process(pb / file, target)
                if state:
                    k: Path = result
                    os.makedirs(k.parent, exist_ok=True)
                    shutil.copy(pb / file, k)
                    copies += 1
                    break
                elif state is None:
                    continue
                elif not state:
                    break
    rp(rf"[green]Copied [bold]{copies}[/] files to [bold cyan]{target}[/][/]")


def fix_rel_url(path: Path, att: FileAttachments):
    if path.suffix != ".html":
        return
    page = att.soup
    assert page is not None
    build = att.build_script
    if build.mount == "":
        return

    def is_local(a: Tag):
        return "data-link-absolute" not in a.attrs

    modified = False

    for result in filter(is_local, page.select("[href], [src]")):
        result: Tag
        if result.name == "script":
            continue
        if result.name == "link" and "rel" in result.attrs and "stylesheet" in result.attrs["rel"]:
            continue
        if "href" in result.attrs:
            if result.attrs["href"].startswith("/") and not result.attrs["href"].startswith("//"):
                result.attrs["href"] = "/" + build.mount + result.attrs["href"]
                modified = True
        if "src" in result.attrs:
            if result.attrs["src"].startswith("/") and not result.attrs["src"].startswith("//"):
                result.attrs["src"] = "/" + build.mount + result.attrs["src"]
                modified = True
    if modified:
        att.soup_modified = True


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


def noscript_v2(target: Path, attach: FileAttachments):
    if target.suffix == ".js":
        target.unlink()
    if target.suffix != ".html":
        return
    struct = attach.soup
    assert struct is not None
    attach.soup_modified = True
    for e in struct.find_all("script"):
        e.decompose()
    for e in struct.select("[data-js-required]"):
        e.decompose()


def process_noscript(target: Path, force: bool = False):
    with open(target, encoding="utf-8") as f:
        content = f.read()
        struct = bs4.BeautifulSoup(content, "html.parser")
    if not force and not process_variant_desc(struct, "nojs"):
        return None
    for e in struct.find_all("script"):
        e.decompose()
    for e in struct.select("[data-js-required]"):
        e.decompose()
    return struct


def noscript(target: Path, _: Attachments, progr: Progress | None = None, task: TaskID | None = None):
    shutil.rmtree(target / "dist", ignore_errors=True)
    targets = []
    for base, dirs, files in os.walk(target):
        for file in files:
            if file.endswith(".html"):
                targets.append(Path(base) / file)
            elif file.endswith(".js"):
                (Path(base) / file).unlink()
    if progr and task:
        progr.update(task, total=len(targets))
    try:
        missing_template = process_noscript(target / "var_unavailable.html", force=True)
    except FileNotFoundError as e:
        rp('[bold red]stopped at exception: [/]', e)
        if progr:
            progr.stop()
        subprocess.call(['pwsh'], cwd=target)
        raise
    assert missing_template is not None
    for target in targets:
        struct = process_noscript(target)
        if struct is None:
            struct = missing_template
        with open(target, "w", encoding="utf-8") as f:
            f.write(struct.decode())
        if progr and task:
            progr.advance(task, 1)


def pjinja(target: Path, att: Attachments):
    if target.suffix != ".html":
        return
    template_name = str(target.relative_to(att.base_path)).replace("\\", "/")
    result = jinja.get_template(template_name).render()
    with open(target, "w", encoding="utf-8") as f:
        f.write(result)


def full(target: Path):
    pass


if __name__ == "__main__":
    jinja_task = ('file', pjinja)
    builds = [
        BuildScript(
            "nojs", [jinja_task, ("file", noscript_v2), ("file", fix_rel_url), ("project", noscript)], "v/nojs"
        ),
        BuildScript("full", [jinja_task, ("file", fix_rel_url)], ""),
    ]
    output = Path("deploy")
    shutil.rmtree(output, ignore_errors=True)
    os.makedirs(output)
    for script in builds:
        name = script.name
        mount = script.mount
        with tempfile.TemporaryDirectory() as td, Progress(
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            MofNCompleteColumn(),
            TimeElapsedColumn(),
            TimeRemainingColumn(),
            refresh_per_second=20,
        ) as prog:
            copy_task = prog.add_task("[bright_blue]Stage build env[/]", total=None)
            tasks = []
            for action in script.targets:
                tasks.append(
                    prog.add_task(
                        rf"[italic magenta]{action[1].__name__}[/]", total=None, start=False
                    )
                )
            mount_task = prog.add_task("[bright_green]Mount result[/]", total=1, start=False)

            p = Path(td)
            rp(f"Building [bold green]{name}[/]")
            prepare(p, prog, copy_task)

            idx = 0
            queue = script.targets.copy()

            while 1:
                if len(queue) == 0:
                    break
                leader = queue.pop(0)
                this_batch = [leader]
                if leader[0] == "file":
                    while len(queue) > 0:
                        mode, _ = next_item = queue[0]
                        if mode == "file":
                            this_batch.append(queue.pop(0))
                        else:
                            break
                    paths = []
                    for path, dirs, files in p.walk(follow_symlinks=True):
                        paths.extend(map(lambda k: path / k, files))
                    for x in range(idx, idx + len(this_batch)):
                        prog.start_task(tasks[x])
                        prog.update(tasks[x], total=len(paths))
                    for path in paths:
                        attach = FileAttachments(script, p)
                        for i, (_, process) in enumerate(this_batch):
                            process = cast(FileActionType, process)
                            if not (path.exists() and path.is_file()):
                                prog.advance(tasks[idx + i])
                                continue
                            with open(path, "rb") as f:
                                content = f.read()
                            if path.suffix == ".html":
                                attach.soup = bs4.BeautifulSoup(content, "html.parser")
                            process(path, attach)
                            if attach.soup_modified:
                                assert attach.soup
                                with open(path, "w", encoding="utf-8") as f:
                                    f.write(attach.soup.decode())
                            prog.advance(tasks[idx + i])
                else:
                    prog.start_task(tasks[idx])
                    attach = Attachments(script, p)
                    _, process = leader
                    process = cast(ProjectActionType, process)
                    process(p, attach, prog, tasks[idx])
                idx += len(this_batch)

            module_out = output / mount
            if module_out.exists():
                rp(f"\\[WARNING] clobbering {module_out} - check mount points")
            module_out.mkdir(parents=True, exist_ok=True)
            prog.start_task(mount_task)
            shutil.copytree(p, module_out, dirs_exist_ok=True)
            prog.advance(mount_task)
