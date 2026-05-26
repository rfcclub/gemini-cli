## Context

File-editing actions in agentic workflows suffer from frequent failures due to
minor syntax styling, spacing, or newline differences. Restructuring our block
replacement logic to normalise whitespace during search and preserve indentation
on rewrite will drastically improve the resilience of edit operations.

## Goals / Non-Goals

**Goals:**

- Create a `ResilientBlockMatcher` utility in `packages/core` to perform fuzzy,
  whitespace-insensitive block matching.
- Integrate `ResilientBlockMatcher` directly into core file-editing tools (like
  `replace_file_content`).
- Automatically detect and apply indentation deltas to rewritten blocks.

**Non-Goals:**

- Creating AST-level semantic diffing (matching remains line-structure and
  character-based, not compiler-based).
- Overwriting multiple ambiguous match locations without user validation.

## Decisions

### 1. Line-Normalized Scanning Algorithm

- **Context**: Code files can have trailing spaces, mixed tabs/spaces, and
  various carriage returns.
- **Decision**: The matcher SHALL read both the source file and target block,
  normalising each line by stripping leading/trailing whitespace, and replacing
  internal multiple-whitespace sequences with a single space.
- **Rationale**: Normalisation eliminates 99% of formatting discrepancies,
  allowing accurate structural matches.

### 2. Ambiguity Detection & Safeguards

- **Context**: Fuzzy matching might match multiple lines if the target block is
  too short or generic.
- **Decision**: If the normalized search finds more than one match in the file,
  the tool SHALL throw an error indicating "Multiple ambiguous matches found;
  please provide more surrounding context lines."
- **Rationale**: Prevents accidental corruption of wrong file sections.

### 3. Indentation Delta Reconstruction

- **Context**: The replacement code must perfectly blend into the existing file
  style.
- **Decision**: Calculate the whitespace prefix of the matched block's first
  line in the source file, and prepend this prefix to all lines of the
  `ReplacementContent` that are non-empty.

## Risks / Trade-offs

- **Risk: Mixed Indentation Style**
  - _Description_: If the file uses mixed tabs and spaces, calculating a raw
    space prefix could result in malformed styles.
  - _Mitigation_: The prefix detection SHALL match the exact character sequence
    (tabs vs spaces) used in the preceding/matching lines of the file.
