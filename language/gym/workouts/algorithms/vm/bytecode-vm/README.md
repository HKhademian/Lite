# Workout: Stack Bytecode VM

Read stack-machine instructions (one non-empty line per instruction, zero-indexed):
- `PUSH <int>`: push integer onto stack
- `ADD`, `SUB`, `MUL`: pop `right` then `left`, push `left op right`
- `DUP`: duplicate top element
- `SWAP`: swap top two elements
- `JNZ <pc>`: pop `cond`; if `cond != 0` jump to instruction index `pc`
- `HALT`: stop execution normally

Print the top of the stack after `HALT` (or end of program), `"EMPTY"` if the stack is empty, `"ERR:LOOP"` if execution exceeds 1000 steps, or `"ERR"` on stack underflow / invalid instruction / out-of-bounds jump target.
