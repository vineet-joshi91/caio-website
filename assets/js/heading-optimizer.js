// CAIO Heading Optimizer
// Goal: Ensure each page has exactly one strong <h1>
// and consistent <h2>/<h3> scaffolding for SEO + clarity
(function () {
  // Map page names -> heading plan
  var headingBlueprint = {
    "index.html": {
      h1: "CAIO — Your Cognitive AI Officer for Startups & SMBs",
      h2: [
        { text: "Why CAIO Matters for Small Teams", matchHint: "Why CAIO" },
        { text: "How CAIO Works", matchHint: "How CAIO" },
        { text: "What You Get", matchHint: "What you get" }
      ]
    },
    "brains.html": {
      h1: "The Brains Behind CAIO — CFO / COO / CHRO / CMO / CPO",
      h2: [
        {
          text: "What Each AI Brain Does for Your Business",
          matchHint: "The Brains Behind CAIO"
        }
      ],
      h3: [
        {
          selectorHint: "CFO",
          rewrite: "CFO Brain — Financial Clarity Without a Full-Time CFO"
        },
        {
          selectorHint: "COO",
          rewrite: "COO Brain — Operational Control and Execution"
        },
        {
          selectorHint: "CHRO",
          rewrite: "CHRO Brain — People, Policy, Culture"
        },
        {
          selectorHint: "CMO",
          rewrite: "CMO Brain — Growth, Positioning, Demand"
        },
        {
          selectorHint: "CPO",
          rewrite: "CPO Brain — Product Direction and Roadmap"
        }
      ]
    },
    "pricing.html": {
      h1: "CAIO Pricing — Start Free, Scale When You’re Ready",
      h2: [
        { text: "Choose Your Plan", matchHint: "Pricing" },
        { text: "Demo (Free Forever)", matchHint: "Demo" },
        { text: "Pro / Pro+ for Founders", matchHint: "Pro" },
        { text: "Premium for Serious Teams", matchHint: "Premium" }
      ]
    },
    "about.html": {
      h1: "About CAIO — Your AI Officer for SMB Growth",
      h2: [
        { text: "Why We Built CAIO for Founders", matchHint: "About CAIO" },
        { text: "What Makes CAIO Different", matchHint: "What Makes" },
        {
          text: "Who We Serve (Startups & SMBs)",
          matchHint: "Who We Serve"
        }
      ]
    },
    "how-it-works.html": {
      h1: "How CAIO Works — From Document to Decision in Minutes",
      h2: [
        {
          text: "Step 1: Upload Your File",
          matchHint: "How CAIO Works"
        },
        {
          text: "Step 2: CAIO Thinks Like 5 CXOs",
          matchHint: "Step"
        },
        {
          text: "Step 3: You Get Actionable Decisions",
          matchHint: "Actionable"
        }
      ]
    },
    "features.html": {
      h1:
        "CAIO Features — CFO, COO, CHRO, CMO and CPO Intelligence in One Place",
      h2: [
        {
          text: "One Dashboard. All Decisions.",
          matchHint: "Features"
        },
        {
          text: "Who Uses CAIO?",
          matchHint: "Who Uses"
        },
        {
          text: "Why This Beats Generic Chatbots",
          matchHint: "Why This Beats"
        }
      ]
    },
    "cxo-vs-caio.html": {
      h1: "CAIO vs Hiring a CFO / COO / CHRO / CMO / CPO",
      h2: [
        {
          text: "Why Founders Can't Afford 5 CXOs",
          matchHint: "Why"
        },
        {
          text: "Where Humans Still Win",
          matchHint: "humans"
        },
        {
          text: "Where CAIO Is Unbeatable",
          matchHint: "CAIO wins"
        }
      ]
    }
  };

  // Utility: normalize filename from URL
  function getPageName() {
    // e.g. "https://caioinsights.com/pricing.html?utm=..." → "pricing.html"
    var path = window.location.pathname.split("/").pop();
    if (!path || path === "") {
      // root path like "/", treat as index.html
      path = "index.html";
    }
    return path;
  }

  // Step 1: Ensure exactly one <h1>, and make it correct
  function ensureH1(blueprint) {
    if (!blueprint || !blueprint.h1) return;

    var existingH1s = document.querySelectorAll("h1");

    if (existingH1s.length === 0) {
      // No H1 exists → create one near top of main content
      var mainEl =
        document.querySelector("main") ||
        document.querySelector("[role='main']") ||
        document.body;

      var h1 = document.createElement("h1");
      h1.textContent = blueprint.h1;
      h1.classList.add("page-headline", "seo-h1");
      mainEl.insertBefore(h1, mainEl.firstChild);
    } else {
      // H1 exists → rewrite the first one with our preferred text
      // and downgrade extras to H2 to maintain validity.
      existingH1s.forEach(function (node, idx) {
        if (idx === 0) {
          node.textContent = blueprint.h1;
          node.classList.add("page-headline", "seo-h1");
        } else {
          var h2 = document.createElement("h2");
          h2.textContent = node.textContent;
          node.replaceWith(h2);
        }
      });
    }
  }

  // Step 2: Normalize / enhance <h2> sections if they exist
  // We won't force-create every H2 from scratch (to avoid layout break),
  // but we WILL rewrite obvious headings to be more startup/SMB focused.
  function refineH2s(blueprint) {
    if (!blueprint || !Array.isArray(blueprint.h2)) return;

    var h2s = Array.from(document.querySelectorAll("h2"));
    blueprint.h2.forEach(function (plan) {
      var match = h2s.find(function (h) {
        return h.textContent
          .trim()
          .toLowerCase()
          .includes(plan.matchHint.toLowerCase());
      });

      if (match) {
        match.textContent = plan.text;
        match.classList.add("section-headline", "seo-h2");
      }
    });
  }

  // Step 3: Refine H3s (mainly for brains.html)
  function refineH3s(blueprint) {
    if (!blueprint || !Array.isArray(blueprint.h3)) return;

    var h3s = Array.from(document.querySelectorAll("h3"));
    blueprint.h3.forEach(function (plan) {
      var match = h3s.find(function (h) {
        return h.textContent
          .trim()
          .toLowerCase()
          .includes(plan.selectorHint.toLowerCase());
      });

      if (match) {
        match.textContent = plan.rewrite;
        match.classList.add("sub-headline", "seo-h3");
      }
    });
  }

  // Step 4: Fallback for new pages you add later
  // If the page isn't in headingBlueprint, we still enforce "one h1"
  function fallbackStructure() {
    var existingH1s = document.querySelectorAll("h1");
    if (existingH1s.length === 0) {
      // Create a generic H1 from <title> tag
      var titleTag = document.title || "CAIO — Cognitive AI Officer";

      var mainEl =
        document.querySelector("main") ||
        document.querySelector("[role='main']") ||
        document.body;

      var h1 = document.createElement("h1");
      h1.textContent = titleTag;
      h1.classList.add("page-headline", "seo-h1", "auto-generated-h1");
      mainEl.insertBefore(h1, mainEl.firstChild);
    } else {
      // More than 1 H1? Downgrade extras.
      existingH1s.forEach(function (node, idx) {
        if (idx === 0) return;
        var h2 = document.createElement("h2");
        h2.textContent = node.textContent;
        node.replaceWith(h2);
      });
    }
  }

  // --- Execute ---
  var pageName = getPageName();
  var blueprint = headingBlueprint[pageName];

  if (blueprint) {
    ensureH1(blueprint);
    refineH2s(blueprint);
    refineH3s(blueprint);
  } else {
    fallbackStructure();
  }
})();
