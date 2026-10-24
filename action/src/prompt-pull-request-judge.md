## First, decide whether to explain it

Nobody asked for this explainer by name: activity on the pull request started
this run. Before anything else, read `source/pr.md` and skim
`source/diff.patch`, then decide whether this pull request is worth
explaining to someone who did not write it.

Yes for a design decision, a new surface or command, a migration, a change
that spans packages, or anything where the reasoning matters more than the
diff. No for a dependency bump, formatting, a lockfile, a typo, a one-line
fix, or a change only its author will ever read. When it is close, explain
it.

If it is not worth explaining, write one sentence saying why to
`out/skipped.txt`, for example "It only bumps lodash from 4.17.20 to
4.17.21." The sentence goes in the run's log and its `skip-reason` output,
not on the pull request, so name the change. Then stop: write nothing
else, do not write `out/index.html`, and skip every section below.

If it is worth explaining, do not write `out/skipped.txt`, and carry on.
