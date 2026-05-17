import { defineConfig } from "vitepress";

export default defineConfig({
  title: "HireShield",
  description:
    "Open-source job-posting fraud detector — heuristics + LLM for trust scoring without accusing employers.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  base: "/hireshield/",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/hireshield/logo.svg" }],
    ["meta", { name: "theme-color", content: "#f59e0b" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "HireShield Docs" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Detect fraudulent, ghost, and low-trust job postings with deterministic NLP heuristics fused with an LLM.",
      },
    ],
  ],
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "HireShield",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/api" },
      { text: "ADRs", link: "/adr/" },
      {
        text: "v0.1",
        items: [
          { text: "Changelog", link: "https://github.com/gh63/hireshield/releases" },
          {
            text: "Contributing",
            link: "https://github.com/gh63/hireshield/blob/main/CONTRIBUTING.md",
          },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Heuristics", link: "/guide/heuristics" },
            { text: "Adding a heuristic", link: "/guide/adding-a-heuristic" },
            { text: "Deployment", link: "/guide/deployment" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "API", link: "/reference/api" },
            { text: "Configuration", link: "/reference/configuration" },
          ],
        },
      ],
      "/adr/": [
        {
          text: "Architecture Decisions",
          items: [
            { text: "Index", link: "/adr/" },
            {
              text: "0001 — Heuristics-first scoring",
              link: "/adr/0001-heuristics-first-scoring",
            },
            {
              text: "0002 — Never accuse",
              link: "/adr/0002-never-accuse-framing",
            },
            {
              text: "0003 — Contract-first API",
              link: "/adr/0003-contract-first-api",
            },
            {
              text: "0004 — Single-process production",
              link: "/adr/0004-monolithic-single-port",
            },
            {
              text: "0005 — Postgres + Drizzle",
              link: "/adr/0005-postgres-drizzle",
            },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/gh63/hireshield" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 HireShield contributors",
    },
    search: {
      provider: "local",
    },
    editLink: {
      pattern: "https://github.com/gh63/hireshield/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
