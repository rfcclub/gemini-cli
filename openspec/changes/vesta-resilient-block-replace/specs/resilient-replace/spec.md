## ADDED Requirements

### Requirement: Formatting-Insensitive Block Matching

The system SHALL match the specified `TargetContent` block within the source
file even if there are differences in indentation (spaces vs tabs), carriage
returns (`\r\n` vs `\n`), or trailing whitespaces.

#### Scenario: Match block with different indentation and line endings

- **WHEN** the editor tool is called to replace a block in a file that uses
  `\r\n` and 4-space indentation, while the `TargetContent` uses `\n` and
  2-space indentation
- **THEN** the system SHALL successfully locate the target block by normalising
  line endings and indentation, perform the replacement, and preserve the
  original line endings (`\r\n`) in the final output.

### Requirement: Indentation Alignment Preservation

The system SHALL automatically adjust the indentation of the
`ReplacementContent` to align perfectly with the original indentation level of
the matched block in the source file.

#### Scenario: Align replacement block to original file indentation

- **WHEN** a target block starting at column 8 is matched, and the
  `ReplacementContent` is provided with zero indentation (starting at column 0)
- **THEN** the system SHALL prepend 8 spaces of indentation to each line of the
  replacement content before writing it to the file.
