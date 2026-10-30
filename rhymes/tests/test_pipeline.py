"""Fast checks that don't need Blender: python -m unittest discover -s tests (run from the rhymes folder)."""

import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from rhyme_agent import audio, choreo, lipsync  # noqa: E402


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.song = os.path.join(cls.tmp, "song.wav")
        subprocess.run([sys.executable, "-I", os.path.join(HERE, "make_test_song.py"), cls.song], check=True)
        cls.samples, cls.sr = audio.decode(cls.song)

    def test_tempo_is_found(self):
        t = audio.estimate_tempo(self.samples, self.sr)
        self.assertAlmostEqual(t.bpm, 112, delta=112 * 0.03)
        self.assertLess(t.beat_offset, t.beat_len)

    def test_sections_cover_the_song(self):
        t = audio.estimate_tempo(self.samples, self.sr)
        secs = audio.split_sections(self.samples, self.sr, t, bars=2)
        self.assertGreaterEqual(len(secs), 2)
        self.assertAlmostEqual(secs[-1].end, self.samples.size / self.sr, places=3)
        for a, b in zip(secs, secs[1:]):
            self.assertEqual(a.end, b.start)

    def test_loudness_cues_open_and_close(self):
        fps = 24
        n = 12 * fps
        cues = lipsync.loudness_cues(self.samples, self.sr, fps, n)
        values = {c.value for c in cues}
        self.assertIn("X", values)
        self.assertTrue(values & set("BCDEF"))
        frames = lipsync.cues_per_frame(cues, fps, n)
        self.assertEqual(len(frames), n)
        self.assertEqual(frames[int(7.3 * fps)], "X")  # the fourth bar of the test song is a rest

    def test_plan_matches_energy(self):
        t = audio.Tempo(bpm=120, beat_offset=0.0, confidence=1.0)
        secs = [audio.Section(0, 8, "low", 0.1), audio.Section(8, 16, "high", 0.9)]
        clips = [choreo.DanceClip("dance_a", 2, "low"), choreo.DanceClip("dance_b", 2, "high")]
        plan = choreo.make_plan(16, 24, t, secs, clips)
        self.assertEqual([d.clip for d in plan.dance], ["dance_a", "dance_b"])
        self.assertEqual(len(plan.shots), 2)
        self.assertIn("dance", plan.to_dict())


if __name__ == "__main__":
    unittest.main()
