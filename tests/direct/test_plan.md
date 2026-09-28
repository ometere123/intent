# Direct-mode contract coverage map

Executable tests now live in `test_intents.py` and `test_evaluation.py`. Run them with `pytest tests/direct -v` after installing `genlayer-test`.

Covered in source:

1. deployment rejects a chain other than 61999;
2. network identity reports Studionet 61999;
3. intent creation stores revision 1 and owner binding;
4. duplicate intent IDs revert;
5. revisions are immutable and latest revision advances;
6. owners have independent namespaces;
7. revocation blocks future revision;
8. writes reject a wrong chain even after deployment;
9. a matching consensus result is bound to the exact action and revision;
10. duplicate action IDs cannot be re-adjudicated;
11. revoked families cannot be evaluated;
12. negative decisions cannot receive execution receipts;
13. positive decisions can receive one receipt only;
14. stale revisions cannot authorise new actions;
15. contract recomputation rejects an action ID that does not hash the canonical action JSON;
16. receipt chain must equal the adjudicated target chain.

Additional live/hostile cases to preserve when running on the installed GenLayer toolchain:

- expiry boundaries using transaction time;
- malformed/oversized JSON and text budgets;
- mocked LLM malformed output and validator disagreement;
- prompt-injection text inside decoded summaries remains inert evidence;
- finality and failed GenVM execution never release a target transaction.
