# Collection shorthand and API overconstraint

Status: **tradeoff review, 2026-10-19**. The user identifies an ecosystem risk: if easy collection spellings imply both traversal and indexing, library authors may require both even when their operations need traversal only. No bracket meaning or partial-signature model is selected here.

## The risk is semantic

If [T], [T;], or [T; count] aliases a complete contract that includes indexing, a function using that annotation genuinely requires indexing. The compiler cannot accept a traversal-only set or generator merely because the implementation happens not to index. Doing so would make the signature's stated guarantee unreliable or introduce an implicit adapter.

Different extent spellings should express their chosen size/shape distinction independently of operation requirements. The meaning of each form, especially [T;], is not established by the user's list of candidates. Static extent does not by itself select storage ownership, contiguity, or an indexed API.

Short strong contracts can attract unnecessarily restrictive APIs. Long weak contracts can burden ordinary authors. This cannot be solved solely by selecting an attractive name for Indexable or Traversable.

## Candidate A: complete minimal shorthand

Let [T] mean traversal over T values. Keep stronger contracts explicit, and infer them for omitted parameter annotations. A published complete traversal-only signature remains stable and cannot acquire indexing from its body.

This is the earlier recommendation in [function signatures](collection-function-signatures.md). It admits broad providers but leaves explicit stronger annotations as an ergonomics problem. Readable aliases, editor-generated signatures, and standard-library examples can reduce that burden. They do not make the stronger contract disappear.

## Candidate B: partial element/shape annotation

Treat a short collection annotation as the written portion of an inferred generic function contract:

```text
show := fn(values: [Int]) {
    loop values as value { print(value); }
}

third := fn(values: [Int]): Int! {
    values[2]!
}
```

For illustration, the short annotation establishes Int element typing and whatever baseline source/shape meaning is chosen. The first definition's full inferred contract needs traversal. The second additionally needs the selected indexing operation. Its Result behavior in this example follows the separately proposed fallible-default indexing policy, not a new failure decision.

The completed function types differ even though the short parameter annotations look alike. The compiler exports and checks the full requirements; it does not decide support dynamically or lock the provider to the first call's List implementation. Output/error annotations still constrain every result, and escaping recoverable errors still need explicit declaration.

This makes the parameter annotation deliberately partial. It revisits the earlier proposal that explicit collection annotations are complete boundaries. The full function contract must be visible in tooling and callable types; requirements cannot be concealed from downstream compilation. Generalization, overloads, recursive definitions, aliases, expected callable types, and interface coherence remain substantial design work.

Adding indexing to show would change its inferred API and could break callers. Official tooling should show this contract change. Authors of stable libraries need a way to freeze a complete requirement set and have the body checked against it. Exact syntax for complete constraints remains open; no extra beginner keyword is selected by this review.

Do not silently switch between partial and complete treatment based on whether a declaration is private or exported. The language needs one defined boundary. A transparent alias alone must not turn a partial constraint into a runtime interface representation. Fields, results, reassignable storage, and first-class generic functions still need their independent type/representation rules.

## Candidate C: convenient strong defaults with API guidance

Let the short spelling describe an ordinary indexed sequence, accept that some APIs will deliberately use it, and offer broader contracts through inference or explicit annotations. Official libraries should use the weakest practical requirements. A diagnostic can suggest relaxing an unnecessary public requirement, while allowing intentional restrictions.

This keeps an everyday indexed type simple but does not eliminate the overconstraint risk. A warning cannot transparently rewrite public contracts, and the formatter must not change semantics. This option remains legitimate if predictable complete annotations are the stronger priority.

## Recommendation to investigate

Evaluate partial element/shape annotations for simple inferred generic functions rather than making every bracket spelling a large mandatory capability bundle. Preserve an explicit complete-contract path for stable APIs. Compare this with complete minimal shorthand using small scripts, an exported traversal-only library, an indexing helper, a type-preserving adapter, and a stored callback.

The recommendation is exploratory. It does not override the earlier complete-contract proposal or adopt partiality for every type annotation. Do not select the bracket grammar until the input, output, alias, and stored-value cases have been checked together.

Related: [function signatures](collection-function-signatures.md), [inference](collection-inference.md), [operation contracts](collection-operation-contracts.md), and [capabilities](collection-capabilities.md).
