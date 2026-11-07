# Verified source synchronization

The source snapshot matches the application used for the verified portal PDF repair and shared redesign. Source was restored to the existing repository by a checksum-verified manual workflow; unrelated historical documentation and security settings are preserved.

Production reference Worker version: `2d81ab28-9bfa-4d09-9192-71b9415c437a`.
Staging reference Worker version: `25a5b902-a236-48eb-9835-7fcfa942b2e8`.

The synchronization does not deploy, rotate secrets, change bindings, or write to the application database. The worker configurations and all application source and assets are included. SOURCE-MANIFEST.json maps each synchronized file to its SHA256 and Git blob hash for independent verification against the repository tree.
