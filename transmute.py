import os
import sys
from strictyaml import load as loadyaml
import shutil
from glob import glob
from tempfile import TemporaryDirectory
import contextlib
from typing import Literal, NamedTuple, NoReturn, TypeAlias
import logging
from rich.logging import RichHandler
from hashlib import sha256
import importlib
import importlib.util

logging.basicConfig(level=logging.DEBUG, format="%(name)s: %(message)s", handlers=[RichHandler()])
log = logging.getLogger("core")

def stop(reason: str) -> NoReturn:
    log.fatal(f"{reason}")
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


class PluginPipelineInfo(NamedTuple):
    target: str

    @classmethod
    def load(cls, template: dict):
        return cls("file")


class AboutPlugin(NamedTuple):
    name: str
    provides: set[str]
    use: list[str]
    path: str
    pipeline: PluginPipelineInfo

    @classmethod
    def load(cls, name: str, template: dict):
        log.debug("Constructing plugin data for %s", name)
        provides = template.get("provides", [])
        provide_lst: set[str] = set()
        if isinstance(provides, str):
            provide_lst.add(provides)
        elif isinstance(provides, list):
            provide_lst.update(provides)
        else:
            stop(
                f"While loading plugin {name} info: 'provides' is not list or string or nothing (actually {provides=})"
            )
        provide_lst.add(name)
        use = template.get("use", [])
        if not isinstance(use, list):
            stop(
                f"While loading plugin {name} info: 'use' is not list or nothing (actually {use=})"
            )
        path = template.get("path")
        if path is None:
            stop(f"While loading plugin {name} info: no source path")

        pipeline_data = template.get("pipeline")
        if pipeline_data is None:
            stop(f"While loading plugin {name} info: no pipeline info")
        elif not isinstance(pipeline_data, dict):
            stop(
                f"While loading plugin {name} info: 'pipeline' is not table (actually {pipeline_data=})"
            )
        return cls(
            name=name,
            provides=provide_lst,
            use=use,
            path=path,
            pipeline=PluginPipelineInfo.load(pipeline_data),
        )


def load_plugin(about_plugin: AboutPlugin):
    hashn = sha256(about_plugin.name.encode()).hexdigest()
    full_name = f"_transmute_generated.plugins.{hashn}"
    importspec = importlib.util.spec_from_file_location(full_name, about_plugin.path)
    if importspec is None:
        log.error("Cannot load a plugin from %s", about_plugin.path)


def check_consistency(plugin_list: list[AboutPlugin]):
    available_names: set[str] = set()
    requested_names: set[str] = set()
    for plugin in plugin_list:
        available_names.update(plugin.provides)
        requested_names.update(plugin.use)
    missing = requested_names - available_names
    if len(missing) > 0:
        stop(f"Plugin consistency error: no plugin can meet requirements: {missing}")
    else:
        log.info(
            f"Plugin consistency check passed. {len(available_names)} slots provided, "
            f"{len(requested_names)} slots requested."
        )
    return available_names


def main():
    conf_path = os.environ.get("TRANSMUTE_CONF", "transmute.yaml")
    if not os.path.exists(conf_path):
        stop(
            f"No configuration file found at {conf_path}. Set TRANSMUTE_CONF or create transmute.toml in the working directory."
        )
    with open(conf_path) as f:
        raw_conf = f.read()
    conf = loadyaml(raw_conf).data
    if not isinstance(conf, dict):
        stop(f"Invalid type: configuration should be a dict, is actually {type(conf)}")

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
        stop(
            f"Cannot find Python interpreter. Guessed {engine if engine else '(failed to retrieve)'}. Set PYTHON_EXE to the path of a Python interpreter."
        )

    raw_plugins = conf.get("plugins", {})
    if not isinstance(raw_plugins, dict):
        stop(f"Invalid type: 'plugins' should be a dict")
    plugins = [AboutPlugin.load(k, v) for k, v in raw_plugins.items()]
    available_slots = check_consistency(plugins)
    log.info("%d plugins ready", len(raw_plugins))

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
                ...


if __name__ == "__main__":
    main()
