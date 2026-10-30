"""Mouth shapes over time.

Preferred engine: Rhubarb Lip Sync (https://github.com/DanielSWolf/rhubarb-lip-sync), which listens to
the vocal and returns the Preston Blair mouth shapes A-H plus X (rest). Characters expose those as shape keys.
Fallback: loudness-driven shapes, so the pipeline still runs when Rhubarb isn't installed.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass

import numpy as np

from . import audio

VISEMES = "ABCDEFGHX"
REST = "X"


@dataclass
class Cue:
    start: float
    end: float
    value: str


def find_rhubarb(explicit: str | None = None) -> str | None:
    for cand in [explicit, os.environ.get("RHUBARB"), shutil.which("rhubarb")]:
        if cand and os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


def rhubarb_cues(audio_path: str, work_dir: str, rhubarb_bin: str, lyrics: str | None = None, recognizer: str = "pocketSphinx") -> list[Cue]:
    """Runs Rhubarb. recognizer: 'pocketSphinx' for English, 'phonetic' for any other language (Hindi, Tamil...)."""
    wav = audio.to_wav(audio_path, os.path.join(work_dir, "vocal16k.wav"))
    cmd = [rhubarb_bin, "-f", "json", "-r", recognizer, "--extendedShapes", "GHX", "-q", wav]
    if lyrics and os.path.isfile(lyrics):
        cmd += ["-d", lyrics]
    out = subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    return [Cue(float(c["start"]), float(c["end"]), str(c["value"])) for c in data["mouthCues"]]


def loudness_cues(samples: np.ndarray, sr: int, fps: float, n_frames: int) -> list[Cue]:
    """Opens the mouth with the loudness of the vocal, changing vowel shape at each new syllable."""
    loud = audio.loudness_per_frame(samples, sr, fps, n_frames)
    vowels = ["D", "C", "E", "F", "D", "B"]
    cues: list[Cue] = []
    vowel_i = 0
    was_quiet = True
    current = REST
    start = 0.0
    for i, l in enumerate(loud):
        if l < 0.12:
            shape = REST
            was_quiet = True
        else:
            if was_quiet or (i % 6 == 0 and l > 0.55):
                vowel_i += 1  # a new syllable or a sustained loud note: pick the next vowel shape
                was_quiet = False
            v = vowels[vowel_i % len(vowels)]
            shape = "B" if l < 0.3 else ("C" if l < 0.5 and v in "DE" else v)
        if shape != current:
            if i:
                cues.append(Cue(start, i / fps, current))
            current, start = shape, i / fps
    cues.append(Cue(start, n_frames / fps, current))
    return cues


def cues_per_frame(cues: list[Cue], fps: float, n_frames: int) -> list[str]:
    """One viseme letter per video frame."""
    frames = [REST] * n_frames
    for c in cues:
        a, b = int(round(c.start * fps)), int(round(c.end * fps))
        for f in range(max(a, 0), min(b, n_frames)):
            frames[f] = c.value if c.value in VISEMES else REST
    return frames


def save_cues(cues: list[Cue], path: str) -> None:
    with open(path, "w") as f:
        json.dump({"mouthCues": [c.__dict__ for c in cues]}, f, indent=1)
