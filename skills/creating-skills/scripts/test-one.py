#!/usr/bin/env python3
"""Test a single trigger query against a skill. Fast iteration tool.

Runs 3 times by default (majority vote). ~15s for a full test.

Usage:
  python3 skills/creating-skills/scripts/test-one.py "Create a wallet" skills/creating-wallets
  python3 skills/creating-skills/scripts/test-one.py "Sign a transaction" skills/creating-wallets --expect false
  python3 skills/creating-skills/scripts/test-one.py "Create a wallet" skills/creating-wallets --runs 1
"""

import json
import os
import select
import subprocess
import sys
import time
import uuid
from pathlib import Path


def find_project_root():
    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / ".claude").is_dir():
            return parent
    return current


def test_trigger(query: str, skill_path: str, timeout: int = 30) -> tuple[bool, float]:
    """Returns (triggered, elapsed_seconds)."""
    # Parse skill
    skill_md = Path(skill_path) / "SKILL.md"
    content = skill_md.read_text()

    # Extract name and description from frontmatter
    lines = content.split("\n")
    in_frontmatter = False
    name = ""
    desc = ""
    for line in lines:
        if line.strip() == "---":
            if in_frontmatter:
                break
            in_frontmatter = True
            continue
        if in_frontmatter:
            if line.startswith("name:"):
                name = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("description:"):
                desc = line.split(":", 1)[1].strip().strip('"')

    project_root = find_project_root()
    unique_id = uuid.uuid4().hex[:8]
    clean_name = f"{name}-skill-{unique_id}"
    cmd_dir = project_root / ".claude" / "commands"
    cmd_dir.mkdir(parents=True, exist_ok=True)
    cmd_file = cmd_dir / f"{clean_name}.md"

    indented_desc = "\n  ".join(desc.split("\n"))
    cmd_file.write_text(
        f"---\ndescription: |\n  {indented_desc}\n---\n\n"
        f"# {name}\n\nThis skill handles: {desc}\n"
    )

    start = time.time()
    try:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        proc = subprocess.Popen(
            ["claude", "-p", query, "--output-format", "stream-json",
             "--verbose", "--include-partial-messages"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            cwd=str(project_root), env=env,
        )

        buffer = ""
        pending_tool = None
        acc_json = ""

        while time.time() - start < timeout:
            if proc.poll() is not None:
                remaining = proc.stdout.read()
                if remaining:
                    buffer += remaining.decode("utf-8", errors="replace")
                break

            ready, _, _ = select.select([proc.stdout], [], [], 1.0)
            if not ready:
                continue

            chunk = os.read(proc.stdout.fileno(), 8192)
            if not chunk:
                break
            buffer += chunk.decode("utf-8", errors="replace")

            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if event.get("type") == "stream_event":
                    se = event.get("event", {})
                    se_type = se.get("type", "")

                    if se_type == "content_block_start":
                        cb = se.get("content_block", {})
                        if cb.get("type") == "tool_use":
                            tool_name = cb.get("name", "")
                            if tool_name in ("Skill", "Read"):
                                pending_tool = tool_name
                                acc_json = ""
                            else:
                                proc.kill()
                                return False, time.time() - start

                    elif se_type == "content_block_delta" and pending_tool:
                        delta = se.get("delta", {})
                        if delta.get("type") == "input_json_delta":
                            acc_json += delta.get("partial_json", "")
                            if clean_name in acc_json:
                                proc.kill()
                                return True, time.time() - start

                    elif se_type in ("content_block_stop", "message_stop"):
                        if pending_tool:
                            triggered = clean_name in acc_json
                            proc.kill()
                            return triggered, time.time() - start
                        if se_type == "message_stop":
                            proc.kill()
                            return False, time.time() - start

        proc.kill()
        return False, time.time() - start
    finally:
        cmd_file.unlink(missing_ok=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: test-one.py <query> <skill-path> [--expect true|false] [--runs N]")
        sys.exit(1)

    query = sys.argv[1]
    skill_path = sys.argv[2]
    expect = None
    runs = 3

    if "--expect" in sys.argv:
        idx = sys.argv.index("--expect")
        if idx + 1 < len(sys.argv):
            expect = sys.argv[idx + 1].lower() == "true"

    if "--runs" in sys.argv:
        idx = sys.argv.index("--runs")
        if idx + 1 < len(sys.argv):
            runs = int(sys.argv[idx + 1])

    trigger_count = 0
    total_elapsed = 0.0

    for i in range(runs):
        triggered, elapsed = test_trigger(query, skill_path)
        total_elapsed += elapsed
        if triggered:
            trigger_count += 1
        mark = "Y" if triggered else "N"
        print(f"  run {i+1}/{runs}: {mark} ({elapsed:.1f}s)")

    rate = trigger_count / runs
    majority = trigger_count > runs / 2

    print(f"  result: {trigger_count}/{runs} triggered ({rate:.0%}, {total_elapsed:.1f}s total)")

    if expect is not None:
        passed = majority == expect
        result = "PASS" if passed else "FAIL"
        print(f"{result}  \"{query}\"")
        sys.exit(0 if passed else 1)
    else:
        status = "TRIGGERED" if majority else "NOT TRIGGERED"
        print(f"{status}  \"{query}\"")
