---
{
  "version": "alpha",
  "name": "ShareLens Pixel Shop Operate",
  "surface": "Operate",
  "colors": {
    "primary": "#17172b",
    "secondary": "#51485c",
    "accent": "#ef7181",
    "baseBlue": "#0052ff",
    "paper": "#fff1b5",
    "panel": "#f4d46c",
    "inset": "#23264c",
    "line": "#34254c",
    "warning": "#ffd84f",
    "success": "#6dbb62",
    "danger": "#d84c58",
    "disabled": "#7d7890"
  },
  "typography": {
    "body": {
      "fontFamily": "Lucida Console, Courier New, monospace",
      "fontSize": "12px",
      "lineHeight": 1.5
    },
    "heading": {
      "fontFamily": "Lucida Console, Courier New, monospace",
      "fontSize": "24px",
      "fontWeight": 700,
      "lineHeight": 1.15
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "6px",
    "md": "10px",
    "lg": "16px",
    "section": "24px"
  },
  "rounded": {
    "none": "0px",
    "pixel": "1px"
  },
  "components": {
    "primary-action": {
      "textColor": "#ffffff",
      "backgroundColor": "{colors.accent}",
      "height": "44px",
      "rounded": "{rounded.pixel}"
    },
    "buy-guard-ok": {
      "textColor": "#ffffff",
      "backgroundColor": "{colors.success}",
      "height": "44px",
      "rounded": "{rounded.pixel}"
    },
    "buy-guard-warn": {
      "textColor": "#30250a",
      "backgroundColor": "{colors.warning}",
      "height": "44px",
      "rounded": "{rounded.pixel}"
    },
    "buy-guard-stop": {
      "textColor": "#ffffff",
      "backgroundColor": "{colors.danger}",
      "height": "44px",
      "rounded": "{rounded.pixel}"
    },
    "buy-guard-disabled": {
      "textColor": "#ffffff",
      "backgroundColor": "{colors.disabled}",
      "height": "44px",
      "rounded": "{rounded.pixel}"
    },
    "panel": {
      "textColor": "{colors.primary}",
      "backgroundColor": "{colors.panel}",
      "rounded": "{rounded.none}"
    }
  },
  "provenance": {
    "sources": [
      {
        "source": "ShareLens/app/page.tsx",
        "hash_unavailable_reason": "Project source is untracked in the parent snapshot; provenance is path-bound for this local review.",
        "transformation": "Operate surface: instrument selection and execution station remain primary; diagnostic panels move below."
      },
      {
        "source": "ShareLens/app/globals.css + reff.jpg",
        "hash_unavailable_reason": "Project source and user attachment are local review inputs; hashes will be recorded when the project snapshot is promoted.",
        "transformation": "Translate the reference's warm shop frame, cyan preview, hard navy outlines, and semantic row colors into original ShareLens tokens."
      },
      {
        "source": "ShareLens/OPEN_DESIGN_BRIEF.md",
        "hash_unavailable_reason": "New local brief created for this review; hash will be recorded when the project snapshot is promoted.",
        "transformation": "Reference composition translated into original ShareLens structure; no brand or asset cloning."
      }
    ],
    "extracted_on": "2026-09-09",
    "model_route": {
      "declared": "Local Creator OS design_engine workflow; user-supplied reff.jpg analyzed as a style reference; no OpenDesign dependency.",
      "attestation": {
        "status": "unavailable",
        "reason": "This is a local contract and verification workflow, not a model generation run."
      }
    },
    "human_verdict": "pending"
  },
  "accessibility_targets": [
    "44px minimum interactive controls",
    "Visible keyboard focus",
    "Reduced motion support",
    "Desktop and mobile without horizontal overflow",
    "Disabled BUY states remain visually and semantically disabled"
  ],
  "constraints": {
    "do": [
      "Keep stock list, preview and Buy/Sell Station in the primary row",
      "Use Base Blue as the primary visual anchor",
      "Keep provenance and freshness visible below the decision surface",
      "Keep safety gates fail-closed"
    ],
    "dont": [
      "Do not create a hero or equal feature-card grid",
      "Do not change trade calldata, wallet signing, geo or attribution logic",
      "Do not add Copy contract controls",
      "Do not invent market data or claim production trading readiness"
    ]
  }
}
---

## Overview

ShareLens is an **Operate** surface: the user selects an instrument, inspects a
live reference-versus-pool decision, and only then may request a manually reviewed
quote. Density and glanceable state beat marketing composition.

## Colors

Base Blue is the main visual anchor for the preview console and active controls.
The warm wallet strip is a deliberate status band. Green/yellow/red are reserved
for Premium Guard semantics; disabled and stale states are muted rather than
misleadingly actionable.

## Typography

A local monospace stack reinforces the shop-window terminal language and keeps
numbers aligned. Headings remain compact so the stock list, preview and station
stay visible together.

## Layout

Desktop keeps three zones in one primary row: stock list, preview/stats, and
Buy/Sell Station. Dividend Lens and Premium Guard sit below as supporting HUD
panels. At mobile widths the zones stack in decision order without horizontal
overflow.

## Elevation & Depth

Use pixel borders, inset panels and restrained hard shadows. Avoid blur,
glassmorphism and large decorative gradients.

## Shapes

Use square/pixel corners and visible bevels. Every button, input, link and
disclosure target must remain at least 44px high.

## Components

The BUY action exposes Premium Guard state directly. Approval and swap controls
remain separate manual steps. Verify addresses stay collapsed below instruments.
Wallet, geo, attribution, quote freshness and receipt checks remain safety
boundaries, not decorative UI states.

## Do's and Don'ts

Do translate the reference into original ShareLens hierarchy and pixel language.
Do not clone proprietary branding, artwork, logos or exact assets. Do not infer
human visual approval from automated checks; the contract remains pending until
P'Maeo reviews the rendered result.
