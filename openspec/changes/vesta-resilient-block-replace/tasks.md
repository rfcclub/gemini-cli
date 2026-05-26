## 1. Matcher Utility Development

- [ ] 1.1 Create the `ResilientBlockMatcher` utility in
      `packages/core/src/utils/resilientBlockMatcher.ts` to implement whitespace
      and carriage return normalisation.
- [ ] 1.2 Implement the sliding-window line alignment search algorithm with
      ambiguity safeguards.
- [ ] 1.3 Add unit tests verifying matching accuracy under various indentation
      structures, mixed line endings, and multi-line structures.

## 2. Editor Tool Integration

- [ ] 2.1 Refactor the core replacement tool
      (`packages/core/src/tools/replace.ts` or related file editing tool) to use
      `ResilientBlockMatcher`.
- [ ] 2.2 Implement automatic indentation delta calculation and prefixing logic
      for non-empty lines in rewritten blocks.
- [ ] 2.3 Add integration tests verifying editing tools execute successfully
      with fuzzy target blocks and raise clear errors on ambiguous matches.
