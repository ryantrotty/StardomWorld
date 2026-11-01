# Project notes

- Before changing any UI (colours, fonts, buttons, focus, menus, rows, player bar, login, PPV), read `docs/DESIGN.md`. It is the master design reference; follow it, and record any new exception there.
- After UI changes, run `python3 scripts/audit_design.py` and mention any new findings.
- Injected JS lives in Kotlin raw strings: avoid `$` followed by a letter or `{`.
