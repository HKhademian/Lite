# 4. Enums and variants — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Union normalization](../../../docs/union-normalization.md)
- [Match](../../../docs/match.md)
- [Zero initialization](../../../docs/zero-initialization.md)
- Related investigation catalog areas: INV-024, INV-025, INV-026.

## 4.1 Definition and identity

**Baseline:** Enum cases and plain-union members are not automatically collapsed into their payloads. Complete enum declaration and identity details need their owning review.

**Initial assessment and probes:** Compare two enums each having a `Ready` case and a plain union of their payloads. Determine what identifies a case across aliases and modules.

## 4.2 Cases and payloads

**Baseline:** A case may need no data or associated data; constructor and schema details are not fully settled.

**Initial assessment and probes:** Compare a no-payload `Ready` with a `Message` carrying text and a case carrying two values. Decide whether field labels and nesting follow tuple or record rules.

## 4.3 Construction and access

**Baseline:** Case construction and payload extraction must preserve which case is active; exact constructor grammar remains under review.

**Initial assessment and probes:** Ask whether constructing and reading a payload require explicit case selection and what happens when a caller attempts to access the wrong case.

## 4.4 Matching and coverage

**Baseline:** Subject matching is selected, while complete enum schemas and the exhaustiveness algorithm remain open.

**Initial assessment and probes:** For two cases, compare a complete match, a missing case, and a guarded case: a guard may fail even if its case was named. Check whether a fallback remains necessary.

## 4.5 Value behavior and zero

**Baseline:** Every type has a semantic-zero goal, but enum zero mapping remains open. Copy, equality, representation, and associated resources need separate rules.

**Initial assessment and probes:** Compare declaration-order zero, an explicitly designated case, and a constrained enum with no obvious default. Consider case evolution, stable identity, and cleanup of payloads.

## Cross-topic routing

Types (1), patterns (6), and failure outcomes (8) interact with case identity and payloads. Record new decisions with their owning area; return to this review after the dependency is understood.
