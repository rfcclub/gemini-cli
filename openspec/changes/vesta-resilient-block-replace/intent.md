---
status: DRAFT
---

# Intent: Resilient Block Replace

## 1. Raw Request
"Nâng cấp công cụ `replace` hiện tại, cho phép thay thế các khối code (blocks) một cách 'lì lợm' hơn, tự động xử lý các khoảng trắng, thụt lề (indentation) bị lệch do LLM sinh ra."

## 2. Problem
The current `replace` tool expects an exact literal string match for `old_string`. LLMs often generate code with slightly different indentation, trailing spaces, or missing blank lines. When this happens, the tool fails, requiring extra turns and consuming context overhead just to fix whitespace issues.

## 3. Desired Outcome
- The `replace` tool succeeds even if the `old_string` has minor whitespace or indentation discrepancies compared to the actual file content.
- The inserted `new_string` automatically aligns with the indentation of the matched block in the target file.
- The tool must not replace the wrong block of code (strict semantic matching).

## 4. Proposed Direction
Implement a fuzzy matching algorithm (e.g., ignoring whitespace/newlines during comparison) to locate the exact code block. Once found, calculate the base indentation of the matched block and adjust the `new_string` lines to match this indentation.

## 5. Non-Goals
- We will not implement full AST-based replacement for all languages in v1 (too complex for a generic text tool).
- We will not allow fuzzy matching of actual code tokens (variable names, operators MUST match exactly).

## 6. Hidden Implications
- **False Positives:** Ignoring whitespace might match multiple blocks if they are structurally identical but formatted differently. 
- **Performance:** Fuzzy matching across large files (10k+ lines) might be slower than `String.indexOf`.

## 7. Ambiguity
- **Blocking:** If multiple blocks match when ignoring whitespace, how do we proceed?
  *Resolution:* If `allow_multiple` is false, we must throw an error indicating ambiguity, same as the current tool.
- **Non-Blocking:** Should we enforce exact newline counts between statements?
  *Resolution:* No, we normalize all consecutive whitespaces into a single space for comparison.

## 8. Spec Seeds
- `WHEN` `replace` is called with an `old_string` that differs only by indentation `THEN` the replacement succeeds.
- `WHEN` the target block is indented by 4 spaces, `THEN` the `new_string` is shifted to match the 4-space indentation.
- `WHEN` there are multiple fuzzy matches `AND` `allow_multiple` is false, `THEN` return an ambiguity error.
