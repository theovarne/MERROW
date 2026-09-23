# Nine Lives Recovery

Nine Lives is the proposed recovery path from a contaminated agent state. A checkpoint is a snapshot associated with a trusted state root; the last known safe state must be owner-approved independently of the compromised model.

```text
SAFE VII -> CURRENT VIII -> contamination detected
                         -> QUARANTINE -> RESTORE VII -> SAFE
```

Quarantine stops new authorization from the suspect context, retains evidence and selects a prior safe checkpoint. Recovery restores that state, rechecks owner policy and resumes only after independent approval. Replaying compromised memory or asking the same agent to certify itself is not recovery.

The website's Roman-numeral checkpoints and corruption button are deterministic **LAB SIMULATION**. They do not snapshot or restore a real agent. Snapshot signing, storage, replay protection and recovery authorization remain planned.
