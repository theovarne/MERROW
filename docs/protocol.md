# Protocol Overview

## Overview

MERROW studies pre-sign immunity: an agent can reason and propose, but an independent authorization boundary decides whether a Solana transaction may reach wallet review. This document defines a target protocol, while [README](../README.md) distinguishes implemented prototypes from planned enforcement.

## Security Model

External content, tool output, model text and mutable agent memory are untrusted. Owner intent, policy and a safe-state baseline must be authenticated outside that context. The wallet remains the final external signing authority.

## Core Components

Sentinel observes untrusted ingress; Soul Integrity checks persistent state; Intent Firewall checks proposal-to-objective binding; Transaction Guard inspects the serialized Solana message; Simulation Gate asks RPC for an advisory result; the verdict engine emits a decision and Pawprint evidence.

## State

A safe checkpoint identifies an approved state root. Drift or missing proof yields QUARANTINE. The website's Nine Lives state is a deterministic demonstration, not verified memory.

## Policy

The [draft policy schema](../protocol/policy.schema.json) constrains programs, mints, writable accounts, value, slippage, expiry and simulation requirement. Real ownership/signature verification is planned.

## Transaction Lifecycle

`decode -> inspect -> normalize -> evaluate -> simulate (when required) -> verdict -> local receipt -> wallet review`. Unknown semantics must not be promoted to permission.

## Verdicts

ALLOW permits further wallet review. DENY rejects one action. QUARANTINE distrusts surrounding context or required evidence. RECOVER is a separate trusted operation after quarantine.

## Receipts, Quarantine and Recovery

[Pawprint receipts](pawprint-receipts.md) are local audit records. [Quarantine](quarantine.md) blocks use of suspect state. [Nine Lives](nine-lives.md) proposes restoration of a last known safe checkpoint.

## Current Status and Limitations

Browser UI, partial transaction parsing, optional public-RPC simulation and reference policy tests exist. Signed intent, authenticated state roots, complete decoder coverage and hard wallet enforcement do not. Lab graphics are not telemetry.
