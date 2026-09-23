Merrow - Solana static deployment

This project is a path-corrected, Solana-native static migration of the original Merrow page. The original source directory remains unchanged.

## Structure

- index.html - terminal-style Merrow site, Solana documentation, roadmap embed, transaction gate, Infection Lab, Nine Lives, Policy Builder, Threat Network, local terminal, and Pawprint Receipts.
- assets/css/ - original visual styles with only local font path correction.
- assets/iframes/ - Solana roadmap and protocol paper.
- assets/fonts/ - original Tamzen, GothicByte, and arcade fonts.
- assets/media/ - original X SVG and the Pump.fun official favicon/icon.
- favicon/ - original Merrow favicon.

The site is intentionally plain HTML/CSS/JS and deploys directly on Vercel without a build step. `assets/js/merrow-system.js` owns the shared browser state, event log, Proof Inspector, policy compiler, transaction decisions, infection/Threat Network demo, recovery, terminal, and receipt history. Receipts are local session data only.

The Infection Lab, checkpoint corruption/recovery, and Threat Network are explicitly LAB SIMULATION modules. They do not claim live mainnet incidents.

The transaction gate is explicitly a prototype. It parses serialized Solana transaction bytes locally and can request public Solana RPC `simulateTransaction` through the restricted same-origin `api/rpc.js` bridge. This bridge permits only `getHealth` and `simulateTransaction`; it cannot sign, send, or transfer. A deterministic test vector uses LAB SIMULATION, never RPC. The prototype does not verify a signed owner objective or signed memory baseline, never requests or stores private keys, and never signs automatically.
