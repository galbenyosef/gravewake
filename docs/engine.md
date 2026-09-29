# Declarative UI: moved

The catalog now lives in the game's repo, git-tracked and checked against the code by a drift test.

For Deadwood, read `~/dev/deadwood/docs/declarative-ui.md` (on a milestone or ticket branch, the checkout you work in). Its tables are tested by `src/decl/catalog.test.ts`, so they match the engine's registries. Edit that copy only, in the same commit that changes the code. This file is no longer maintained.
