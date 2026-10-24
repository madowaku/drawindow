# v0.9 distribution options — decision notes, no publication

| Option | Appropriate use | Outstanding evidence |
|---|---|---|
| Local developer preview | Human pilot and controlled device checks | Actual independent people and hardware |
| itch.io browser ZIP | Easy exploratory sharing after a first download | Real iframe/mobile/audio checks; complete redistribution notices; cannot promise offline installation from iframe |
| Standalone HTTPS installable PWA | Offline-first target after successful first cache/install | Cold offline launch, upgrade/recovery and platform-specific installation on physical devices |
| Paid download/store wrapper | Potential future commercial release | Human quality gate, final asset/license audit, store rules/fees/device packaging; separately authorize release |

Prefer local pilot first, then one clearly described distribution surface. Bundling the model removes per-recognition API billing and image-upload dependence, but first download and storage remain material. Neither successful build nor an archive proves offline cold start or commercial clearance.

Current recommendation is a draft/pilot, not a release declaration. See LICENSE_AUDIT_v09.md for known rights and unresolved packaging/reference notices. No store account, fee, publication, deployment or purchase is initiated by these notes.
