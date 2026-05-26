# Resilient Block Replace

Resilient Block Replace provides a formatting-insensitive code search and
replacement mechanism to eliminate editing failures caused by indentation or
carriage return mismatches. This feature prevents editing loops and ensures
highly reliable structural adjustments.

LLM outputs often contain minor discrepancies in spacing or newline formats. By
normalising whitespaces and lines during search and aligning indentation on
rewrite, Gemini CLI successfully applies modifications without breaking.

---

## How It Works

The resilient replacement engine intercepts file-editing tools like
`replace_file_content` to execute robust structural modifications.

1. **Whitespace Normalisation:** The search utility normalizes both the target
   source file and the model-provided `TargetContent` block. It collapses mixed
   tabs/spaces into single spaces and strips trailing line spaces.
2. **Structural Search:** The engine runs a sliding-window line comparison using
   the normalized blocks to locate the exact starting line of the match.
3. **Ambiguity Prevention:** If the normalisation results in multiple matching
   locations inside the same file, the tool rejects the rewrite to protect file
   integrity.
4. **Indentation Delta Rewriting:** The engine calculates the precise leading
   indentation of the matched line in the original file. It applies this prefix
   to each line of the new `ReplacementContent` before writing it.

---

## Benefits

This capability significantly improves developer workflows in multiple ways.

- **Eliminates Whitespace Failures:** Stops minor indentation formatting
  mismatches from failing edits.
- **Cross-Platform Compatibility:** Handles differences in line ending formats
  (`\r\n` vs `\n`) seamlessly.
- **Style Consistency:** Guarantees that newly generated code segments align
  perfectly with your existing codebase's formatting style.
