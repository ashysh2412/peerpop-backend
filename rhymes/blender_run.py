"""Runs the pipeline inside a full Blender install instead of the bpy wheel, which is the way to get GPU rendering
and the denoiser:

    blender -b --python blender_run.py -- make --audio song.mp3 --character chars/bunny.blend --out out/song.mp4 --gpu

Everything after "--" is passed to rhyme_agent exactly like `python -m rhyme_agent`. numpy ships with Blender's Python.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rhyme_agent.cli import main  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
main(argv)
