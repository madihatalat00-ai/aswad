/* Solicitor's Desk — a client-side legal draft review tool.
 *
 * Acting as an experienced solicitor, it:
 *   1. proof-reads the draft,
 *   2. flags grammatical errors,
 *   3. flags punctuation errors,
 *   4. only SUGGESTS changes — nothing is applied without the user's authorization,
 *   5. suggests new grounds of challenge,
 *   6. suggests refinements to grounds already pleaded,
 *   7. suggests new reliefs and refinements to reliefs already sought.
 *
 * Rider honoured: purely STYLISTIC grammar/punctuation changes the user accepts
 * are capped at 20% of the draft. Corrections of genuine grammatical and
 * punctuation ERRORS are always permitted and do not count against that cap.
 *
 * Everything runs in the browser; no draft ever leaves the device. */
(function () {
  "use strict";

  var THEME_KEY = "solicitorsdesk.theme";

  // ---------- DOM ----------
  var els = {
    draft: document.getElementById("draftInput"),
    wordCount: document.getElementById("wordCount"),
    charCount: document.getElementById("charCount"),
    reviewBtn: document.getElementById("reviewBtn"),
    clearBtn: document.getElementById("clearBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    themeToggle: document.getElementById("themeToggle"),
    budgetMode: document.getElementById("budgetMode"),

    reviewEmpty: document.getElementById("reviewEmpty"),
    tabs: document.querySelectorAll(".tab"),
    panes: document.querySelectorAll(".tab-pane"),

    budgetPct: document.getElementById("budgetPct"),
    budgetFill: document.getElementById("budgetFill"),
    budgetBar: document.querySelector(".budget-bar"),

    proofFilters: document.getElementById("proofFilters"),
    findingsList: document.getElementById("findingsList"),
    proofNone: document.getElementById("proofNone"),
    acceptAllErrors: document.getElementById("acceptAllErrors"),
    resetDecisions: document.getElementById("resetDecisions"),

    countProof: document.getElementById("count-proof"),
    countGrounds: document.getElementById("count-grounds"),
    countReliefs: document.getElementById("count-reliefs"),

    groundsPresent: document.getElementById("groundsPresent"),
    groundsPresentNone: document.getElementById("groundsPresentNone"),
    groundsPresentCount: document.getElementById("groundsPresentCount"),
    groundsNew: document.getElementById("groundsNew"),
    groundsNewCount: document.getElementById("groundsNewCount"),

    reliefsPresent: document.getElementById("reliefsPresent"),
    reliefsPresentNone: document.getElementById("reliefsPresentNone"),
    reliefsPresentCount: document.getElementById("reliefsPresentCount"),
    reliefsNew: document.getElementById("reliefsNew"),
    reliefsNewCount: document.getElementById("reliefsNewCount"),

    copyReport: document.getElementById("copyReport"),
    downloadReport: document.getElementById("downloadReport"),
    copyRevised: document.getElementById("copyRevised"),
    downloadRevised: document.getElementById("downloadRevised"),
    reportBody: document.getElementById("reportBody"),

    toast: document.getElementById("toast"),
  };

  // ---------- State ----------
  var state = {
    text: "",           // the draft under review (never mutated in place)
    findings: [],       // proofreading findings
    decisions: {},      // findingId -> "accept" | "reject"
    grounds: null,      // { present:[], suggested:[] }
    reliefs: null,      // { present:[], suggested:[] }
    proofFilter: "all",
    budgetMode: "chars",
    reviewed: false,
  };

  var toastTimer = null;

  // =====================================================================
  //  Knowledge base — grounds of challenge & reliefs (common-law / writ)
  // =====================================================================

  // Each ground: keywords (for detecting whether it is already pleaded),
  // a plain-language summary, a "refine" note (how to strengthen it when it
  // is already present) and a "draft" note (how to introduce it when it is not).
  var GROUNDS = [
    {
      id: "illegality",
      name: "Illegality / error of law",
      keywords: ["error of law", "illegal", "unlawful", "contrary to law", "misdirect", "misconstrued", "misinterpret", "wrong in law"],
      summary: "The decision-maker misunderstood or misapplied the law that governs the power exercised.",
      refine: "Pin the illegality to a specific statutory provision and identify the precise legal error — quote the words the authority misread and state the correct construction.",
      draft: "Plead that the impugned decision proceeds on an error of law: identify the enabling provision, state how it was misconstrued, and show the decision could not have been reached on a correct reading."
    },
    {
      id: "ultravires",
      name: "Ultra vires / want of power",
      keywords: ["ultra vires", "without jurisdiction", "no power", "beyond the powers", "excess of authority", "not empowered", "want of jurisdiction"],
      summary: "The authority acted outside the four corners of the power conferred on it.",
      refine: "Set out the source of the power and demonstrate, provision by provision, that the act complained of falls outside it or offends an express limit or condition.",
      draft: "Consider an ultra vires ground: identify the enabling statute/rule, and show the act exceeds the express or necessarily implied limits of the power conferred."
    },
    {
      id: "irrationality",
      name: "Irrationality / Wednesbury unreasonableness",
      keywords: ["irrational", "unreasonable", "wednesbury", "perverse", "no reasonable authority", "arbitrary", "capricious"],
      summary: "The decision is so unreasonable that no reasonable authority, properly directing itself, could have reached it.",
      refine: "Marshal the facts that make the outcome indefensible; contrast the decision with the material before the authority to show the conclusion does not follow.",
      draft: "Consider pleading Wednesbury unreasonableness/irrationality where the outcome defies logic or accepted moral standards on the material before the authority."
    },
    {
      id: "proceduralimpropriety",
      name: "Procedural impropriety",
      keywords: ["procedural impropriety", "procedure", "mandatory procedure", "failed to follow", "prescribed procedure", "procedural requirement"],
      summary: "The authority failed to observe a mandatory procedural requirement or the duty of fairness.",
      refine: "Distinguish the mandatory step that was skipped from directory ones, and show prejudice flowing from the non-observance.",
      draft: "Consider procedural impropriety: identify the statutory/regulatory procedure that binds the authority and the specific step omitted."
    },
    {
      id: "naturaljustice",
      name: "Breach of natural justice / audi alteram partem",
      keywords: ["natural justice", "audi alteram", "right to be heard", "fair hearing", "opportunity of hearing", "show cause", "without hearing", "not heard"],
      summary: "The affected party was condemned without a fair opportunity to be heard.",
      refine: "Show what the petitioner would have said had a hearing been granted, establishing that the breach was material and not merely technical.",
      draft: "Plead denial of audi alteram partem: state that no (or no adequate) notice or opportunity to be heard was afforded before the adverse decision was taken."
    },
    {
      id: "bias",
      name: "Bias / nemo judex in causa sua",
      keywords: ["bias", "biased", "nemo judex", "interested", "predetermined", "predisposition", "apparent bias", "real likelihood"],
      summary: "The decision-maker was, or reasonably appeared to be, an interested judge in their own cause.",
      refine: "Apply the correct test (real likelihood / reasonable apprehension of bias) and set out the objective facts a fair-minded observer would weigh.",
      draft: "Consider a bias ground where the decision-maker had an interest or pre-judged the matter — plead the objective facts founding a reasonable apprehension of bias."
    },
    {
      id: "reasons",
      name: "Failure to give reasons",
      keywords: ["failure to give reasons", "no reasons", "non-speaking", "unreasoned", "did not disclose reasons", "speaking order", "reasoned order"],
      summary: "The order is non-speaking; no or inadequate reasons were furnished for an adverse decision.",
      refine: "Tie the duty to give reasons to the statutory scheme and the seriousness of the consequences, and show the absence of reasons frustrates effective challenge.",
      draft: "Consider pleading failure to give reasons where the impugned order is non-speaking, defeating the petitioner's ability to know why they lost and to seek review."
    },
    {
      id: "relevantconsiderations",
      name: "Relevant / irrelevant considerations",
      keywords: ["irrelevant consideration", "relevant consideration", "failed to consider", "took into account", "ignored", "extraneous"],
      summary: "The authority took account of legally irrelevant matters or ignored legally relevant ones.",
      refine: "List each mandatory relevant factor ignored and each impermissible factor relied upon, anchored to the statutory purpose.",
      draft: "Consider the ground that the authority failed to consider mandatory relevant factors, or was influenced by extraneous/irrelevant ones."
    },
    {
      id: "fettering",
      name: "Fettering of discretion",
      keywords: ["fetter", "fettered", "rigid policy", "mechanically applied", "without applying mind", "blanket policy", "inflexible"],
      summary: "The authority shut out the exercise of its own discretion by rigidly applying a policy or another's dictation.",
      refine: "Show the discretion was individual and mandatory, and that the authority treated a policy as conclusive rather than as guidance.",
      draft: "Consider a fettering-of-discretion ground where the authority applied a rigid policy or acted under dictation without applying its own mind to the case."
    },
    {
      id: "malafides",
      name: "Mala fides / improper purpose",
      keywords: ["mala fide", "mala fides", "bad faith", "improper purpose", "collateral purpose", "ulterior", "colourable"],
      summary: "The power was exercised in bad faith or for a purpose other than that for which it was conferred.",
      refine: "Mala fides must be pleaded with particulars — set out the specific facts, dates and actors; avoid bald assertions the court will disregard.",
      draft: "Consider an improper-purpose/mala fides ground, but plead it only with concrete particulars, as courts require specific facts, not bare allegations."
    },
    {
      id: "legitimateexpectation",
      name: "Legitimate expectation",
      keywords: ["legitimate expectation", "representation", "promise", "settled practice", "assurance", "past practice"],
      summary: "A clear representation or settled practice founded an expectation the authority frustrated without justification.",
      refine: "Identify the clear and unqualified representation or consistent practice, the reliance, and the absence of an overriding public interest for departing from it.",
      draft: "Consider legitimate expectation where a clear promise or settled practice was resiled from without a lawful, proportionate justification."
    },
    {
      id: "proportionality",
      name: "Proportionality",
      keywords: ["proportion", "disproportionate", "excessive", "least restrictive", "balancing", "not proportionate"],
      summary: "The measure was more intrusive than necessary to achieve its legitimate aim.",
      refine: "Structure the plea across the recognised limbs — legitimate aim, rational connection, necessity (least intrusive means) and fair balance.",
      draft: "Where fundamental rights or EU/Convention-style standards apply, consider a proportionality ground structured across legitimate aim, necessity and fair balance."
    },
    {
      id: "fundamentalrights",
      name: "Violation of fundamental / constitutional rights",
      keywords: ["fundamental right", "article 14", "article 19", "article 21", "equality", "discriminat", "constitutional right", "human right", "convention right", "life and liberty"],
      summary: "The action infringes guaranteed constitutional or fundamental rights (e.g. equality, liberty, non-discrimination).",
      refine: "Name the specific right, the class it protects, and demonstrate the infringement — for equality, identify the differentia and the absence of a rational nexus to the object.",
      draft: "Consider a fundamental-rights ground: identify the specific guaranteed right engaged and show a direct, non-justified infringement."
    },
    {
      id: "jurisdictionalerror",
      name: "Jurisdictional error / error on the face of record",
      keywords: ["jurisdictional error", "error apparent", "face of the record", "assumed jurisdiction", "exceeded jurisdiction", "want of jurisdiction"],
      summary: "The authority wrongly assumed or exceeded jurisdiction, or the record discloses a manifest legal error.",
      refine: "Distinguish a jurisdictional error (going to power) from a mere error within jurisdiction, and show the error is apparent without extended argument.",
      draft: "Consider whether the error is jurisdictional (going to the authority's power to act at all) or apparent on the face of the record — a well-recognised head of certiorari."
    },
    {
      id: "delay",
      name: "Vested rights / retrospectivity",
      keywords: ["retrospective", "retroactive", "vested right", "accrued right", "pending proceeding"],
      summary: "The measure operates retrospectively to impair accrued or vested rights without clear authority.",
      refine: "Show the right had crystallised before the measure and that the enabling provision does not clearly authorise retrospective operation.",
      draft: "Consider a retrospectivity/vested-rights ground where the measure disturbs rights that had already accrued, absent clear statutory authority to do so."
    }
  ];

  var RELIEFS = [
    {
      id: "certiorari",
      name: "Quashing order / certiorari",
      keywords: ["quash", "certiorari", "set aside", "set-aside", "strike down", "declared void", "void ab initio"],
      summary: "An order quashing the impugned decision and removing it from the record.",
      refine: "Identify the impugned order precisely (number, date, author) so the quashing prayer is not vague or over-broad.",
      draft: "Add a prayer to quash / issue certiorari against the specific impugned decision, described by its number, date and maker."
    },
    {
      id: "mandamus",
      name: "Mandatory order / mandamus",
      keywords: ["mandamus", "direct the respondent", "compel", "direction to", "command", "mandatory order", "direct to"],
      summary: "An order compelling the authority to perform a public duty it has failed to discharge.",
      refine: "Tie the mandamus to a clear, presently-enforceable public duty and specify exactly what the authority must do and by when.",
      draft: "Consider a mandamus compelling the authority to discharge a specific public duty — state the duty, its source, and the precise act commanded."
    },
    {
      id: "prohibition",
      name: "Prohibiting order / prohibition",
      keywords: ["prohibition", "restrain", "restraining", "prohibit", "forbear", "desist"],
      summary: "An order restraining the authority from continuing or beginning to act unlawfully.",
      refine: "Confirm the impugned act is threatened or continuing (not spent), so prohibition is not rendered infructuous.",
      draft: "Where the unlawful act is threatened or ongoing, consider prohibition to restrain the authority from proceeding."
    },
    {
      id: "declaration",
      name: "Declaration",
      keywords: ["declaration", "declare", "declared", "declaratory"],
      summary: "A declaration of the parties' rights or that the impugned action/provision is unlawful or void.",
      refine: "Frame the declaration in operative terms the court can grant — a precise statement of the legal position sought, not argument.",
      draft: "Consider a declaratory prayer stating the precise legal position sought (e.g. that the impugned provision/decision is ultra vires and void)."
    },
    {
      id: "injunction",
      name: "Injunction",
      keywords: ["injunction", "restrain by injunction", "permanent injunction", "perpetual injunction"],
      summary: "An order restraining (or, mandatorily, requiring) a party to act, final in nature.",
      refine: "Distinguish prohibitory from mandatory injunction and plead the elements — legal right, threatened injury and inadequacy of damages.",
      draft: "Consider an injunction where a private-law right also arises, pleading the right, the threatened injury and why damages would not suffice."
    },
    {
      id: "interim",
      name: "Interim relief / stay",
      keywords: ["interim", "stay", "status quo", "ad interim", "pending", "suspend operation", "interlocutory"],
      summary: "Interim protection preserving the position pending final hearing (e.g. stay of the impugned order).",
      refine: "Support the interim prayer with the tri-partite test — prima facie case, balance of convenience and irreparable harm — and identify precisely what is to be stayed.",
      draft: "Add an interim prayer (stay of operation / status quo) supported by a prima facie case, balance of convenience and irreparable harm."
    },
    {
      id: "remittal",
      name: "Remittal for fresh consideration",
      keywords: ["remit", "remand", "reconsider", "fresh decision", "de novo", "decide afresh", "in accordance with law"],
      summary: "An order returning the matter for lawful reconsideration in accordance with the court's directions.",
      refine: "Specify the directions to govern the reconsideration (time-frame, matters to be considered) so remittal is not a hollow victory.",
      draft: "Consider a prayer to remit the matter for fresh, lawful reconsideration in accordance with the court's directions within a fixed time."
    },
    {
      id: "damages",
      name: "Damages / compensation",
      keywords: ["damages", "compensation", "compensate", "monetary", "pecuniary loss"],
      summary: "Monetary compensation, where an actionable private-law wrong or statutory basis exists.",
      refine: "Ensure a recognised cause of action supports the claim; public-law illegality alone rarely sounds in damages — plead the private-law hook.",
      draft: "Consider damages/compensation only where a distinct private-law cause of action or statutory basis exists, and plead that basis expressly."
    },
    {
      id: "costs",
      name: "Costs",
      keywords: ["costs", "cost of", "cost of the petition"],
      summary: "An order for the costs of the proceedings.",
      refine: "Retain a costs prayer; it is routinely included and preserves the court's discretion to award them.",
      draft: "Add a prayer for the costs of the petition — it is standard and preserves the court's costs discretion."
    },
    {
      id: "omnibus",
      name: "Omnibus / residuary prayer",
      keywords: ["further relief", "other relief", "deem fit", "deems fit", "just and proper", "meet and proper", "equity and good conscience"],
      summary: "A residuary prayer for any further or other relief the court deems fit and proper.",
      refine: "Keep the omnibus prayer; it lets the court mould relief, but never let it substitute for a specific, well-pleaded prayer.",
      draft: "Close the prayer with a residuary clause for any further or other relief the court deems fit — but do not let it replace specific prayers."
    }
  ];

  // =====================================================================
  //  Proofreading engine
  // =====================================================================

  // Common misspellings (incl. legal terms). Values are the corrections.
  var MISSPELLINGS = {
    "seperate": "separate", "seperation": "separation", "occured": "occurred",
    "occuring": "occurring", "recieve": "receive", "recieved": "received",
    "accomodate": "accommodate", "accomodation": "accommodation",
    "arguement": "argument", "definately": "definitely", "existance": "existence",
    "maintainance": "maintenance", "priviledge": "privilege", "occassion": "occasion",
    "publically": "publicly", "greivance": "grievance", "grievence": "grievance",
    "wheras": "whereas", "aforsaid": "aforesaid", "aggreived": "aggrieved",
    "agrieved": "aggrieved", "respondant": "respondent", "petitionar": "petitioner",
    "affidavid": "affidavit", "juristiction": "jurisdiction", "jurisdicton": "jurisdiction",
    "mandamous": "mandamus", "certiorary": "certiorari", "neccessary": "necessary",
    "unneccessary": "unnecessary", "concious": "conscious", "goverment": "government",
    "enviroment": "environment", "independant": "independent", "reccomend": "recommend",
    "reccommend": "recommend", "acknowlege": "acknowledge", "beleive": "believe",
    "recieving": "receiving", "commited": "committed", "refered": "referred",
    "prefered": "preferred", "transfered": "transferred", "harrassment": "harassment",
    "harrasment": "harassment", "posession": "possession",
    "adress": "address", "untill": "until", "wich": "which", "thier": "their",
    "sucessor": "successor",
    "predjudice": "prejudice", "negligance": "negligence", "propmt": "prompt",
    "colateral": "collateral", "ammendment": "amendment", "ammend": "amend"
  };

  // Wordy / verbose phrases -> concise equivalents (STYLE; count to budget).
  // Legal terms of art (e.g. "in accordance with", "null and void") are avoided.
  var WORDY = [
    ["in order to", "to"],
    ["due to the fact that", "because"],
    ["in the event that", "if"],
    ["at this point in time", "now"],
    ["at this moment in time", "now"],
    ["in the near future", "soon"],
    ["for the purpose of", "for"],
    ["for the reason that", "because"],
    ["in spite of the fact that", "although"],
    ["in view of the fact that", "because"],
    ["on the grounds that", "because"],
    ["with a view to", "to"],
    ["a large number of", "many"],
    ["a great number of", "many"],
    ["the majority of", "most"],
    ["in the course of", "during"],
    ["during the course of", "during"],
    ["each and every", "every"],
    ["any and all", "all"],
    ["first and foremost", "first"],
    ["at all times material", "at the material time"],
    ["is able to", "can"],
    ["are able to", "can"],
    ["in relation to", "regarding"],
    ["with respect to", "regarding"]
  ];

  function analyze(text) {
    var out = [];
    var m, re;

    // ---- PUNCTUATION (mandatory error fixes) ----

    // Space(s) directly before , . ; : ! ? or a closing bracket.
    re = / +([,.;:!?)\]])/g;
    while ((m = re.exec(text))) {
      out.push(finding("punctuation", true, m.index, m.index + m[0].length, m[1],
        "Remove the space before “" + m[1] + "”.",
        "Punctuation should sit tight against the word it follows — no space precedes it."));
    }

    // Missing space after a comma or semicolon that is followed by a letter.
    re = /([,;])([A-Za-z])/g;
    while ((m = re.exec(text))) {
      out.push(finding("punctuation", true, m.index, m.index + m[0].length, m[1] + " " + m[2],
        "Insert a space after “" + m[1] + "”.",
        "A comma or semicolon should be followed by a single space."));
    }

    // Runs of two or more spaces mid-line -> single space.
    re = / {2,}/g;
    while ((m = re.exec(text))) {
      var before = text[m.index - 1];
      var after = text[m.index + m[0].length];
      if (before && before !== "\n" && after && after !== "\n") {
        out.push(finding("punctuation", true, m.index, m.index + m[0].length, " ",
          "Collapse " + m[0].length + " spaces into one.",
          "Double spacing between words is a typographical slip."));
      }
    }

    // Repeated commas / semicolons.
    re = /([,;])\1+/g;
    while ((m = re.exec(text))) {
      out.push(finding("punctuation", true, m.index, m.index + m[0].length, m[1],
        "Remove the duplicated “" + m[1] + "”.",
        "The punctuation mark is repeated."));
    }

    // ---- GRAMMAR (mandatory error fixes) ----

    // Doubled words (excluding legitimately repeatable ones).
    var okDoubles = { had: 1, that: 1 };
    re = /\b([A-Za-z]+)(\s+)(\1)\b/gi;
    while ((m = re.exec(text))) {
      if (okDoubles[m[1].toLowerCase()]) continue;
      out.push(finding("grammar", true, m.index, m.index + m[0].length, m[1],
        "Delete the repeated word “" + m[3] + "”.",
        "The word appears twice in succession."));
    }

    // a / an agreement.
    var anExceptions = /^(uni|use|usu|ubiq|eu|ewe|one|once)/i; // "a university", "a European", "a one-year"
    re = /\b([Aa])(n?)\s+([A-Za-z]+)/g;
    while ((m = re.exec(text))) {
      var art = m[1] + m[2];            // "a" / "an" / "A" / "An"
      var isAn = /n/i.test(m[2]);
      var next = m[3];
      var startsVowel = /^[aeiou]/i.test(next);
      var wordStart = m.index;
      var artEnd = m.index + art.length;
      if (!isAn && startsVowel && !anExceptions.test(next)) {
        // "a apple" -> "an apple"
        var repA = (m[1] === "A" ? "An" : "an");
        out.push(finding("grammar", true, wordStart, artEnd, repA,
          "Use “" + repA + "” before a vowel sound (“" + next + "”).",
          "The indefinite article “an” precedes a vowel sound."));
      } else if (isAn && !startsVowel && /^[bcdfgjklmnpqrstvwxyz]/.test(next) && !/^h/i.test(next)) {
        // "an lawyer" -> "a lawyer" (skip silent-h words and acronyms)
        var repB = (m[1] === "A" ? "A" : "a");
        out.push(finding("grammar", true, wordStart, artEnd, repB,
          "Use “" + repB + "” before a consonant sound (“" + next + "”).",
          "The indefinite article “a” precedes a consonant sound."));
      }
    }

    // Common misspellings (case-preserving on the first letter).
    for (var mis in MISSPELLINGS) {
      if (!MISSPELLINGS.hasOwnProperty(mis)) continue;
      if (mis === MISSPELLINGS[mis]) continue;
      re = new RegExp("\\b(" + mis + ")\\b", "gi");
      while ((m = re.exec(text))) {
        var found = m[1];
        var corrected = MISSPELLINGS[mis];
        if (found[0] === found[0].toUpperCase()) {
          corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
        }
        out.push(finding("grammar", true, m.index, m.index + found.length, corrected,
          "Correct the spelling to “" + corrected + "”.",
          "“" + found + "” appears to be a misspelling."));
      }
    }

    // ---- STYLE (subject to the 20% budget) ----

    // Wordy phrases -> concise forms.
    for (var w = 0; w < WORDY.length; w++) {
      var phrase = WORDY[w][0];
      var concise = WORDY[w][1];
      re = new RegExp("\\b" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
      while ((m = re.exec(text))) {
        var origPhrase = m[0];
        var rep = concise;
        if (origPhrase[0] === origPhrase[0].toUpperCase()) {
          rep = concise.charAt(0).toUpperCase() + concise.slice(1);
        }
        out.push(finding("style", false, m.index, m.index + origPhrase.length, rep,
          "Consider tightening “" + origPhrase + "” to “" + rep + "”.",
          "Concise drafting reads better; this is a stylistic suggestion, not an error."));
      }
    }

    // Overlong sentences (advisory only — no text change, not budgeted).
    var sentenceRe = /[^.!?\n]+[.!?]?/g;
    var s;
    var longCount = 0;
    while ((s = sentenceRe.exec(text)) && longCount < 6) {
      var seg = s[0];
      var words = seg.trim().split(/\s+/).filter(Boolean);
      if (words.length > 45) {
        longCount++;
        var f = finding("style", false, s.index, s.index + seg.length, null,
          "Long sentence (" + words.length + " words) — consider splitting for clarity.",
          "Very long sentences strain the reader; breaking them up sharpens the pleading. Advisory only.");
        f.advisory = true;
        out.push(f);
      }
    }

    // Resolve overlaps: sort by start; prefer mandatory, then longer span.
    out.sort(function (a, b) {
      if (a.start !== b.start) return a.start - b.start;
      if (a.mandatory !== b.mandatory) return a.mandatory ? -1 : 1;
      return (b.end - b.start) - (a.end - a.start);
    });
    var kept = [];
    var lastEnd = -1;
    for (var i = 0; i < out.length; i++) {
      if (out[i].start >= lastEnd) {
        kept.push(out[i]);
        lastEnd = out[i].end;
      }
    }
    // Give each a stable id.
    kept.forEach(function (f, idx) { f.id = "f" + idx; });
    return kept;
  }

  function finding(category, mandatory, start, end, replacement, title, explain) {
    return {
      id: null,
      category: category,
      mandatory: mandatory,       // true => genuine error, exempt from the 20% cap
      advisory: false,            // true => informational, no text change, not acceptable
      start: start,
      end: end,
      original: state.text.slice(start, end),
      replacement: replacement,   // null for advisory findings
      title: title,
      explain: explain
    };
  }

  // =====================================================================
  //  Budget (the 20% rider)
  // =====================================================================

  var CAP = 0.20;

  function denominator() {
    if (state.budgetMode === "words") {
      return Math.max(1, wordsIn(state.text));
    }
    return Math.max(1, state.text.length);
  }

  function costOf(f) {
    if (state.budgetMode === "words") return wordsIn(f.original);
    return f.original.length;
  }

  // Cost consumed by STYLE changes already accepted (errors are exempt).
  function styleSpent(excludeId) {
    var total = 0;
    state.findings.forEach(function (f) {
      if (f.mandatory || f.advisory) return;
      if (f.id === excludeId) return;
      if (state.decisions[f.id] === "accept") total += costOf(f);
    });
    return total;
  }

  // Would accepting this style finding breach the 20% ceiling?
  function wouldExceed(f) {
    if (f.mandatory || f.advisory) return false;
    var projected = styleSpent(f.id) + costOf(f);
    return projected > CAP * denominator();
  }

  function currentBudgetPct() {
    return (styleSpent(null) / denominator()) * 100;
  }

  function wordsIn(str) {
    var t = str.trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }

  // =====================================================================
  //  Rendering
  // =====================================================================

  function runReview() {
    state.text = els.draft.value;
    if (!state.text.trim()) {
      toast("Paste a draft first.");
      return;
    }
    state.findings = analyze(state.text);
    state.decisions = {};
    state.grounds = classify(GROUNDS, state.text);
    state.reliefs = classify(RELIEFS, state.text);
    state.reviewed = true;

    els.reviewEmpty.hidden = true;
    showPane(currentTab());
    renderAll();
    toast("Review complete — " + state.findings.length + " proofreading note" +
      (state.findings.length === 1 ? "" : "s") + ".");
  }

  function classify(kb, text) {
    var lower = text.toLowerCase();
    var present = [], suggested = [];
    kb.forEach(function (item) {
      var hit = item.keywords.some(function (k) { return lower.indexOf(k.toLowerCase()) !== -1; });
      (hit ? present : suggested).push(item);
    });
    return { present: present, suggested: suggested };
  }

  function renderAll() {
    renderFindings();
    renderBudget();
    renderKB();
    renderReport();
    renderCounts();
  }

  function renderCounts() {
    els.countProof.textContent = state.findings.length;
    els.countGrounds.textContent = state.grounds ? state.grounds.suggested.length : 0;
    els.countReliefs.textContent = state.reliefs ? state.reliefs.suggested.length : 0;
  }

  function renderFindings() {
    var list = els.findingsList;
    list.innerHTML = "";
    var items = state.findings.filter(function (f) {
      return state.proofFilter === "all" || f.category === state.proofFilter;
    });

    els.proofNone.hidden = state.findings.length !== 0;
    if (!items.length && state.findings.length) {
      var none = document.createElement("p");
      none.className = "none-note";
      none.textContent = "No findings in this category.";
      list.appendChild(none);
      return;
    }

    items.forEach(function (f) {
      list.appendChild(renderFinding(f));
    });
  }

  function renderFinding(f) {
    var li = document.createElement("li");
    li.className = "finding";
    li.dataset.cat = f.category;
    var decision = state.decisions[f.id];
    if (decision === "accept") li.classList.add("is-accepted");
    if (decision === "reject") li.classList.add("is-rejected");

    // Head: category badge + mandatory/budget badge + title.
    var head = document.createElement("div");
    head.className = "finding-head";
    head.appendChild(badge(f.category, "badge-" + f.category));
    if (!f.advisory) {
      if (f.mandatory) {
        head.appendChild(badge("Error · always fixable", "badge-mandatory"));
      } else {
        head.appendChild(badge("Style · counts to 20%", "badge-budgeted"));
      }
    } else {
      head.appendChild(badge("Advisory", "badge-budgeted"));
    }
    var title = document.createElement("span");
    title.className = "finding-title";
    title.textContent = f.title;
    head.appendChild(title);
    li.appendChild(head);

    // Context with before/after.
    if (!f.advisory) {
      li.appendChild(contextEl(f));
    }

    // Explanation.
    var ex = document.createElement("p");
    ex.className = "finding-explain";
    ex.textContent = f.explain;
    li.appendChild(ex);

    // Actions.
    if (!f.advisory) {
      var actions = document.createElement("div");
      actions.className = "finding-actions";

      var accept = document.createElement("button");
      accept.className = "btn btn-small btn-accept";
      accept.type = "button";
      accept.textContent = decision === "accept" ? "Accepted ✓" : "Accept change";

      var reject = document.createElement("button");
      reject.className = "btn btn-small btn-reject";
      reject.type = "button";
      reject.textContent = decision === "reject" ? "Rejected" : "Reject";

      var status = document.createElement("span");
      status.className = "finding-status";

      var blocked = wouldExceed(f) && decision !== "accept";
      if (blocked) {
        accept.disabled = true;
        accept.title = "Accepting this stylistic change would push you past the 20% ceiling. Reject another style change first, or leave the draft's wording as counsel wrote it.";
        status.className = "finding-status blocked";
        status.textContent = "Over 20% budget";
      } else if (decision === "accept") {
        status.className = "finding-status ok";
        status.textContent = "Will be applied";
      } else if (decision === "reject") {
        status.className = "finding-status no";
        status.textContent = "Left as written";
      }

      accept.addEventListener("click", function () { decide(f.id, "accept"); });
      reject.addEventListener("click", function () { decide(f.id, "reject"); });

      actions.appendChild(accept);
      actions.appendChild(reject);
      actions.appendChild(status);
      li.appendChild(actions);
    }

    return li;
  }

  function badge(text, cls) {
    var b = document.createElement("span");
    b.className = "badge " + cls;
    b.textContent = text;
    return b;
  }

  function contextEl(f) {
    var wrap = document.createElement("div");
    wrap.className = "finding-context";
    var preStart = Math.max(0, f.start - 45);
    var postEnd = Math.min(state.text.length, f.end + 45);
    var pre = collapse(state.text.slice(preStart, f.start));
    var post = collapse(state.text.slice(f.end, postEnd));

    if (preStart > 0) pre = "…" + pre;
    if (postEnd < state.text.length) post = post + "…";

    wrap.appendChild(document.createTextNode(pre));
    if (f.original) {
      var del = document.createElement("span");
      del.className = "ctx-old";
      del.textContent = collapse(f.original);
      wrap.appendChild(del);
    }
    if (f.replacement) {
      var ins = document.createElement("span");
      ins.className = "ctx-new";
      ins.textContent = collapse(f.replacement);
      wrap.appendChild(ins);
    }
    wrap.appendChild(document.createTextNode(post));
    return wrap;
  }

  function collapse(str) {
    return str.replace(/\n/g, " ⏎ ");
  }

  function decide(id, choice) {
    // Toggle off if the same choice is clicked again.
    if (state.decisions[id] === choice) {
      delete state.decisions[id];
    } else {
      var f = byId(id);
      if (choice === "accept" && f && wouldExceed(f)) {
        toast("That stylistic change would exceed the 20% ceiling.");
        return;
      }
      state.decisions[id] = choice;
    }
    renderFindings();
    renderBudget();
    renderReport();
  }

  function byId(id) {
    for (var i = 0; i < state.findings.length; i++) {
      if (state.findings[i].id === id) return state.findings[i];
    }
    return null;
  }

  function renderBudget() {
    var pct = currentBudgetPct();
    els.budgetPct.textContent = pct.toFixed(1);
    var ratio = Math.min(1, pct / (CAP * 100)); // relative to the 20% cap
    els.budgetFill.style.width = (ratio * 100) + "%";
    els.budgetFill.classList.remove("is-warn", "is-over");
    if (pct > CAP * 100 + 0.001) {
      els.budgetFill.classList.add("is-over");
    } else if (pct >= CAP * 100 * 0.75) {
      els.budgetFill.classList.add("is-warn");
    }
    if (els.budgetBar) {
      els.budgetBar.setAttribute("aria-valuenow", pct.toFixed(1));
    }
  }

  // ---- Grounds & reliefs ----

  function renderKB() {
    fillKB(els.groundsPresent, state.grounds.present, "present");
    fillKB(els.groundsNew, state.grounds.suggested, "suggested");
    els.groundsPresentNone.hidden = state.grounds.present.length !== 0;
    els.groundsPresentCount.textContent = state.grounds.present.length;
    els.groundsNewCount.textContent = state.grounds.suggested.length;

    fillKB(els.reliefsPresent, state.reliefs.present, "present");
    fillKB(els.reliefsNew, state.reliefs.suggested, "suggested");
    els.reliefsPresentNone.hidden = state.reliefs.present.length !== 0;
    els.reliefsPresentCount.textContent = state.reliefs.present.length;
    els.reliefsNewCount.textContent = state.reliefs.suggested.length;
  }

  function fillKB(ul, items, kind) {
    ul.innerHTML = "";
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "kb-item " + kind;

      var h = document.createElement("h5");
      h.textContent = item.name;
      li.appendChild(h);

      var summary = document.createElement("p");
      summary.className = "kb-summary";
      summary.textContent = item.summary;
      li.appendChild(summary);

      var note = document.createElement("div");
      note.className = "kb-note";
      var label = document.createElement("strong");
      label.textContent = kind === "present" ? "Refine: " : "How to plead: ";
      note.appendChild(label);
      note.appendChild(document.createTextNode(kind === "present" ? item.refine : item.draft));
      li.appendChild(note);

      ul.appendChild(li);
    });
  }

  // =====================================================================
  //  Report + revised draft
  // =====================================================================

  function acceptedTextChanges() {
    return state.findings.filter(function (f) {
      return !f.advisory && f.replacement !== null && state.decisions[f.id] === "accept";
    });
  }

  function buildRevisedDraft() {
    var changes = acceptedTextChanges().slice().sort(function (a, b) { return b.start - a.start; });
    var text = state.text;
    changes.forEach(function (f) {
      text = text.slice(0, f.start) + f.replacement + text.slice(f.end);
    });
    return text;
  }

  function buildReportMarkdown() {
    var lines = [];
    var accepted = acceptedTextChanges();
    var errorFindings = state.findings.filter(function (f) { return f.mandatory && !f.advisory; });
    var styleFindings = state.findings.filter(function (f) { return !f.mandatory && !f.advisory; });
    var advisories = state.findings.filter(function (f) { return f.advisory; });

    lines.push("# Solicitor's Review Note");
    lines.push("");
    lines.push("_Prepared for the author's consideration. No change has been made to the draft except those expressly authorized below._");
    lines.push("");
    lines.push("**Draft length:** " + state.text.length + " characters / " + wordsIn(state.text) + " words.  ");
    lines.push("**Proofreading notes:** " + state.findings.length +
      " (" + errorFindings.length + " error fix" + (errorFindings.length === 1 ? "" : "es") +
      ", " + styleFindings.length + " stylistic, " + advisories.length + " advisory).  ");
    lines.push("**Stylistic change budget used:** " + currentBudgetPct().toFixed(1) + "% of the permitted 20%.");
    lines.push("");

    // 1. Proofreading
    lines.push("## 1. Proofreading — grammatical & punctuation errors");
    if (!errorFindings.length) {
      lines.push("No grammatical or punctuation errors detected.");
    } else {
      lines.push("These are corrections of genuine errors and are recommended regardless of the 20% ceiling:");
      lines.push("");
      errorFindings.forEach(function (f) {
        var mark = state.decisions[f.id] === "accept" ? "[accepted]" :
          state.decisions[f.id] === "reject" ? "[declined]" : "[pending]";
        lines.push("- **" + cap(f.category) + "** " + mark + ": " + f.title +
          (f.original ? "  — “" + oneLine(f.original) + "” → “" + oneLine(f.replacement) + "”" : ""));
      });
    }
    lines.push("");

    // 2. Suggested stylistic changes
    lines.push("## 2. Suggested stylistic changes (within the 20% limit)");
    if (!styleFindings.length) {
      lines.push("No stylistic suggestions.");
    } else {
      lines.push("Optional refinements. Accepted stylistic changes are held to 20% of the draft:");
      lines.push("");
      styleFindings.forEach(function (f) {
        var mark = state.decisions[f.id] === "accept" ? "[accepted]" :
          state.decisions[f.id] === "reject" ? "[declined]" : "[pending]";
        lines.push("- " + mark + ": " + f.title);
      });
    }
    if (advisories.length) {
      lines.push("");
      lines.push("_Advisory (no wording change):_");
      advisories.forEach(function (f) { lines.push("- " + f.title); });
    }
    lines.push("");

    // 3. Grounds of challenge
    lines.push("## 3. Grounds of challenge");
    lines.push("");
    lines.push("### Grounds already pleaded — refinements");
    if (state.grounds.present.length) {
      state.grounds.present.forEach(function (g) {
        lines.push("- **" + g.name + "** — " + g.refine);
      });
    } else {
      lines.push("- None of the standard heads were detected in the draft.");
    }
    lines.push("");
    lines.push("### Suggested new grounds to consider");
    state.grounds.suggested.forEach(function (g) {
      lines.push("- **" + g.name + "** — " + g.draft);
    });
    lines.push("");

    // 4. Reliefs
    lines.push("## 4. Reliefs");
    lines.push("");
    lines.push("### Reliefs already sought — refinements");
    if (state.reliefs.present.length) {
      state.reliefs.present.forEach(function (r) {
        lines.push("- **" + r.name + "** — " + r.refine);
      });
    } else {
      lines.push("- No standard reliefs were detected in the prayer.");
    }
    lines.push("");
    lines.push("### Suggested new reliefs to consider");
    state.reliefs.suggested.forEach(function (r) {
      lines.push("- **" + r.name + "** — " + r.draft);
    });
    lines.push("");

    // 5. Revised draft
    lines.push("## 5. Revised draft (authorized changes only)");
    lines.push("");
    if (!accepted.length) {
      lines.push("_No changes authorized yet — the draft below is identical to the original._");
    } else {
      lines.push("_Incorporates the " + accepted.length + " change" + (accepted.length === 1 ? "" : "s") + " you accepted._");
    }
    lines.push("");
    lines.push("```");
    lines.push(buildRevisedDraft());
    lines.push("```");
    lines.push("");
    lines.push("---");
    lines.push("_This note assists a qualified solicitor's review. It is not legal advice._");
    return lines.join("\n");
  }

  function renderReport() {
    if (!state.reviewed) return;
    var md = buildReportMarkdown();
    els.reportBody.innerHTML = miniMarkdown(md);
  }

  // Minimal, safe Markdown -> HTML (headings, bold, lists, code fences).
  function miniMarkdown(md) {
    var lines = md.split("\n");
    var html = [];
    var inCode = false;
    var inList = false;
    var codeBuf = [];
    function closeList() { if (inList) { html.push("</ul>"); inList = false; } }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.trim() === "```") {
        if (inCode) {
          html.push("<pre>" + esc(codeBuf.join("\n")) + "</pre>");
          codeBuf = [];
          inCode = false;
        } else {
          closeList();
          inCode = true;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      if (/^# /.test(line)) { closeList(); html.push("<h3>" + inline(line.slice(2)) + "</h3>"); }
      else if (/^## /.test(line)) { closeList(); html.push("<h3>" + inline(line.slice(3)) + "</h3>"); }
      else if (/^### /.test(line)) { closeList(); html.push("<h4>" + inline(line.slice(4)) + "</h4>"); }
      else if (/^- /.test(line)) {
        if (!inList) { html.push("<ul>"); inList = true; }
        html.push("<li>" + inline(line.slice(2)) + "</li>");
      }
      else if (line.trim() === "---") { closeList(); html.push("<hr />"); }
      else if (line.trim() === "") { closeList(); }
      else { closeList(); html.push("<p class='report-meta'>" + inline(line) + "</p>"); }
    }
    closeList();
    if (inCode) html.push("<pre>" + esc(codeBuf.join("\n")) + "</pre>");
    return html.join("\n");
  }

  function inline(str) {
    return esc(str)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function oneLine(s) { return String(s).replace(/\s+/g, " ").trim(); }

  // =====================================================================
  //  Tabs, controls, wiring
  // =====================================================================

  function currentTab() {
    var active = document.querySelector(".tab.is-active");
    return active ? active.dataset.tab : "proof";
  }

  function showPane(name) {
    els.tabs.forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    els.panes.forEach(function (p) {
      p.hidden = p.dataset.pane !== name || !state.reviewed;
    });
    if (!state.reviewed) els.reviewEmpty.hidden = false;
  }

  function updateCounts() {
    var text = els.draft.value;
    els.wordCount.textContent = wordsIn(text) + (wordsIn(text) === 1 ? " word" : " words");
    els.charCount.textContent = text.length + (text.length === 1 ? " character" : " characters");
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 2600);
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast(label + " copied to clipboard."); },
        function () { toast("Couldn't copy — try the download button."); }
      );
    } else {
      toast("Clipboard unavailable — use the download button.");
    }
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }

  // ---------- Events ----------
  function wire() {
    els.draft.addEventListener("input", updateCounts);

    els.reviewBtn.addEventListener("click", runReview);

    els.clearBtn.addEventListener("click", function () {
      els.draft.value = "";
      state.reviewed = false;
      state.findings = [];
      state.decisions = {};
      updateCounts();
      els.reviewEmpty.hidden = false;
      els.panes.forEach(function (p) { p.hidden = true; });
      renderCounts();
      els.countProof.textContent = "0";
      els.countGrounds.textContent = "0";
      els.countReliefs.textContent = "0";
    });

    els.sampleBtn.addEventListener("click", function () {
      els.draft.value = SAMPLE;
      updateCounts();
      runReview();
    });

    els.budgetMode.addEventListener("change", function () {
      state.budgetMode = els.budgetMode.value;
      if (state.reviewed) { renderFindings(); renderBudget(); renderReport(); }
    });

    els.tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        if (!state.reviewed) { toast("Run a review first."); return; }
        showPane(t.dataset.tab);
      });
    });

    els.proofFilters.addEventListener("click", function (e) {
      var btn = e.target.closest(".pill");
      if (!btn) return;
      state.proofFilter = btn.dataset.filter;
      els.proofFilters.querySelectorAll(".pill").forEach(function (p) {
        p.classList.toggle("is-active", p === btn);
      });
      renderFindings();
    });

    els.acceptAllErrors.addEventListener("click", function () {
      state.findings.forEach(function (f) {
        if (f.mandatory && !f.advisory) state.decisions[f.id] = "accept";
      });
      renderFindings(); renderBudget(); renderReport();
      toast("All error fixes accepted.");
    });

    els.resetDecisions.addEventListener("click", function () {
      state.decisions = {};
      renderFindings(); renderBudget(); renderReport();
      toast("Your decisions were reset.");
    });

    els.copyReport.addEventListener("click", function () { copy(buildReportMarkdown(), "Report"); });
    els.downloadReport.addEventListener("click", function () {
      download("solicitors-review.md", buildReportMarkdown(), "text/markdown");
    });
    els.copyRevised.addEventListener("click", function () { copy(buildRevisedDraft(), "Revised draft"); });
    els.downloadRevised.addEventListener("click", function () {
      download("revised-draft.txt", buildRevisedDraft(), "text/plain");
    });

    els.themeToggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  // ---------- Sample draft (deliberately imperfect, for demonstration) ----------
  var SAMPLE = [
    "IN THE HIGH COURT OF JUDICATURE",
    "",
    "WRIT PETITION No. ____ of 2026",
    "",
    "IN THE MATTER OF an application under Article 226 of the Constitution;",
    "",
    "The Petitioner most respectfully showeth as under:",
    "",
    "1. That the Petitioner is a law abiding citizen and is  aggrieved by the impugned order dated 12.03.2026 passed by the Respondent No.1,whereby the Petitioner's licence was cancelled without affording any opportunity of hearing to the Petitioner.",
    "",
    "2. That in order to appreciate the controversy , it is neccessary to state that the Petitioner had been carrying on his business for over fifteen years and had a unblemished record throughout that period.",
    "",
    "3. That the impugned order is wholly arbitrary and and unreasonable inasmuch as no show cause notice was ever issued to the the Petitioner prior to the passing of the said order, which is contrary to the principles of natural justice.",
    "",
    "4. That the Respondent has acted in excess of authority and the impugned order suffers from an error of law apparent on the face of the record.",
    "",
    "GROUNDS",
    "",
    "A. Because the impugned order is violative of the principles of natural justice and audi alteram partem, no opportunity of hearing having been granted.",
    "",
    "B. Because the impugned order is arbitrary and unreasonable and is liable to be set aside.",
    "",
    "C. Because the Respondent acted without jurisdiction and in excess of the powers conferred upon it by the parent statute.",
    "",
    "PRAYER",
    "",
    "It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:",
    "",
    "(a) issue a writ of certiorari quashing the impugned order dated 12.03.2026 ;",
    "",
    "(b) issue a writ of mandamus directing the Respondent to restore the Petitioner's licence;",
    "",
    "(c) pass such other and further orders as this Hon'ble Court may deem fit and proper in the facts and circumstances of the case.",
    "",
    "AND FOR THIS ACT OF KINDNESS THE PETITIONER SHALL EVER PRAY."
  ].join("\n");

  // ---------- Boot ----------
  initTheme();
  wire();
  updateCounts();
})();
