# SoulSpace v0.9.0 build report

## Release intent
This is a pre-launch candidate source build, not a production-ready or clinically validated product.

## Changes in v0.9.0
- Added companion response-language preferences: English, Hinglish, Hindi and Bengali.
- Language choice is sent with each AI request and translated into a constrained server-side instruction. The rest of the product interface remains English.
- Added limited Hindi/Hinglish/Bengali phrase coverage to client and server urgent-support keyword checks, plus common explicit negation handling.
- Localised the urgent-support dialog for English, Hinglish, Hindi and Bengali while retaining India emergency numbers 112 and Tele-MANAS 14416.
- Added user feedback on activities (helpful / not for me). These preferences remain on the device, can be reset, and adjust the order of future content recommendations.
- Personalised Home recommendations using the latest mood check-in and activity feedback.
- Removed the arbitrary percentage-based progress score; the Home screen now shows completed activity count instead.
- Added a clinical governance framework and a transparent commercial model document with indicative, unvalidated pricing hypotheses and explicit payment launch blockers.
- Updated privacy disclosures for companion language and activity feedback.
- Refined preference and feedback controls, responsive layout and reduced-motion support.
- Updated service-worker cache and package version to 0.9.0.

## Verification performed
- All frontend and backend JavaScript syntax checks: passed.
- Backend integration suite: 52/52 checks passed.
- Emotional discovery and recommendation tests: 15/15 passed.
- Psychology-informed content and clinical boundary tests: run separately by the integration suite.
- Multi-turn conversation reflection tests: 8/8 passed.
- Multilingual companion and crisis-copy tests: 15 assertions passed.
- ZIP archive integrity: checked after packaging.

## Important limitations
- The AI companion still requires a valid server-side Anthropic API key and model ID. No live provider call was made in this build.
- Hindi, Hinglish and Bengali support is limited to companion replies and urgent-support copy; the full app UI, content catalogue and guided activities are not fully translated.
- Multilingual crisis keyword patterns are limited heuristics. They are not a validated risk classifier, cannot guarantee detection and require independent multilingual clinical review.
- Activity feedback and language preference are stored locally; feedback does not sync to an account in this version.
- Conversation continuity across sessions relies on the user explicitly enabling conversation memory and signing in. This stores chat history, not a clinically reviewed longitudinal profile.
- No independent clinical psychologist/psychiatrist review, validation study, legal review, privacy impact assessment, security audit or penetration test has been completed.
- No subscription checkout or payment provider is connected. Pricing in `COMMERCIAL_MODEL.md` is a market-testing hypothesis, not an active offer.
- No licensed audio/video catalogue is bundled. The current ambient sounds are generated locally.
- No browser end-to-end test, native iOS/Android build, store submission or real-device accessibility test is claimed.

## Release recommendation
Use this build for internal product review and supervised testing only. Do not launch publicly or make clinical efficacy claims until the launch blockers in `DEPLOYMENT_CHECKLIST.md` and `CLINICAL_GOVERNANCE.md` have been completed.
