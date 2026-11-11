# Part B. Relay and handoff protocol

Two people take turns. Exactly one person (the baton holder) works on a checkpoint at a time. A checkpoint ends at a **savepoint**: a git tag `cp-XX-done` on `main` where everything builds, every test passes and `docs/HANDOFF.md` says what is true. The next person starts from that tag, so there is nothing to merge between people.

## B1. Rules that prevent conflicts

| Rule | Why |
|---|---|
| One baton holder. The name in `docs/HANDOFF.md` "Current owner" is the only person who commits code. | Two people never edit the same files at the same time. |
| One checkpoint at a time, in order. Never start CP-N+1 until `cp-N-done` exists. | Every checkpoint builds on a known-good state. |
| Work on branch `cp-XX-short-name` created from `main` at the previous tag. Merge back with `git merge --ff-only`. No force-push, no rebasing `main`. | History stays linear and recoverable. |
| `package.json`, `package-lock.json`, `packages/contracts` and `docs/HANDOFF.md` change only on the baton holder's branch. Contract changes are bug fixes only and are logged. | Shared files cannot diverge. |
| `.env` files are never committed. Each person keeps their own local `.env` from `.env.example`. | No secrets in Git; no environment clashes. |
| The non-baton person does non-code work: runs the previous exit gate, tests manually, sets up accounts (Atlas, hosting), reports bugs in chat for the baton holder to log. | Useful without touching the code line. |

## B2. Starting a checkpoint (about five minutes)

1. `git fetch --tags && git switch main && git pull`. Check `git describe --tags --abbrev=0` equals the previous checkpoint tag.
2. Read `docs/HANDOFF.md`: status must be READY and the next step must name your checkpoint. Put your name in "Current owner" and commit that on the new branch.
3. `git switch -c cp-XX-short-name`, then `npm ci`.
4. Run `npm run verify` (and `npm run e2e` from CP-05 on). It must be green before you change anything. If it is red, stop: the previous checkpoint's gate failed, so the previous owner fixes it first.
5. Open a **fresh** AI chat. Paste the prompt from `docs/prompts/CP-XX.md`. If your AI tool cannot read repository files, paste `docs/PROJECT_BRIEF.md` and `docs/HANDOFF.md` first.

## B3. Finishing a checkpoint

1. Run the exit gate yourself: `npm run verify`, `npm run e2e` where listed, and every manual check. Do not rely on the AI's claim.
2. Confirm `docs/HANDOFF.md` is updated (checkpoint log, decisions, contract changes, dependencies, parking lot, known issues, exact commands, next step).
3. `git switch main && git merge --ff-only cp-XX-short-name`, then `git tag cp-XX-done && git push origin main --tags`.
4. Set HANDOFF status to READY and "Current owner" to the other person (commit and push), then tell them the checkpoint is saved.
5. Handoff test: the other person runs the exit gate on the tag before starting the next checkpoint.

## B4. Leaving early (mid-checkpoint)

- Commit work in progress to your checkpoint branch and push it. Do **not** tag and do **not** merge to `main`.
- In `docs/HANDOFF.md` set status IN PROGRESS and write the exact next step (file, test or command). Commit on the same branch.
- The other person may continue only on that same branch, only after the baton is handed over in a commit, and must finish this checkpoint before starting the next.
- CP-09 has built-in sub-savepoints (`cp-09a-done` to `cp-09d-done`) because it is the largest checkpoint.

## B5. Recovery

Every tag is a known-good state. If a branch goes wrong, run `git switch -c cp-XX-retry cp-(XX-1)-done` and start the checkpoint again from the saved state. Bugs found after a gate passed go to Known issues in `HANDOFF.md`; they are fixed in the current checkpoint only if they block it, otherwise in CP-12.

## B6. docs/HANDOFF.md template

```
# HANDOFF

## Baton
Current owner: <name>            Updated: <date time>
Status: READY | IN PROGRESS | BLOCKED
Last completed: cp-XX-done (commit <hash>)
Current checkpoint: CP-YY on branch cp-YY-name   (or: none, next is CP-YY)

## Exact next step
<One or two sentences. If IN PROGRESS: the file, test or command to continue with.>

## How to run (keep accurate)
Install: npm ci | Verify: npm run verify | Backend: npm run dev -w backend
Frontend: npm run dev -w frontend | Seed: npm run seed -w backend | E2E: npm run e2e

## Checkpoint log
| CP | Owner | Finished | Tag | Notes |

## Decisions        (what you chose where the brief was silent, and why)
## Contract changes (schema, fixture, field or endpoint changes, with reason)
## Dependencies added (name, why, free and licence)
## Known issues
## Parking lot      (out-of-scope ideas and findings; do not build them now)
```
