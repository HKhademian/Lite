# Construction, destructuring, and matching: example walkthrough

Status: **illustrative design walkthrough dated 2026-10-18; selected rules are combined with explicitly marked sequence/schema proposals, not an executable specification**.

## Reading conventions

Examples build in complexity but are not all one program. Helper functions have the return contracts implied by their use. Fields are assumed visible in the illustrated scope; no new public/field-mutation modifier is selected. Ownership, arithmetic faults, and generic implementation are not specified by the examples.

Record construction may explicitly name its type, or omit it when an annotated binding or predefined field supplies a unique expected record type. Named record patterns infer fields from their source and do not repeat the type name. Full contextual inference and data-brace/executable-block disambiguation remain grammar work; executable body braces never become record initialization implicitly.

Construction uses field = expression. Deconstruction uses destinationPattern = sourceField, keeping value flow right to left. Compact field == expected compares without binding; field: Type binds that same-named field with a constraint. Examples provide all fields rather than deciding the open omission policy. Trailing commas and final semicolons are optional and allowed; separators between ordinary items still matter.

## 1. Bindings and functions

```text
name := "Ali";
age: Int = 18;
var score := 10;
score += 5;

double := fn(value: Int): Int {
    value * 2
}
```

Types are inferred unless supplied. Ordinary bindings are fixed; var permits reassignment. Whole typed bindings use =, never := after the type. The function's final expression is its result.

## 2. Simple conditionals and early returns

```text
if score >= 10 {
    print("Passed")
} else {
    print("Try again")
}

label := if age >= 18 {
    "Adult"
} else {
    "Minor"
}

describe_age := fn(age: Int): String {
    if age < 0 {
        return "Invalid age"
    }

    if age >= 18 { "Adult" } else { "Minor" }
}
```

Actions and values use the same if. return exits the function early; it is not needed for its normal final result. Semicolons do not discard an ordinary final expression.

## 3. Declare and construct a record

The declaration surface is selected:

```text
Student := record {
    id: Int;
    name: String;
    age: Int;
}
```

Both construction forms are selected:

```text
student: Student = {
    id = 7,
    name = "Ali",
    age = 18,
}

other := Student { id = 8, name = "Sam", age = 20, }
```

Colons declare field types; equals supplies predefined fields' initial values. Initialization does not require var merely because it uses =. The record is not a superclass, and the declaration does not select reference identity or allocation semantics.

## 4. Destructure a known record

```text
{
    studentId = id,
    studentName = name,
    years = age,
} := student;
```

The source record supplies its shape. Each destination receives the source field named on its right. For this known Student schema and unconstrained bindings, the pattern is irrefutable. The braces are a record pattern, not executable assignments; copy/move/borrow behavior is still governed by the future memory model.

## 5. Match a record, then check a guard

```text
wantedName := "Ali";

if {
    _ = id,
    name == wantedName,
    age: Int
} := student and age >= 18 {
    print("Adult student found")
}
```

_ receives id as a readable unused-allowed binding. name compares with the existing wantedName. age: Int both constrains and binds age. The guard runs only after the whole record pattern succeeds.

Compare the field fragments:

```text
years = age        /* bind source age as years */
age == expected    /* compare with existing expected; bind nothing */
age: Int           /* type-test and bind as age */
years: Int = age   /* type-test and bind as years */
: Int = age        /* type-test only */
```

## 6. Tuples and nested positional patterns

```text
(x, y) := (10, 20);

if ((x: Int, y: Int), .Some(label)) := coordinates_and_label {
    display_point(x, y, label)
}
```

The first declaration has a known tuple shape. The second condition can fail: its first component must match the nested typed tuple and its second must be Some. Bound names exist only after whole-pattern success. No new tuple-rest or whole-value alias spelling is selected here.

## 7. Option: bind, compare, skip naming, or test the tag

```text
if .Some(age) := find_user_age(id) { show_age(age) }
if .Some(== expectedAge) := find_user_age(id) { report_expected() }
if .Some(_) := find_user_age(id) { report_found() }
if .Some := find_user_age(id) { report_found() }
```

These are alternatives, not a recommendation to perform the lookup four times. Some(false) is still a successful Some match. _ is an ordinary readable binding, while tag-only .Some introduces no payload name.

```text
message := match find_user_age(id) {
    .Some(age) if age >= 18 { "Adult" }
    .Some { "Under 18" }
    .None { "Not found" }
}
```

The tag-only fallback covers remaining Some values after the guarded arm. The value result is String on every normal path.

## 8. Plain enum with explicit backing values

```text
Status := enum : Float {
    Ready = 1.1;
    Busy = 2.2;
    Stopped = 3.3
}

status := Status.Ready;

match status {
    .Ready { start() }
    .Busy { wait() }
    .Stopped { finish() }
}
```

Status remains an enum type, not arbitrary Float values. Raw conversion and physical storage are separate contracts.

The backing clause and case values can also be omitted independently:

```text
PlainStatus := enum { Ready; Busy; Stopped; }
TypedStatus := enum : Int { Ready; Busy; Stopped; }
CodedStatus := enum { Ready = 10; Busy = 20; Stopped = 30; }
```

Omission is selected; exact backing defaults/inference and automatic values remain to specify.

For a payload enum whose schema exposes Click(Point), Key(String), and Quit, matching would compose without requiring another conditional syntax:

```text
match event {
    .Click(Point(x, y)) { display_point(x, y) }
    .Key(text) { handle_key(text) }
    .Quit { close_window() }
}
```

This last example assumes a deliberate positional Point schema; payload declarations and schema syntax remain open. .Click would also test just that case without extracting its payload.

## 9. Typed Result, implicit success, explicit failure

```text
AgeError := enum : Int {
    Negative = 1;
    TooLarge = 2
}

validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return .err(AgeError.Negative)
    }

    if age > 150 {
        return .err(AgeError.TooLarge)
    }

    age
}

attempt := validate_age(inputAge);

match attempt {
    .ok(age) { show_age(age) }
    .err(.Negative) { print("Age cannot be negative") }
    .err(.TooLarge) { print("Age is too large") }
}
```

Returning age constructs success implicitly. Stored outcomes are ordinary data until inspected, recovered, or explicitly propagated. .ok/.err select their side before payload matching; overlapping success/error payload types cannot erase that distinction.

## 10. Recovery and propagation

```text
age := validate_age(inputAge) else(error) {
    outputLine(error);
    0
}

display_name := fn(id: Int): String! {
    load_user(id)!.load_profile()!.name
}
```

The fallback handles failure locally. Each ! extracts one successful result or forwards its declared recoverable error. String! is the selected String ! Error shorthand, not an inferred undeclared failure set. No outer marker unwraps every intermediate step.

## 11. Complex construction and nested deconstruction

```text
Contact := record {
    email: String;
    verified: Bool;
}

Registration := record {
    student: Student;
    contact: Contact;
}

registration := Registration {
    student = { id = 7, name = "Ali", age = 18, },
    contact = { email = "ali@example.test", verified = true, },
}

if {
    { studentId = id, name = name, years: Int = age, } = student,
    { email = email, true = verified, } = contact,
} := registration and years >= 18 {
    send_welcome(studentId, name, email)
}
```

Registration already declares the Student and Contact field types, so their construction heads can be omitted as shown; explicitly naming them in construction is also allowed. Deconstruction uses no Registration, Student, or Contact prefix: nested patterns receive their shape from the source fields. TypeName { ... } is not an alternative record-pattern production. The nested source fields are selected on the right. true = verified is a literal test of that field, not a binding named true. The whole nested shape must match before the guard/body can use its bindings. Use an explicit colon type test when nominal selection is intended; see [record-pattern boundaries](records.md#no-construction-shaped-record-patterns).

## 12. Complex Result + Option + record + additional matching

Assume fetch_student returns Option<Student> ! LoadError and find_profile returns Option<Profile>, where Profile exposes active: Bool. These are explanatory contracts, not new generic declaration grammar.

```text
describe_student := fn(id: Int): String {
    fetched := fetch_student(id);

    match fetched {
        .ok(.Some({
            studentId = id,
            name: String,
            years: Int = age,
        }))
            if years >= 18
            and .Some(profile) := find_profile(studentId)
            and profile.active {
            "Active adult: " + name
        }

        .ok(.Some) { "Student needs review" }
        .ok(.None) { "Student not found" }
        .err(error) {
            outputLine(error);
            "Student unavailable"
        }
    }
}
```

The first arm requires every nested pattern and guard to succeed. A mismatch/false guard permits later arms; a later recoverable error is not silently false. Binding scope flows left to right within the arm. The function handles its fetched Result explicitly and normally produces String on every arm. Newlines only format the chain.

## 13. Loops keep selection in their bodies

```text
loop optional_users as candidate {
    if .Some({
        studentId = id,
        name = name,
        years = age,
    }) := candidate and years >= 18 {
        greet(studentId, name)
    }
}
```

The header binds the whole source item irrefutably; the body selects it. candidate is one Option<Student>, not the source collection. As is selected for the single optional item name, independently of record field operators.

## 14. Proposed lists and rest capture

```text
/* Proposed sequence forms, not selected syntax. */
description := match values {
    [] { "Empty" }
    [only] { describe_one(only) }
    [first, second, ...rest] { describe_many(first, second, rest) }
}
```

Without rest, exact length is required by the proposal. One trailing rest receives the remainder; its static type and ownership/cost need a sequence contract. These patterns do not search a set, split a string, or consume a stream. See [sequence patterns](sequence-patterns.md).

## 15. Strings, numbers/ranges, sets, and union types

```text
command := match text {
    "start" { "Start" }
    "stop" { "Stop" }
    == configuredCommand { "Configured command" }
    _ { "Unknown command" }
}

match age {
    value if 0 <= value < 18 { report_minor(value) }
    value if 18 <= value <= 150 { report_adult(value) }
    _ { report_invalid() }
}

match actualSet {
    == expectedSet { report_equal() }
    _ { report_different() }
}

if person: Student {
    greet_student(person)
}
```

String patterns compare whole values, not regex matches. The numeric guards are interval tests, not equality with a range object or arbitrary strided-range membership. Set equality assumes that type supplies an equality operation; unordered binding remains undecided. The existing-name type test narrows person without redeclaring it, under the separate stability/type-test rules.

## 16. Every match is exhaustive; ignoring can be empty

```text
match status {
    .Ready { start() }
    _ {}
}
```

The fallback explicitly handles every remaining case. _ is the ordinary unused-allowed binding; {} returns Unit, so an extra Unit expression is optional. This also applies to specific tag-only arms such as .err {}. A value match requiring String cannot use an empty Unit branch as a substitute for a String fallback. See [coverage and explicit ignoring](match-coverage.md).

## Related concepts

- [All-type review](pattern-type-review.md) and [field clauses](aggregate-patterns.md).
- [Conditionals](conditionals.md), [match arm chains](match-guards.md), and [pattern scopes](pattern-contexts.md).
- [Sets](set-patterns.md), [records](records.md), [Result](result-and-errors.md), and [loops](loops.md).


## Result failure occurrence inspection

[LP-0017 r1](proposals/LP-0017-result-failure-occurrence-patterns.md) selects .err(e) for the first stored failure and .err(...es) for every occurrence in order. For T ! F, the bindings are F and [F]. Scalar subpatterns test the first occurrence without searching; a failed test does not change the source. Tag-only .err binds nothing, and .ok(value) preserves the complete successful T. This Result-specific collection does not flatten occurrence internals, mutate the stored outcome, or change structural tuple-rest/other constructor schemas. See [the normative examples](result-and-errors.md#failure-occurrence-patterns).
