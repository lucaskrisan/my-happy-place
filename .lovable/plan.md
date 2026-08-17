# Plan - Hotfix 12.1 Quiz Audit & Fixes

Audit and fix the Quiz module, ensuring deterministic results, robust interaction protection, improved accessibility, and comprehensive testing.

## Technical Details

### 1. Deterministic Result Calculation
Refactor `handleOptionClick` to calculate `nextAnswers` synchronously and pass it to `calculateResult(nextAnswers)`. This prevents stale state bugs where the last answer is omitted from results.

### 2. Answer Replacement (Allow Previous)
Ensure `setAnswers` uses the current question ID as a key, effectively overwriting any existing answer for that question when navigating back and re-answering.

### 3. Advanced Keyboard Navigation
- Add focus management for quiz options.
- Implement `ArrowUp` and `ArrowDown` to move focus between options.
- Implement `Enter` and `Space` to select the focused option.
- Ensure 1-9 numeric shortcuts remain functional.
- Prevent keyboard interception when focus is in input/select elements (using `e.target` checks).

### 4. Reduced Motion
Wrap animations in `prefers-reduced-motion` checks.
- Disable `x`, `y`, `scale`, and `stagger` animations when reduced motion is preferred.
- Use simple `opacity` transitions instead.

### 5. Double-Answer Protection & Single onComplete
- Introduce a `processingRef` (MutableRefObject) to block interactions synchronously during transitions.
- Ensure `onComplete` is guarded by a state check or ref to prevent multiple calls.

### 6. Close Behavior
Verify `closeBehavior='prevent'` correctly hides/disables the internal close button while allowing the external dev-tool force-close to work.

### 7. Automated Validation (Playwright)
Create a comprehensive test suite in `/tmp/browser/quiz_audit.py` covering:
- Deterministic result calculation (answers.length=3, score=6, tags).
- Answer replacement logic.
- Keyboard navigation (Arrows, Enter, Space).
- Double tap protection.
- Reduced motion compliance.
- Single `onComplete` trigger.

## Proposed Changes

### src/components/dev
#### [EDIT] QuizOverlay.tsx
- Refactor `calculateResult` to accept answers as an argument.
- Update `handleOptionClick` to compute `nextAnswers` and use it immediately for result calculation.
- Add `useRef` for `isProcessing` guard.
- Implement keyboard focus logic and event listeners for `ArrowUp`/`ArrowDown`.
- Apply `prefersReducedMotion` to motion components.

### src/routes/dev
#### [EDIT] quiz.tsx
- Update the lab to include a "Audit Test" button that loads a specific 3-question set for validation.
- Add a "Reduced Motion Toggle" simulation if possible, or instructions for manual OS-level testing.

## Verification Plan
1. `bun run build:dev` to ensure no regressions.
2. Execute `/tmp/browser/quiz_audit.py`.
3. Manual smoke test of `/dev`, `/dev/choice`, `/dev/quiz`, and `/dev/scene`.
