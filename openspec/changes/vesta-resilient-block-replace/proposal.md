## Why

The current file editing tools (`replace_file_content` and
`multi_replace_file_content`) rely on exact string-matching of the
`TargetContent` within the source file. In practice, LLM outputs often contain
minor formatting discrepancies such as variations in indentation, extra carriage
returns (`\r\n` vs `\n`), or differing whitespace. These slight mismatches cause
exact string matching to fail, leading to repeated agent loops, broken
operations, and decreased coding efficiency.

Implementing a **Resilient Block Replace** capability will allow the editor tool
to tolerate minor spacing, indentation, and carriage return discrepancies during
substitution. By normalizing whitespaces and performing robust block alignment
before replacement, we will ensure that file editing is highly resilient,
extremely reliable, and completely eliminates formatting-related failures.

## What Changes

- **Normalization Engine**: Introduce a helper in
  `packages/core/src/tools/utils` that normalizes whitespaces, indents, and
  newlines for both the source file section and the target block during the
  search phase.
- **Fuzzy/Fuzzy-Adjacent Block Matching**: Implement an algorithm that locates
  the target block based on structural lines rather than absolute byte-for-byte
  matching.
- **Indentation Preserving Replacement**: When replacing the content, the tool
  SHALL automatically adjust the indentation of the replacement block to match
  the original indentation of the target block in the source file.

## Capabilities

### New Capabilities

- `resilient-replace`: Robust search-and-replace mechanism that tolerates minor
  formatting discrepancies and preserves target block indentation in file edits.

### Modified Capabilities

_(None)_

## Impact

- **Core Package (`packages/core`)**: Implemented within the core tool execution
  handlers (`packages/core/src/tools/replace.ts` or related edit tools).
- **Tool Suite**: Extends file editing capability across all agent loops.
