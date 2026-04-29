import subprocess
import unittest
from unittest.mock import patch

import forge_pagegen


class ForgePagegenGitPublishTests(unittest.TestCase):
    def test_publish_stages_only_recommendations_and_queue_then_pushes(self):
        calls = []

        def fake_run(cmd, **kwargs):
            calls.append((cmd, kwargs))
            if cmd[:3] == ["git", "diff", "--cached"]:
                return subprocess.CompletedProcess(cmd, 1)
            return subprocess.CompletedProcess(cmd, 0, stderr="")

        with patch.object(forge_pagegen.subprocess, "run", side_effect=fake_run):
            forge_pagegen.commit_and_push_generated_pages()

        self.assertEqual(
            calls[0][0],
            ["git", "add", "data/recommendations", "scripts/forge_queue.json"],
        )
        self.assertEqual(
            calls[1][0],
            [
                "git",
                "diff",
                "--cached",
                "--quiet",
                "--",
                "data/recommendations",
                "scripts/forge_queue.json",
            ],
        )
        self.assertEqual(
            calls[2][0],
            [
                "git",
                "commit",
                "-m",
                "Forge: add recommendation pages [auto]",
                "--",
                "data/recommendations",
                "scripts/forge_queue.json",
            ],
        )
        self.assertEqual(calls[3][0], ["git", "push", "origin", "main"])

    def test_publish_skips_silently_when_nothing_is_staged(self):
        calls = []

        def fake_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(cmd, 0, stderr="")

        with patch.object(forge_pagegen.subprocess, "run", side_effect=fake_run):
            forge_pagegen.commit_and_push_generated_pages()

        self.assertEqual(
            calls,
            [
                ["git", "add", "data/recommendations", "scripts/forge_queue.json"],
                [
                    "git",
                    "diff",
                    "--cached",
                    "--quiet",
                    "--",
                    "data/recommendations",
                    "scripts/forge_queue.json",
                ],
            ],
        )

    def test_publish_prints_push_error_without_crashing(self):
        def fake_run(cmd, **kwargs):
            if cmd[:3] == ["git", "diff", "--cached"]:
                return subprocess.CompletedProcess(cmd, 1)
            if cmd == ["git", "push", "origin", "main"]:
                return subprocess.CompletedProcess(cmd, 1, stderr="network failed")
            return subprocess.CompletedProcess(cmd, 0, stderr="")

        with patch.object(forge_pagegen.subprocess, "run", side_effect=fake_run):
            with patch("builtins.print") as mock_print:
                forge_pagegen.commit_and_push_generated_pages()

        self.assertIn("FORGE WARN: git push failed: network failed", mock_print.call_args[0][0])


if __name__ == "__main__":
    unittest.main()
