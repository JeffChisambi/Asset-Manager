---
name: ChatContext TDZ and React Compiler
description: React Compiler triggers TDZ errors when a useCallback is declared after the useEffect that references it in the same component body.
---

## Rule
In `ChatProvider` (and any React component compiled with the React Compiler), every `useCallback`/`useMemo` must be declared BEFORE any `useEffect` or other hook that references it — even if the reference is inside the effect's callback (not its dependency array).

**Why:** The React Compiler transforms component functions and may hoist or reorder access to `const` declarations, exposing Temporal Dead Zone (TDZ) violations that plain React would not surface. The minified error looks like `Cannot access 'Ie' before initialization`.

**How to apply:** If you add a new `useCallback` to `ChatProvider` that is called inside an existing `useEffect`, place the new callback *above* that `useEffect`. The safe ordering is: all `useCallback` declarations first, then `useEffect` blocks.

## What was fixed
`loadStories` and its helper `mapApiStory` were originally declared at line ~1172 (near the end of ChatProvider), but `loadStories` was called inside the init `useEffect` at line ~520 and listed in the polling effect's deps. Moving both to just after `loadConvMessages` (before any `useEffect`) resolved the crash.
