# Implementation spec — updating the `keep-going` skill

**Status:** proposed, not applied. Nothing in the skill has been changed.
**Written from:** one long unattended run on this repo (People First design-system
pipeline), 12 September 2026.
**Applies to:** the synced user skill `keep-going`, currently at
`/root/.claude/skills/synced/<bucket>/keep-going/SKILL.md` (10,938 bytes, single file).

---

## 1. The problem, in one number

Over this run the user had to type **"keep going" around nine times**.

A skill whose entire stated purpose is *"work continuously through an agreed queue without
stopping to ask what's next"* should not need nine manual restarts in one session. Once is
a misjudgement; nine times is a design fault, and it is in the skill rather than in the
run — because on every one of those nine occasions the skill was being followed correctly.

The skill even names this failure in its own words:

> Left unwritten, these leak back in — they are the actual cause of the stop-start pattern
> this skill exists to fix.

It then lists six things that are not reasons to stop — and misses the one that actually
caused every stop.

---

## 2. Root cause

Three clauses, each sound on its own, combine into a stop the user does not want.

| Clause | Line | What it says |
|---|---|---|
| Stop condition | 170 | "The queue is empty." |
| No drift | 189–192 | "If you spot something else worth doing, add it to the queue as a suggestion for the user. **Do not do it.**" |
| Report shape | 258–275 | An end-of-turn summary shaped like a handoff, ending in "Your turn". |

So: the queue empties → finding more work is forbidden → stop and hand back. The user says
"keep going" → work is found in minutes → queue empties again → stop again.

**The evidence that this is the wrong default for this user:** almost every piece of
substantial work in this run came from surveying for gaps, not from the queue. Three
library faults nobody had queued (borders painting a 1px cage where Figma strokes one edge;
47 components casting a shadow the stylesheet never carried; children of hand-laid-out
parents being stacked instead of placed), plus six checks found to be measuring the wrong
thing. Under a strict reading of the skill, none of that work was permitted.

The skill is not wrong to have the "no drift" rule — it exists so a pile of changes stays
reviewable. It is wrong to apply it when **the queue is empty and the user has asked for a
long run**, which is precisely when finding work is the job.

---

## 3. Changes

### 3.1 Add a survey mode — the main change

**Where:** new section after "The work loop", and an edit to the stop conditions.

**Remove** from "Stop conditions":

```
- The queue is empty.
```

**Add** as a new section:

```markdown
## When the queue empties

An empty queue is not the end of the run. It is the point where you stop being told what
to do and start looking — and on a mature project that is where most of the value is.

**Survey, inside the scope fence, in this order:**

1. Re-read the project's own rules (CLAUDE.md, AGENTS.md, README) and ask what they
   claim that nothing checks.
2. Run every check the project has and read what they report but do not fail on —
   pinned baselines, counts, "N skipped" lines. Those are the project telling you where
   it already knows it is weak.
3. Ask what the pipeline measures and what it does NOT. A property nothing records is
   invisible to every check built on those records.
4. Re-read the last few things you built, adversarially.

**Queue what you find, then work it.** Write each one into QUEUE.md with a done-when
before starting, so the run stays reviewable — the "no drift" rule is about keeping the
pile legible, not about refusing to find work.

**Survey findings are capped at three per sweep.** More than that and the run stops being
a run and becomes a rewrite; queue the rest as suggestions and leave them.

**Stop and hand back when a survey finds nothing** — say so plainly, in one line, rather
than inventing work to fill the silence. That is a real stop and the user will read it as
one.
```

**Rationale.** Converts nine restarts into one. Keeps the reviewability the "no drift"
rule protects, by requiring the finding to be queued with a done-when before it is built.
The cap is the guard against the opposite failure — a run that never ends and cannot be
reviewed.

---

### 3.2 Amend "No drift" so it does not contradict the above

**Where:** line 189.

**Current:**

```markdown
### No drift

If you spot something else worth doing, add it to the queue as a suggestion for the
user. Do not do it. This keeps the pile of changes reviewable.
```

**Proposed:**

```markdown
### No drift

**While the queue has work in it:** if you spot something else worth doing, add it to the
queue as a suggestion and carry on with the current task. Do not divert. This keeps the
pile of changes reviewable and stops one task turning into six.

**When the queue is empty:** see "When the queue empties" — finding work is then the job,
and the same rule still applies to HOW you do it. Queue it with a done-when first.
```

**Rationale.** The rule is currently absolute and reads as "never do unqueued work", which
is the clause that made every stop correct. Scoping it to "while there is queued work"
keeps its real purpose — no diverting mid-task — without forbidding the survey.

---

### 3.3 Make the push rule an environment question, not a prohibition

**Where:** line 115.

**Current:**

```
6. Commit inside the scope fence, one commit per finished task, with a message a
   non-developer can read. Commits are save points and need no permission — they are
   local and publish nothing. **Never push, never touch remotes, never rewrite history.**
```

**Proposed:**

```
6. Commit inside the scope fence, one commit per finished task, with a message a
   non-developer can read. Commits are save points and need no permission — they are
   local and publish nothing. **Never rewrite history.**

   **Pushing depends on where the work has to survive.** On a local machine, do not push:
   the commits are already safe and pushing publishes. In a REMOTE or containerised
   session the container is wiped when it ends, so an unpushed commit is a lost commit —
   there, push each finished task to the working branch, and say so in the pre-flight
   plan. Agree which it is at pre-flight and write it at the top of QUEUE.md. Opening a
   pull request is never part of this; that is always a separate ask.
```

**Rationale.** This is a factual conflict, not a preference. This project runs in a wiped
container and has a stop hook requiring work to be committed **and pushed** — so the
skill's blanket "never push" would lose every task's work. The QUEUE.md already carries a
hand-written override paragraph to cancel the rule, which is a sign the rule is wrong
rather than that the project is unusual.

---

### 3.4 Allow a settled question to be a finished task

**Where:** "Writing a good 'done when'".

**Add:**

```markdown
**A task can be finished by an answer rather than a thing.** "Should we do X?" is a real
task, and "no, and here is the measurement that settles it" is a real delivery — often a
more valuable one than building X. Write the done-when as *the question is settled by a
measurement, the answer is written where the next person will look, and the number that
would change the answer is recorded*. Do not quietly drop such a task because it produced
no code.
```

**Rationale.** Two of this run's most useful outcomes were decisions not to build: clipping
was measured and deliberately not carried (it would have silently deleted content from 27
templates), and a proposed min-height change was killed by measurement before any code was
written. The current skill has no shape for these, so they read as tasks that failed.

---

### 3.5 Add one practice that repeatedly paid, and cost nothing

**Where:** the "Checking" section.

**Add:**

```markdown
**Prove a new check can fail.** After writing any check, break the thing it watches and
confirm it reports it, then put it back. A check that has only ever passed has not been
tested — it has been observed being quiet, and those are different. This costs about a
minute and has repeatedly caught checks that could not fail at all.
```

**Rationale.** Used on every check written this run. It immediately caught one that
inspected the wrong element and one that constructed its own favourable input — both would
have passed silently forever.

---

## 4. What deliberately does not change

Named so a future edit does not quietly undo something that worked:

- **The end-of-turn report shape** (Done / Not fully checked / Your turn / queue count).
  It is readable by a non-developer and the "Not fully checked" block is the honest part.
- **"A check that did not run is never reported as passed."** Load-bearing.
- **Skill discovery fresh every run**, and re-reading a governing skill immediately before
  the work it governs. Exactly right, and the reason this spec exists at all.
- **The stop conditions other than the queue being empty** — destructive actions,
  credentials, new dependencies, a fix failing twice, ballooning scope, conflicting skills.
  All sound; all left alone.
- **Pre-flight.** The scope fence and the snapshot are what make a long run safe.

---

## 5. Where to apply it

| Option | Where | When it is right |
|---|---|---|
| **A. Edit at source** *(recommended)* | Your Claude settings, where the synced skill is authored | The changes are about how you want to be worked with, everywhere. Survives container wipes; applies to every project. |
| **B. Project copy** | `.claude/skills/keep-going/SKILL.md` in this repo | The changes are about how *this pipeline* gets built. Version-controlled and reviewable as commits — but two skills of the same name can drift. |

Changes 3.1, 3.2, 3.4 and 3.5 are general → **Option A**.
Change 3.3 is partly environmental; the *policy* belongs in the skill (Option A), and the
*answer for this repo* belongs at the top of `keep-going/QUEUE.md`, where it already is.

Mechanically: I cannot write to your Claude settings from here. The workflow is that I
draft the revised `SKILL.md` in full, you read it, you paste it in. Use the `skill-creator`
skill for the rewrite — it also tests whether the reworded description still triggers when
it should, which is the part that fails quietly.

---

## 6. How to tell it worked

Not "the skill reads better". Three checkable things, on the next long run:

1. **The user types "keep going" once**, at the start. More than twice means 3.1 did not
   take.
2. **Every unqueued piece of work appears in QUEUE.md with a done-when before it is
   built** — visible in the commit order. If work lands with no queue entry, 3.2 has swung
   too far the other way.
3. **Each finished task is pushed** in a remote session, and the tree is clean at every
   stop. Check with `git status` and comparing local HEAD to the remote tip.

If (1) improves and (2) degrades, the cap in 3.1 is too high — lower it from three to one
and re-run.

---

## 7. Risks

- **The obvious one: a run that will not stop.** Removing "the queue is empty" from the
  stop conditions removes the natural terminator. Mitigated by the three-finding cap and
  by the explicit instruction to stop when a survey finds nothing — but it is the thing to
  watch, and the reason (2) above is a success criterion rather than a nice-to-have.
- **Long runs cost usage allowance.** The skill already says so; survey mode makes runs
  longer, so that warning matters more, not less.
- **A survey on an immature project will find everything**, and the cap becomes the only
  thing standing between a run and a rewrite. Consider making survey mode something the
  user opts into at pre-flight rather than the default, if it proves too eager.
