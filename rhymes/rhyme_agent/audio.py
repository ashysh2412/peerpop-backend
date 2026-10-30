"""Audio analysis with only ffmpeg and numpy: loudness per frame, tempo, beat grid and sections."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass

import numpy as np

SR = 16000


def decode(path: str, sr: int = SR) -> tuple[np.ndarray, int]:
    """Decodes any audio or video file to mono float32 samples with ffmpeg."""
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    pcm = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy(), sr


def duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


def to_wav(src: str, dst: str, sr: int = SR) -> str:
    """Rhubarb only reads WAV/OGG, so everything is converted to 16 kHz mono WAV first."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", str(sr), dst], check=True)
    return dst


def loudness_per_frame(samples: np.ndarray, sr: int, fps: float, n_frames: int) -> np.ndarray:
    """RMS loudness for each video frame, normalised so 1.0 is a loud sung note."""
    hop = sr / fps
    out = np.zeros(n_frames, dtype=np.float32)
    for i in range(n_frames):
        a, b = int(i * hop), int((i + 1) * hop)
        chunk = samples[a:b]
        if chunk.size:
            out[i] = float(np.sqrt(np.mean(chunk * chunk)))
    ref = np.percentile(out, 95) if out.size else 0.0
    return out / ref if ref > 0 else out


def onset_envelope(samples: np.ndarray, sr: int, hop: int = 256) -> np.ndarray:
    """Spectral-flux onset strength: how much new energy appears in each hop."""
    win = hop * 4
    n = max(1, (samples.size - win) // hop)
    window = np.hanning(win).astype(np.float32)
    prev = None
    out = np.zeros(n, dtype=np.float32)
    for i in range(n):
        frame = samples[i * hop : i * hop + win] * window
        mag = np.abs(np.fft.rfft(frame))
        mag = np.log1p(mag * 10)
        if prev is not None:
            out[i] = np.maximum(mag - prev, 0).sum()
        prev = mag
    if out.max() > 0:
        out /= out.max()
    return out


@dataclass
class Tempo:
    bpm: float
    beat_offset: float  # seconds until the first beat
    confidence: float

    @property
    def beat_len(self) -> float:
        return 60.0 / self.bpm


def estimate_tempo(samples: np.ndarray, sr: int, lo: float = 70.0, hi: float = 170.0) -> Tempo:
    """Autocorrelation of the onset envelope, preferring tempos typical of children's songs."""
    hop = 256
    env = onset_envelope(samples, sr, hop)
    if env.size < 16:
        return Tempo(bpm=120.0, beat_offset=0.0, confidence=0.0)
    env = env - env.mean()
    ac = np.correlate(env, env, mode="full")[env.size - 1 :]
    ac /= ac[0] if ac[0] else 1.0
    per_sec = sr / hop
    best_bpm, best_score = 120.0, -1.0
    for lag in range(int(per_sec * 60 / hi), int(per_sec * 60 / lo) + 1):
        bpm = 60.0 * per_sec / lag
        # Mild preference for 90-140 bpm so a song isn't picked up at half or double speed.
        weight = 1.0 - 0.3 * abs(np.log2(bpm / 115.0))
        score = float(ac[lag]) * weight
        if score > best_score:
            best_bpm, best_score = bpm, score
    beat_hops = per_sec * 60 / best_bpm
    # Phase: the offset within one beat where onsets line up best.
    best_off, best_sum = 0, -1.0
    for off in range(int(beat_hops)):
        idx = np.arange(off, env.size, beat_hops).astype(int)
        s = float(env[idx].sum())
        if s > best_sum:
            best_off, best_sum = off, s
    return Tempo(bpm=round(best_bpm, 1), beat_offset=best_off / per_sec, confidence=max(0.0, min(1.0, best_score)))


@dataclass
class Section:
    start: float
    end: float
    energy: str  # "low" | "mid" | "high"
    level: float


def split_sections(samples: np.ndarray, sr: int, tempo: Tempo, bars: int = 4, beats_per_bar: int = 4) -> list[Section]:
    """Cuts the song into blocks of a few bars and labels each by how loud it is."""
    total = samples.size / sr
    block = tempo.beat_len * beats_per_bar * bars
    starts = [tempo.beat_offset % tempo.beat_len]
    while starts[-1] + block < total:
        starts.append(starts[-1] + block)
    levels = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else total
        chunk = samples[int(s * sr) : int(e * sr)]
        levels.append(float(np.sqrt(np.mean(chunk * chunk))) if chunk.size else 0.0)
    lo, hi = (np.percentile(levels, 33), np.percentile(levels, 66)) if levels else (0, 0)
    out = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else total
        lvl = levels[i]
        energy = "low" if lvl <= lo else "high" if lvl > hi else "mid"
        out.append(Section(start=s, end=e, energy=energy, level=lvl))
    # A trailing block shorter than a bar joins the previous one.
    if len(out) > 1 and out[-1].end - out[-1].start < tempo.beat_len * beats_per_bar:
        out[-2].end = out[-1].end
        out.pop()
    return out
