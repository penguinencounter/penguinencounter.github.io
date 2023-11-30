import os
import sys
import shutil
import glob
import argparse
from time import sleep
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

matches = [
    "dist",
    "static",
    "LICENSE",
    *glob.glob("*.html"),
]


def do_build(out_to: str):
    global matches
    if os.path.exists(out_to):
        shutil.rmtree(out_to)
    os.makedirs(out_to)

    for copy in matches:
        if os.path.isdir(copy):
            shutil.copytree(copy, os.path.join(out_to, copy))
        else:
            shutil.copy(copy, out_to)


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
