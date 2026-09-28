# Studionet integration checklist

Run only against stable GenLayer Studionet, chain ID 61999.

1. `genlayer network set studionet`.
2. Run `genlayer network info` and independently run `node scripts/assert-studionet.mjs`; both must resolve chain `61999`.
3. Deploy `contracts/intent_guard.py` and record the address and deployment transaction.
4. Create a mandate from wallet A and wait for finalization.
5. Revise it and prove revision 1 remains readable but cannot authorise a new action.
6. Evaluate a bounded matching action; wait for finalization and verify `FINISHED_WITH_RETURN`.
7. Read `get_decision` and verify owner, latest intent revision, action ID and complete canonical action.
8. Evaluate a contradictory action and confirm the guarded target send never occurs.
9. Evaluate an intentionally ambiguous action and confirm `UNCLEAR` fails closed.
10. Revoke the family and verify later evaluation reverts.
11. For a matching action, send a target-chain test transaction through the guarded provider and anchor its receipt.
12. Verify the receipt target chain equals the adjudicated target chain.
13. Demonstrate account mutation, transaction mutation and fee/gas mutation all abort before target send.
14. Measure representative and worst-bounded `evaluate` fees and record them in `LIVE_EVIDENCE.md`.

Do not substitute any preview/development GenLayer chain for these tests.
