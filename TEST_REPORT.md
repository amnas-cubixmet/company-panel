# Company Panel — Manual WhatsApp Migration

Updated: 2026-11-12

## Changes
- Staff success view shows readiness, Share on WhatsApp, Copy Setup Message, Regenerate Setup Link, Staff Profile, and Add Another Staff.
- Secure bearer URLs are not retained in React state or browser storage; manual user click fetches the invitation.
- Staff profile manual password setup and reset; removed provider delivery polling.
- WhatsApp Settings displays manual-only guidance, without Cloud API connect, template or automatic mode controls.
- Customers continue to use the existing secure portal manual sharing and copy link UI.
- Invoices allow manual invoice sharing and outstanding balance payment reminders; the Payments page also offers a reminder action.
- Customer consent copy reflects manual sharing only.

## Verification
- Company Panel CI initial branch run: lint, build, bundle, node regression tests and browser UI smoke checks succeeded (workflow 43167924784).
- Follow-up invoice/payment reminder UI commit is pending its new CI workflow.
- No production browser WhatsApp delivery has been verified; a draft is NOT a delivery confirmation.
- Public and Customer Website have no automatic WhatsApp provider integration changed by this migration.

## GitHub delivery
PR: https://github.com/amnas-cubixmet/company-panel/pull/131
Backend dependency: https://github.com/amnas-cubixmet/cubegears-backend/pull/80
Merge status: pending checks/verification.
