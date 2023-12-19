import argparse
import glob
import os
import shutil
import copy
from functools import lru_cache
from io import BytesIO
from pathlib import Path, PurePosixPath
from time import sleep
from typing import Tuple

from bs4 import BeautifulSoup, Tag
from PIL import Image, UnidentifiedImageError
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
def sizeof_local(path: str) -> Tuple[int, bytes]:
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = f.read()
            return len(data), data
    else:
        print(f"[sizeof_local] W: skipping missing image at {path}")
        return -1, b""


@lru_cache
def sizeof_remote(url: str) -> Tuple[int, bytes]:
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
        return -1, b""
    cont = response.content
    return len(cont), cont


HTML_IMG_NOCOPY = []
HTML_IMG_NODELETE = ["alt", "class", "id", "width", "height"]


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
            print(f"[ImageProc] W: remote insecure (http:) url may cause mixed content errors")
            size, data = sizeof_remote(routing)
        elif routing.startswith("https://"):
            size, data = sizeof_remote(routing)
        else:
            route_path = PurePosixPath(routing)
            if route_path.is_absolute():
                route_path = root_is / route_path.relative_to("/")
            else:
                route_path = relative_root / route_path
            size, data = sizeof_local(str(route_path))
            print(f"[ImageProc] D: calculating image size by {route_path}: {size}")

        for attr in image.attrs.copy():
            if attr in HTML_IMG_NOCOPY:
                continue
            image[f"data-img-{attr}"] = copy.copy(image[attr])
            if attr not in HTML_IMG_NODELETE:
                del image[attr]

        try:
            # extract more metadata to assist user choices before sending entire file
            bio = BytesIO(data)
            image_data = Image.open(bio)
            image_data.load()
            xsize = f"{image_data.width}x{image_data.height}"
            print(
                f"[ImageProc] I: {routing} is a {xsize} {image_data.format}, {image_data.mode} colors"
            )
            image["data-replacement-type"] = "img"
            image["data-width"] = str(image_data.width)
            image["data-height"] = str(image_data.height)
            image["data-format"] = str(image_data.format)
            request_width = image["width"] if "width" in image.attrs else None
            request_height = image["height"] if "height" in image.attrs else None
            if (isinstance(request_width, str) or request_width is None) and (
                isinstance(request_height, str) or request_height is None
            ):
                if request_width is not None and request_height is not None:
                    image["style"] = (
                        f"--replaced-image-width: {request_width}px; "
                        f"--replaced-image-height: {request_height}px;"
                    )
                elif request_width is not None:
                    fraction = float(request_width) / image_data.width
                    image["style"] = (
                        f"--replaced-image-width: {int(float(request_width))}px; "
                        f"--replaced-image-height: {int(float(image_data.height) * fraction)}px;"
                    )
                elif request_height is not None:
                    fraction = float(request_height) / image_data.height
                    image["style"] = (
                        f"--replaced-image-width: {int(float(image_data.width) * fraction)}px; "
                        f"--replaced-image-height: {int(float(request_height))}px;"
                    )
            bio.close()
        except UnidentifiedImageError:
            print(f"[ImageProc] W: unidentified image at {routing}")

        image.name = "span"
        # HACK: Ewwww, undocumented properties! It works though...
        image.can_be_empty_element = False

        image_classes = image["class"] if "class" in image.attrs else []
        if isinstance(image_classes, str):
            print(f"[ImageProc] W: class: multivalue failure on {image}")
        else:
            image_classes.append("replaced")
            image_classes.append("replaced-image")
            image["class"] = image_classes

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
