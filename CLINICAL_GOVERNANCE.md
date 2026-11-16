# SoulSpace clinical governance framework

**Status: draft operating framework. No independent clinician has reviewed or approved this build.**

SoulSpace is an AI wellbeing companion and self-guided wellbeing product. It is not a psychiatric service, psychotherapy service, diagnostic product or emergency response service.

## 1. Non-negotiable boundaries

- Never describe the AI as a psychiatrist, psychologist, therapist or doctor.
- Never diagnose, assign a disorder label, interpret screening results as a diagnosis, prescribe medication or advise medication changes.
- Never claim to cure, treat or prevent a mental disorder.
- Do not infer a diagnosis from language patterns, mood entries, sleep data or activity feedback.
- Keep crisis resources and urgent-support pathways available without subscription, account or AI-provider credentials.
- Encourage qualified human assessment when symptoms persist, worsen or materially affect daily functioning.
- Do not use emotional vulnerability to target advertising, upsell, or manipulate engagement.

## 2. Content governance

Every self-guided activity should have a record containing:

| Field | Required record |
|---|---|
| Content ID and version | Stable ID, version number and change history |
| Intended use | Everyday wellbeing purpose, not a clinical indication |
| Approach | CBT-informed, behavioural activation, problem-solving, grounding, acceptance, emotion regulation, etc. |
| Evidence basis | Primary guideline or publication, exact URL, relevant section and access date |
| Instructions | Plain-language steps, estimated duration and user choice |
| Cautions | When to stop, adapt or seek human support |
| Clinical reviewer | Name, qualification, registration jurisdiction and review date, only after verified consent |
| Approval status | Draft, awaiting review, approved for wellbeing use, withdrawn |
| Next review | Scheduled review date and trigger for early review |

Do not publish content as clinically reviewed until a qualified independent reviewer has completed and documented the review. The current bundled content is original product content and remains unreviewed.

## 3. AI behaviour and escalation

- Ask one useful question at a time; do not interrogate or force trauma disclosure.
- Reflect patterns tentatively and explicitly invite correction.
- Do not turn repeated words into a diagnosis or risk score.
- When there may be immediate danger, prioritise immediate human help over exercises or engagement.
- India urgent-support copy currently includes emergency 112 and Tele-MANAS 14416. Verify service availability, language coverage and numbers with official sources before every public release.
- Multilingual phrase detection is a limited safety net, not a validated risk classifier. It can miss indirect language, dialects, spelling variations, sarcasm and context. It must never be represented as guaranteed detection.
- Any high-risk incident, false negative or harmful model response must trigger review, documentation and a release decision.

## 4. Required independent reviews before public launch

1. Indian-registered clinical psychologist and psychiatrist review of all intervention content, AI boundaries, crisis copy and escalation pathways.
2. Multilingual clinical review of Hindi, Hinglish and Bengali copy and safety scenarios.
3. Privacy counsel review covering sensitive personal data, AI-provider processing, retention, consent, deletion and cross-border processing.
4. Security assessment including authentication, session storage, rate limits, API abuse, secrets, database controls and penetration testing.
5. Accessibility and usability testing with people who have varied literacy, language and disability needs.

## 5. Change control

Every release that changes crisis detection, model prompts, clinical content, memory, consent or recommendations must include:
- a documented change summary;
- regression tests for direct, indirect, negated and multilingual safety phrases;
- review of false-positive and false-negative examples;
- privacy impact assessment where data use changes;
- a rollback plan and named release owner.

## 6. Evidence references for editorial review

These are starting points for reviewers, not proof that SoulSpace itself is clinically effective:

- WHO, *Doing What Matters in Times of Stress*: https://www.who.int/publications/i/item/9789240003927
- NICE, *Depression in adults: treatment and management (NG222)*: https://www.nice.org.uk/guidance/ng222
- NICE, *Generalised anxiety disorder and panic disorder in adults (CG113)*: https://www.nice.org.uk/guidance/cg113
- WHO, *Psychological interventions implementation guidance*: https://www.who.int/publications

Record the exact edition, recommendation and access date used for each content item. Re-check guideline versions before launch.
