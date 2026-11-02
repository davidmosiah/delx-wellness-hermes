# Isolated profile entrypoint regression harness

Run by the existing `npm test` suite after TypeScript build. No additional CI matrix or workflow is introduced. The wrapper explicitly runs this harness on Linux only; native Windows/macOS filesystem behavior is not claimed. Existing CI uses Node22 on Ubuntu. The harness selects the available stable/experimental Node permission flag and fails clearly if permission support is missing.

61 scenarios:57 negative actual CLI/API installer/uninstaller cases verify controlled application rejection and unchanged fake directory/file/symlink snapshots;4 positive controls verify Unicode/custom dry-install and real uninstall backup/removal. All test data is in a newly created temporary subtree, with a separate fake HOME per case. Tested processes have filesystem writes confined to their case, no subprocess permission, no inherited tokens/provider environment, and a network-denial preload. The successful harness removes only its own mkdtemp root; failing runs retain synthetic data for diagnosis.

Actual positive install-write already runs in the preexisting suite. It is not repeated inside this stricter harness because Node fs.cp checks ancestor metadata beyond the per-case read boundary. We do not loosen filesystem permissions to make that control pass.

These checks are not a race-proof sandbox assurance, native OS matrix, or test of the whole Hermes agent. Caller-authorized custom paths and operator-controlled HOME/.hermes relocation remain explicit trust boundaries.

Node22.23.4 documents stable `--permission` (since22.13.0): https://nodejs.org/docs/latest-v22.x/api/permissions.html . The permission model is an accidental-misuse safeguard for trusted code, not containment of malicious code; symlinks may cross its boundary. This harness creates symlinks only between paths inside its own fake case tree and does not claim a malicious-code sandbox.
