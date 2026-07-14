#!/usr/bin/env python3
"""
auto-develop.py — Matt-flow auto-implement loop for obsidian-gtd.

Reads scratch/tickets/, checks git log for completed ones,
runs pi to implement the next uncompleted ticket,
verifies with build + lint, commits on success, retries on failure.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
TICKETS_DIR = PROJECT_DIR / "scratch" / "tickets"
SPEC_FILE = PROJECT_DIR / "scratch" / "SPEC.md"
MAX_RETRIES = 3

VERIFY_COMMANDS = [
    ["npm", "run", "build"],
    ["npm", "run", "lint"],
]

TEST_COMMANDS = [
    ["npm", "test"],
]


def get_completed_tickets() -> set[str]:
    """Return set of completed ticket numbers from git log."""
    result = subprocess.run(
        ["git", "log", "--oneline", "--format=%s"],
        cwd=PROJECT_DIR,
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print("⚠️  git log failed, assuming no tickets completed")
        return set()

    completed: set[str] = set()
    for line in result.stdout.strip().split("\n"):
        m = re.match(r"ticket-(\d{4})", line)
        if m:
            completed.add(m.group(1))
    return completed


def list_all_tickets() -> list[tuple[str, str]]:
    """Return sorted list of (number, name) from ticket files."""
    tickets = []
    for f in sorted(TICKETS_DIR.glob("*.md")):
        m = re.match(r"(\d{4})-(.+)\.md", f.name)
        if m:
            tickets.append((m.group(1), m.group(2)))
    return tickets


def run_verify() -> bool:
    """Run all verification commands. Return True if all pass."""
    for cmd in VERIFY_COMMANDS:
        print(f"  ⚙️  Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ❌  Failed: {' '.join(cmd)}")
            print(result.stdout[-500:] if result.stdout else "")
            print(result.stderr[-500:] if result.stderr else "")
            return False
        print(f"  ✅  Passed: {' '.join(cmd)}")
    return True


def run_tests() -> bool:
    """Run test commands (may not exist yet). Return True if all pass."""
    for cmd in TEST_COMMANDS:
        print(f"  ⚙️  Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ⚠️  Failed: {' '.join(cmd)} (may not be set up yet)")
            return False
        print(f"  ✅  Passed: {' '.join(cmd)}")
    return True


def run_pi(ticket_num: str, ticket_name: str) -> bool:
    """Run pi to implement a ticket. Return True if successful."""
    ticket_file = TICKETS_DIR / f"{ticket_num}-{ticket_name}.md"
    if not ticket_file.exists():
        print(f"  ❌  Ticket file not found: {ticket_file}")
        return False

    prompt = (
        f"Implement ticket {ticket_num}: {ticket_name}\n\n"
        f"Read SPEC.md for project context, then read the ticket file for detailed requirements. "
        f"Implement the changes, then run verification commands to confirm."
    )

    cmd = [
        "pi", "-p", "--no-session",
        str(SPEC_FILE),
        str(ticket_file),
        prompt,
    ]

    print(f"  🤖  Running pi for ticket {ticket_num}...")
    result = subprocess.run(
        cmd,
        cwd=PROJECT_DIR,
        capture_output=True, text=True, timeout=300,
    )

    if result.returncode != 0:
        print(f"  ❌  pi exited with code {result.returncode}")
        print(result.stderr[-1000:] if result.stderr else "")
        return False

    # Check if pi produced meaningful output or just errors
    output = (result.stdout + result.stderr)[-500:].strip()
    print(f"  ℹ️  pi output (last 500 chars):\n{output}")
    return True


def git_commit(ticket_num: str, ticket_name: str) -> bool:
    """Commit changes. Return True if committed."""
    # Check if there's anything to commit
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=PROJECT_DIR, capture_output=True, text=True, timeout=15,
    )
    if not result.stdout.strip():
        print("  ℹ️  No changes to commit")
        return True

    msg = f"ticket-{ticket_num}: {ticket_name.replace('-', ' ')}"
    result = subprocess.run(
        ["git", "commit", "-am", msg],
        cwd=PROJECT_DIR, capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  ❌  git commit failed: {result.stderr}")
        return False
    print(f"  ✅  Committed: {msg}")
    return True


def main():
    os.chdir(PROJECT_DIR)
    print(f"🔧 obsidian-gtd auto-develop")
    print(f"📁 {PROJECT_DIR}")
    print()

    # Check git
    result = subprocess.run(["git", "status"], cwd=PROJECT_DIR, capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        print("❌ Not a git repository. Run 'git init && git add -A && git commit -m init' first.")
        sys.exit(1)

    # Initial verify before starting
    print("🔍 Pre-flight verification...")
    if not run_verify():
        print("❌ Pre-flight verification failed. Fix before running auto-develop.")
        sys.exit(1)

    completed = get_completed_tickets()
    all_tickets = list_all_tickets()

    if not all_tickets:
        print("📭 No tickets found in scratch/tickets/")
        return

    print(f"📋 Total tickets: {len(all_tickets)}")
    print(f"✅ Completed: {len(completed)}")
    print(f"⏳ Remaining: {len(all_tickets) - len(completed)}")
    print()

    for ticket_num, ticket_name in all_tickets:
        if ticket_num in completed:
            print(f"⏭️  Skipping ticket-{ticket_num} (already completed)")
            continue

        print(f"\n{'='*60}")
        print(f"🚀  Ticket {ticket_num}: {ticket_name.replace('-', ' ')}")
        print(f"{'='*60}")

        success = False
        for attempt in range(1, MAX_RETRIES + 1):
            print(f"\n📌 Attempt {attempt}/{MAX_RETRIES}")
            ok = run_pi(ticket_num, ticket_name)
            if not ok:
                print(f"  ⏳ pi failed, attempt {attempt}/{MAX_RETRIES}")
                continue

            # Revert if pi made changes that break things
            ok = run_verify()
            if ok:
                success = True
                break
            else:
                print(f"  ⏳ Verification failed, attempt {attempt}/{MAX_RETRIES}")
                # Stash or revert changes before retry
                subprocess.run(["git", "checkout", "--", "."], cwd=PROJECT_DIR, capture_output=True, timeout=15)
                # Also clean untracked files that might have been created
                subprocess.run(
                    ["git", "clean", "-fd", "--", "src/"],
                    cwd=PROJECT_DIR, capture_output=True, timeout=15,
                )

        if success:
            git_commit(ticket_num, ticket_name)
        else:
            print(f"\n❌  Ticket {ticket_num} failed after {MAX_RETRIES} attempts.")
            print(f"    Stopping. Fix the issue and re-run auto-develop.")
            sys.exit(1)

    print(f"\n{'='*60}")
    print("🎉  All tickets completed!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
