# B2B Email Strategy — Partnership Lead List

*Written July 15, 2026, alongside the staff-gated listmonk sync design
([spec](superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md)). This records
**why** partnership leads go on an email list and how the list is meant to be used, so the
cadence survives staff turnover and long gaps between sends.*

## Why a B2B list at all

B2B buying at schools, libraries, and non-profits is **seasonal and slow**. A lead who
inquires in July may have no budget until the school year starts, a grant lands, or Black
History Month planning begins. The list's job is not a "newsletter" — it is **staying
findable across long buying cycles** with a handful of well-timed sends per year, plus
**reactivation**: a lead that went quiet or `lost` gets one seasonal touch instead of staff
chasing individually.

At low lead volume, personal 1:1 email from staff beats broadcast every time. That is why
the list is **staff-gated**: only inquiries staff mark `qualified` or `won` are subscribed.
The list grows at the pace of the real pipeline, complaint risk stays near zero (protecting
the SPF/DKIM/DMARC work completed July 2026), and if broadcast never becomes worthwhile the
cost was one small hook.

## Seasonal send calendar (3–4 sends/year, not monthly)

| When | Theme | Audience notes |
|---|---|---|
| **August** | Back-to-school: curated grade-level lists; PO / tax-exempt process reminder | Institutional buyers |
| **Nov–Dec** | Black History Month prep: bulk-order windows, author-visit & event offerings | Schools plan BHM in December, not February |
| **Spring** | Summer-reading programs; fiscal-year-end budget spend-down | Libraries often must spend remaining budget before June 30 |
| *(Optional)* | Holiday / MLK Day community programming | Non-profits, grant-funded projects |

## Operating rules

- **Consent model**: staff-gated (subscribe on `qualified`/`won` only). Never auto-subscribe
  raw form submissions; never merge this list into the consumer newsletter.
- **Separate listmonk list** ("B2B Partners") on the instance at `mail.alkebulanimages.com`;
  campaign sends use the `send.updates.alkebulanimages.com` SES identity like the consumer
  newsletter.
- **Low frequency is the feature.** These are institutional inboxes; 3–4 relevant sends a
  year builds trust, monthly sends burn the list.
- Subscriber attributes carry `organizationName` and `inquiryType`
  (wholesale / institutional / nonprofit) for segmented sends.

## Related

- [PRD Phase 2/3 roadmap](PRD.md) — listmonk campaigns; Twenty CRM adoption trigger
- [Partnership landing pages spec](superpowers/specs/2026-06-26-partnership-landing-pages-design.md)
- Staff workflow: mark an inquiry `qualified` or `won` in **Admin → B2B → Partnership
  Inquiries** and the lead is added to the B2B list automatically (`crmSyncStatus` column
  shows the result).
