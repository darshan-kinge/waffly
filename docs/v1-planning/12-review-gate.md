# V1 SDK Review and Approval Gate

No production implementation begins until this checklist is approved. A disposable Meta contract test may be authorized separately.

## 1. Scope review

Included: server-side Meta authentication; typed template and seven basic-message methods; media operations; selected template management; typed responses/errors; webhook verification/parsing; and per-client/per-call phone numbers.

Excluded: database, queue, worker, scheduler, hosted API, issued API keys, tenants/projects, internal IDs, status store, template sync, webhook server, and dashboard.

## 2. Documentation verification

- [ ] Select language, supported runtimes, module format, and package name.
- [ ] Confirm pinned Graph version and support window.
- [ ] Exercise each selected endpoint with a Meta test asset.
- [ ] Capture request/response fixtures for every method.
- [ ] Approve template mutation schemas or defer mutation.
- [ ] Capture webhook fixtures and reconfirm raw-body signature handling.
- [ ] Build the current Meta error classification table.
- [ ] Confirm intended token types and permissions.
- [ ] Detect account-model phase on test assets.
- [ ] Record official URL, date, and Graph version for each operation.

## 3. Public API decisions

1. Language and package name.
2. Configuration and phone-number override shape.
3. Language-idiomatic exception versus result errors.
4. Raw-response escape hatch.
5. Pagination shape.
6. Whether template mutation enters V1.
7. Whether safe read retries are absent or opt-in.

## 4. Architecture review

- [ ] Stateless package accepted.
- [ ] Concrete Meta client accepted.
- [ ] Browser/mobile support excluded.
- [ ] Timeout/cancellation behavior approved.
- [ ] No automatic resend after ambiguous submission.
- [ ] Graph-version policy approved.
- [ ] Dependencies minimized and reviewed.

## 5. Security review

- [ ] Tokens and headers are redacted.
- [ ] Webhook verification uses exact raw bytes and constant-time comparison.
- [ ] Production Meta host cannot be redirected by ordinary configuration.
- [ ] Temporary media URLs are treated as secrets.
- [ ] Examples are server-side and environment-variable based.
- [ ] Package release permissions, provenance, and dependency scanning are defined.

## 6. Release acceptance

- Public methods and errors are documented.
- Live tests pass on the pinned version.
- Fixtures cover success, validation, auth, throttling, and malformed responses.
- Webhook helpers reject invalid/tampered payloads.
- Supported runtimes pass installation and type checks.
- Documentation assigns persistence, queueing, idempotency, webhook hosting, and status storage to the application.
- Tokens never appear in logs, errors, snapshots, or artifacts.

## 7. Risks

| Risk | Control |
|---|---|
| Meta schema changes | Pinned version, fixtures, changelog review, live release suite. |
| Duplicate sends after caller retry | No automatic send retry; document application ownership. |
| Token leakage | Server-only positioning and redaction tests. |
| Webhook misuse | Raw-body helper and framework integration guides. |
| SDK overgrowth | Closed V1 resources; no Graph proxy or hosted features. |
| Account-model transition | Typed optional identifiers and release-time review. |

## 8. Recommendation

Start with transport, typed errors, and one live-tested text send. Add webhook helpers, templates, remaining messages, and media in that order.
