import argparse
import glob
import os
import shutil
from functools import lru_cache
from pathlib import Path
from time import sleep

from bs4 import BeautifulSoup, Tag
from requests import get
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

matches = [
    "dist",
    "static",
    "LICENSE",
    *glob.glob("*.html"),
]


@lru_cache
def sizeof_local(path: str) -> int:
    if os.path.exists(path):
        with open(path, "rb") as f:
            return len(f.read())
    else:
        print(f"[sizeof_local] W: skipping missing image at {path}")
        return -1


@lru_cache
def sizeof_remote(url: str) -> int:
    print(f"[sizeof_remote] I: {url}")
    response = get(
        url,
        timeout=0.5,
        headers={
            "User-Agent": "GitHubActions: penguinencounter/penguinencounter.github.io - See headers for info.",
            "X-Request-Reason": "building static site: determining media size",
        },
    )
    if response.status_code != 200:
        print(f"[sizeof_remote] W: request failed, status {response.status_code}")
        return -1
    return len(response.content)


def process_HTMLs(path: str, out_path: str):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    soup = BeautifulSoup(content, features="html.parser")
    media_images = soup.find_all("img")
    root_is = Path(".").absolute()
    relative_root = Path(path).parent
    image: Tag
    for image in media_images:
        routing = image["src"]
        if isinstance(routing, list):
            print(f"[ImageProc] W: multiple src on {image}")
            continue
        if routing.startswith("data:"):
            print(f"[ImageProc] I: skipping data url")
            continue
        if routing.startswith("http://"):
            print(
                f"[ImageProc] W: remote insecure (http:) url may cause mixed content errors"
            )
            size = sizeof_remote(routing)
        elif routing.startswith("https://"):
            size = sizeof_remote(routing)
        else:
            route_path = Path(routing)
            if route_path.is_absolute():
                route_path = root_is / route_path.relative_to("/")
            else:
                route_path = relative_root / route_path
            size = sizeof_local(str(route_path))
        image["data-content-size"] = str(size)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(str(soup))


def do_build(out_to: str):
    global matches
    if os.path.exists(out_to):
        shutil.rmtree(out_to)
    os.makedirs(out_to)

    def process(in_file: str, out_file: str):
        print(f". Writing {in_file} -> {out_file}")
        if in_file.endswith(".html"):
            process_HTMLs(in_file, out_file)
        else:
            with open(in_file, "rb") as fI, open(out_file, "wb") as fO:
                fO.write(fI.read())

    for copy in matches:
        if os.path.isdir(copy):
            for cwd, di, fi in os.walk(copy):
                os.makedirs(os.path.join(out_to, cwd))
                for f in fi:
                    process(os.path.join(cwd, f), os.path.join(out_to, cwd, f))
        else:
            process(copy, os.path.join(out_to, os.path.split(copy)[1]))


class FSHandler(FileSystemEventHandler):
    def __init__(self, build_output: str) -> None:
        self.build_output = build_output
        super().__init__()

    def handle(self, event: FileSystemEvent):
        ap = os.path.abspath(event.src_path)
        for matcher in matches:
            m_ap = os.path.abspath(matcher)
            if ap.startswith(m_ap):
                print(f"Re-packaging ({event.src_path} changed)")
                do_build(self.build_output)

    def on_created(self, event):
        super().on_created(event)
        self.handle(event)

    def on_deleted(self, event):
        super().on_deleted(event)
        self.handle(event)

    def on_modified(self, event):
        super().on_modified(event)
        self.handle(event)

    def on_moved(self, event):
        super().on_moved(event)
        self.handle(event)


def main():
    parser = argparse.ArgumentParser(prog="penguinencounter.github.io packaging script")
    parser.add_argument("output", nargs="?", default="deploy")
    parser.add_argument("-w", "--watch", dest="watch", action="store_true")
    args = parser.parse_args()
    do_build(args.output)
    if args.watch:
        print("Initial build completed, watching for changes")
        obs = Observer()
        obs.schedule(FSHandler(args.output), ".", recursive=True)
        obs.start()
        try:
            while True:
                sleep(1)
        finally:
            print("Cleaning up, press ctrl-C to stop now")
            obs.stop()
            obs.join()


if __name__ == "__main__":
    main()
