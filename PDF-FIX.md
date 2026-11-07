# Portal PDF fix

The PDF endpoint used a raw-token-only regular expression that rejected dotted signed-v1 portal links before their signatures could be validated. The endpoint now delegates token validation to the existing secure portal resolver; invoice IDs retain their validation.

Six route-level regression tests cover original and signed-v1 links, inline PDF viewing, attachment downloads, tampered signatures, stored-hash rejection and customer ownership enforcement. All 25 portal and brand tests pass. The OpenNext production build completes; existing build configuration skips full type and lint checks. The build warns that this Next.js major version is outside its support window; no unrelated framework upgrade was attempted.

Production and staging were redeployed with variables and secret bindings preserved. Production current portal and both PDF actions return HTTP 200 without authentication. The document is 11,630 bytes with SHA256 26b88e5a3c2a38c84230ccc7c04967429bd58aab4425e9cc1b4ecafe99a1e69f. Actual browser preview and download clicks succeed. Unrelated customer invoices and stored token hashes remain inaccessible (404).

The previously supplied signed-v1 URL corresponds to the original credential, but the share now has a different token hash. Both earlier original and signed URLs have therefore been replaced; they have not expired. The current share has no expiry and is not revoked. No database records or credentials were changed during this fix, and deliberately replaced credentials were not reactivated.

A narrowly protected temporary read-only verification probe was removed from the final deployment; its URL now returns 404. The obsolete private source-upload object was checksum-verified and cleaned up.

This archive contains the updated full local app source, redesign and regression tests. The complete app source is now synchronized to the GitHub repository. SOURCE-MANIFEST.json records the verified file checksums.
