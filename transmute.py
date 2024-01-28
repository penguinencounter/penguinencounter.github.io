import os
import subprocess
import sys
import tomllib as toml
import shutil
from glob import glob
from tempfile import TemporaryDirectory
import contextlib
from typing import NoReturn
import logging
from rich.logging import RichHandler
from hashlib import sha256

logging.basicConfig(level=logging.DEBUG, format="%(name)s: %(message)s", handlers=[RichHandler()])
log = logging.getLogger("core")

def stop(reason: str) -> NoReturn:
    print(f'Cannot continue: {reason}', file=sys.stderr)
    exit(1)


def collect(targets: list[str]) -> list[str]:
    """
    Collection phase. Find source files and put their paths into a list.
    """
    paths = []
    for target in targets:
        globs = glob(target)
        for target in globs:
            paths.append(target)
    return paths


@contextlib.contextmanager
def prepare_env(sources: list[str]):
    """
    Copy files into a new, temporary directory.
    """
    with TemporaryDirectory() as tmpdir:
        log.debug("Created temporary directory %s from %d sources", tmpdir, len(sources))
        for source in sources:
            if os.path.isdir(source):
                name = os.path.basename(source)
                shutil.copytree(source, os.path.join(tmpdir, name))
            else:
                shutil.copy(source, tmpdir)
        yield tmpdir


def main():
    conf_path = os.environ.get("TRANSMUTE_CONF", "transmute.toml")
    if not os.path.exists(conf_path):
        stop(f"No configuration file found at {conf_path}. Set TRANSMUTE_CONF or create transmute.toml in the working directory.")
    with open(conf_path) as f:
        raw_conf = f.read()
    conf = toml.loads(raw_conf)

    # Collect
    collect_conf = conf.get("collect", {})
    if "rules" not in collect_conf:
        stop("No input rules specified (collect.rules does not exist)")
    rules = collect_conf["rules"]
    if not isinstance(rules, list):
        stop(f"Invalid type: collect.rules should be list, is actually {type(rules)}")
    if len(rules) == 0:
        stop("No input rules specified (collect.rules is empty)")
    sources = collect(rules)
    log.info("%d sources", len(sources))
    
    engine = os.environ.get("PYTHON_EXE", sys.executable)
    if not engine or not os.path.exists(engine):
        stop(f"Cannot find Python interpreter. Guessed {engine if engine else '(failed to retrieve)'}. Set PYTHON_EXE to the path of a Python interpreter.")

    with prepare_env(sources) as presrc:
        # Pre-process
        pre_conf = conf.get("preprocess", {})
        if "use" not in pre_conf:
            log.info("no pre-processing specified, skipping")
        else:
            log.debug("Pre-processing in %s", presrc)
            pre_use = pre_conf["use"]
            if not isinstance(pre_use, list):
                stop(f"Invalid type: preprocess.use should be list, is actually {type(pre_use)}")
            for pre in pre_use:
                pure = os.path.abspath(os.path.expanduser(pre))
                hashname = sha256(pure.encode()).hexdigest()
                log.debug("Using %s (%s...)", pre, hashname[:16])
                


if __name__ == "__main__":
    main()
    exit(1)
