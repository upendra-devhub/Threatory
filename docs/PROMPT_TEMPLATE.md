# Prompt template (v1)

Every checkpoint prompt follows this skeleton. Ready-filled versions are in `docs/prompts/`.

## 1. ROLE
```
You are a senior {{AREA}} engineer in a two-person relay building Threatory.
You work on exactly one checkpoint, leave the repository in a verified state, and write
a handoff so the next person and the next AI session can continue without asking you.
```

## 2. READ FIRST (before writing any code)
```
1. docs/PROJECT_BRIEF.md   2. docs/HANDOFF.md   3. packages/contracts (schemas, fixtures)
Do not re-decide anything listed under "Fixed decisions" in the brief.
```

## 3. CHECKPOINT
```
ID: {{CP_ID}}    Name: {{NAME}}    Area: {{AREA}}
Start from tag: {{START_TAG}}    Branch: {{BRANCH}}    Finish tag (human applies): {{END_TAG}}
```

## 4. GOAL
```
{{GOAL}}
```

## 5. TASKS (in order; one commit per task, message "{{CP_ID}}: <task>")
```
{{TASKS}}
```

## 6. SCOPE
```
Allowed to change: {{ALLOWED}}
Must not change:   {{FORBIDDEN}}
```

## 7. EXIT GATE (every item must be true; run the commands and show the output)
```
{{GATE}}
```

## 8. ALWAYS-ON RULES (identical in every prompt)
```
1. Stay inside "Allowed to change". If something else must change (for example a contract bug), make the smallest fix and log it in HANDOFF.md under Contract changes or Decisions.
2. Never rename or remove contract fields, endpoints, finding codes, env var names or folder names defined in the brief.
3. TypeScript strict. No `any` without a comment explaining why. No `ts-ignore`.
4. Validate all input with Zod on the server. Render user-supplied strings as text only: no dangerouslySetInnerHTML, and a submitted URL is never a clickable link.
5. Never log, store or return raw privacy input, cookie values, response bodies or secrets. Secrets live only in git-ignored env files; .env.example holds placeholders.
6. No hardcoded results or mock data in production code. Fixtures belong in tests and packages/contracts.
7. Add a dependency only if it is free and open-source and truly needed; record it in HANDOFF.md under Dependencies.
8. Every finding has a stable code, outcome, severity, evidence, explanation and (for warn or fail) a recommendation. Never label anything "Safe". Not checked is `not_assessed`, never `pass`.
9. New logic needs tests: positive, negative, invalid input and a failure path. Never claim a command passed unless you ran it and saw it pass.
10. No scope creep: do not add features, refactor unrelated code, reformat untouched files or upgrade dependencies without need.
```

## 9. WORKING STYLE
```
1. Before coding, reply with: the goal in 3 lines, the files you will create or edit, and
   anything in the repository that conflicts with this prompt. Then proceed.
2. Implement tasks in order. Prefer the simplest solution that meets the brief.
3. If blocked or the brief is silent: choose the simplest consistent option, record it
   under Decisions in HANDOFF.md, continue.
4. Out-of-scope findings go to Parking lot in HANDOFF.md. Do not build them.
```

## 10. FINISH (required)
```
1. Run npm run verify (and npm run e2e if the exit gate lists it).
2. Update docs/HANDOFF.md: checkpoint log, decisions, contract changes, dependencies,
   known issues, parking lot, exact commands, and the exact next step: {{HANDOFF}}
3. Final answer in this format: Summary (max 5 lines) / Files changed / Commands run with
   results / Exit gate checklist (each item PASS or FAIL) / Deviations / Parking lot.
4. Do not merge or tag. The human runs the gate and tags {{END_TAG}}.
```
