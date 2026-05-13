# Phase 1: Planechase Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 1-planechase-core
**Areas discussed:** Player Identification

---

## Player Identification

| Option | Description | Selected |
|--------|-------------|----------|
| Named players | Each player types their name during setup; names shown on game screen and winner declaration | |
| Named players (account vision) | Named players backed by PlaneChaser accounts; host enters usernames | ✓ |
| Numbered players | Anonymous Player 1/2/3/N; faster setup, weaker conquest link | |
| Logged-in user + guests | Only device owner has account; others are unnamed guests | |

**User's choice:** Named players backed by accounts — host types each player's PlaneChaser username during setup. Vision is for every player to have an account so conquest can be tracked from game 1.

---

## Host join mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Host types player usernames during setup | Device owner enters each player's username; accounts linked; no QR needed per player | ✓ |
| Players scan a QR code | Each player uses own device to join; requires multi-device sync (out of scope) | |
| Phase 1 names only, Phase 2 accounts | Typed names in Phase 1, wired to accounts in Phase 2 | |

**User's choice:** Host types player usernames during setup. Account linking happens at game start.

---

## Unknown username handling

| Option | Description | Selected |
|--------|-------------|----------|
| Block — all players must have accounts | Error shown; valid username required before starting | ✓ |
| Allow guest slot | Unknown username added as named guest; guest wins don't count for conquest | |
| You decide | Leave to Claude's discretion | |

**User's choice:** Block — all players must have accounts. No guest slots.

---

## Host appearance in player list

| Option | Description | Selected |
|--------|-------------|----------|
| Host is auto-added | Logged-in user is Player 1 automatically; adds others by username | ✓ |
| Host enters everyone | Host types all usernames including their own | |

**User's choice:** Host is auto-added as Player 1. No need to type own username.

---

## Claude's Discretion

- **Turn lifecycle:** How chaos escalation counter resets (End Turn button vs. auto-reset on Planeswalk) — deferred to Claude. Implement per standard Planechase rules.
- **Plane deck behavior:** How deck size controls gameplay and what happens on deck exhaustion — deferred to Claude. Standard rules: shuffle and continue.
- **Session persistence scope:** How long to offer "Resume Game" — deferred to Claude. Recommended: 24-hour window.

## Deferred Ideas

None — discussion stayed within phase scope.
