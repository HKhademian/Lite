# Ticket Pricing Router

Read a count `n` followed by `n` ticket triples (`age`, `vipFlag`, `zone`) from stdin (`vipFlag == 1` means VIP, otherwise standard).

Model each ticket as a nominal `Ticket := record { age: Int; vip: Bool = false; zone: Int = 1; };` and price each ticket with subject-based `match`:
- Children (`age < 12`): `5`
- VIP in zone `1 or 2`: `30`
- VIP in any other zone: `40`
- Seniors (`age >= 65`): `8`
- Standard in zone `1..3` (`1 <= zone <= 3`): `10 + (zone * 5)`
- All other standard tickets: `25`

Print `totalPrice vipCount` separated by a space (or `0 0` if `n <= 0`).
