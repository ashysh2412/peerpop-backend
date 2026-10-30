"""Turns tempo and sections into a dance plan and a camera plan."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from .audio import Section, Tempo


@dataclass
class DanceClip:
    """A rigged action in the character file. Name must start with 'dance_'.

    loop_beats: how many beats one playthrough of the clip should last (it's time-stretched to the song's tempo).
    energy: which kind of section it suits.
    Both can be stored on the action as custom properties ("loop_beats", "energy"); defaults are 4 and "mid".
    """

    name: str
    loop_beats: int = 4
    energy: str = "mid"


@dataclass
class DanceStrip:
    clip: str
    start: float
    end: float


@dataclass
class Shot:
    start: float
    end: float
    kind: str  # "wide" | "medium" | "push" | "close"


@dataclass
class Plan:
    fps: float
    duration: float
    tempo: Tempo
    sections: list[Section]
    dance: list[DanceStrip] = field(default_factory=list)
    shots: list[Shot] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "fps": self.fps,
            "duration": self.duration,
            "tempo": self.tempo.__dict__,
            "sections": [s.__dict__ for s in self.sections],
            "dance": [d.__dict__ for d in self.dance],
            "shots": [s.__dict__ for s in self.shots],
        }


ENERGY_ORDER = {"low": 0, "mid": 1, "high": 2}


def pick_clip(clips: list[DanceClip], energy: str, last: str | None, rng: random.Random) -> DanceClip:
    """A clip matching the section's energy, never the same one twice in a row when there's a choice."""
    same = [c for c in clips if c.energy == energy]
    near = [c for c in clips if abs(ENERGY_ORDER.get(c.energy, 1) - ENERGY_ORDER.get(energy, 1)) <= 1]
    pool = same or near or clips
    fresh = [c for c in pool if c.name != last]
    return rng.choice(fresh or pool)


def make_plan(duration: float, fps: float, tempo: Tempo, sections: list[Section], clips: list[DanceClip], seed: int = 0) -> Plan:
    rng = random.Random(seed)
    plan = Plan(fps=fps, duration=duration, tempo=tempo, sections=sections)
    last = None
    for s in sections:
        clip = pick_clip(clips, s.energy, last, rng) if clips else None
        if clip:
            plan.dance.append(DanceStrip(clip=clip.name, start=s.start, end=s.end))
            last = clip.name
    # Camera: one shot per section, alternating so the video doesn't sit on one framing.
    kinds = ["wide", "medium", "push", "medium", "close", "wide"]
    for i, s in enumerate(sections):
        kind = kinds[i % len(kinds)] if s.energy != "high" else ("wide" if i % 2 else "push")
        plan.shots.append(Shot(start=s.start, end=s.end, kind=kind))
    # The intro before the first beat and the tail after the last section get a wide shot.
    if sections and sections[0].start > tempo.beat_len:
        plan.shots.insert(0, Shot(0.0, sections[0].start, "wide"))
        if plan.dance:
            plan.dance.insert(0, DanceStrip(plan.dance[0].clip, 0.0, sections[0].start))
    return plan
