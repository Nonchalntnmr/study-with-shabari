// Facts and business requirements, copied as written from docs/FOUNDER-SPEC.md. Its "Founder update,
// 2026-10-30" section supersedes the earlier bio, headlines and MCAT pricing.
// Do not add, round or embellish anything here. Items still to confirm are
// tracked in docs/VERIFY.md.

export const headline = "MCAT tutoring and college admissions help, from someone who recently went through both.";
export const heroEyebrow = "MIT Class of 2027 · Premed";
export const heroSubline =
  "I'm Shabari, an MIT senior studying Chemistry & Molecular Biology and Neuroscience. I scored a 522 on the MCAT and was admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn. I'd love to help you with your path.";

export const identity = {
  name: "Shabari Shankar",
  classOf: "MIT Class of 2027",
  majors: "Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)",
  // Amendment 4: wherever the degree is mentioned, say "B.S. candidate, MIT Class of 2027", never "B.S. in …" alone.
  degree: "B.S. candidate, MIT Class of 2027: Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)",
  track: "premed",
};

export const mcatScore = { total: 522, line: "522 MCAT — 132 B/B, 132 P/S, 131 C/P", sections: { BB: 132, PS: 132, CP: 131 }, taken: "January 2026" };

export const admittedTo = ["MIT", "Yale", "Columbia", "Brown", "Dartmouth", "Penn"] as const;
export const admittedLine = "Admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn (Benjamin Franklin Scholar)";
export const pennNote = "Benjamin Franklin Scholar";

/** Every admission, with its honor, as listed in the 2026-10-30 update. */
export const admissionsResults = [
  { school: "MIT", note: null },
  { school: "Yale", note: null },
  { school: "Columbia", note: "Likely Letter" },
  { school: "Penn", note: "Benjamin Franklin Scholar" },
  { school: "Brown", note: null },
  { school: "Dartmouth", note: null },
  { school: "Johns Hopkins", note: "Hodson Trust Scholar, near full ride" },
  { school: "Wake Forest", note: "Carswell Scholar, full ride" },
  { school: "UT Dallas", note: "McDermott Scholar, full ride" },
] as const;

export const education = [
  "MIT, B.S. candidate, Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9), Class of 2027. Premed.",
  "Hillcrest High School, 2019–2023",
];

// Amendment 4: "Published in The BMJ" in the spec is shown as "BMJ Rapid Responses".
export const credibilityStrip = ["Eloranta Fellow", "Legatum Fellow", "Burchard Scholar", "BMJ Rapid Responses", "MIT TA"];

// ---------------------------------------------------------------- MCAT half

export const mcatTutoring = {
  // Founder update 2026-10-30, tone: state the facts plainly (the old line overstated her MIT TA role).
  headline: "One-on-one MCAT tutoring from an MIT premed who scored a 522 in January 2026.",
  points: [
    "1:1 live sessions on Zoom",
    "Full-length exams and practice questions with explanations",
    "A study plan built around your test date",
    "Focus on C/P, B/B, and P/S",
    "TA for MIT Introduction to Chemistry (Fall 2024) and Statistics for Neuroscience (Fall 2025)",
  ],
};

export const practicePlatform =
  "No-login practice area with full-length C/P, B/B, and P/S sections matching the real MCAT's content mix and difficulty, plus short sample passages. Exam-style interface: passage on the left, question on the right, answer choices, timer, flag-for-review, question navigator, and a results screen with score and an explanation for every question.";

export const notes = {
  headline: "My complete MCAT notes. Free, no signup.",
  cards: [
    { section: "CP", title: "C/P Content Review", body: "gen chem, orgo, physics, and biochem" },
    { section: "BB", title: "B/B Content Review", body: "cell bio, physiology, genetics, and biochem pathways" },
    { section: "PS", title: "P/S Content Review", body: "every tested psychology and sociology term" },
  ],
};

/** The 2026-10-30 MCAT packages. scripts/sync-mcat-pricing.ts writes these to the pricing table. */
export const mcatPricing = [
  { slug: "consult", name: "Free 15-minute consult call", price: "Free", items: [] as string[] },
  { slug: "single-session", name: "Single 1:1 session", price: "$100/hour", items: [] as string[] },
  { slug: "five-session-pack", name: "5-session pack", price: "$450", items: [] as string[] },
  { slug: "section-focus", name: "Section Focus", price: "$600", items: ["5 sessions on one section (C/P, B/B, or P/S)", "500 practice questions for that section"] },
  {
    slug: "full-mcat-package",
    name: "Full MCAT Package",
    price: "$2,000",
    items: ["10 live 1:1 sessions", "2 full-length exams", "2,000 practice questions with explanations", "Personalized study plan"],
  },
  { slug: "intensive", name: "Intensive", price: "$3,500", items: ["20 live 1:1 sessions", "All practice materials", "Weekly check-ins", "Full-length review sessions"] },
  { slug: "group-sessions", name: "Group sessions", price: "$40 per person per session", items: ["Up to 6"] },
];

// ---------------------------------------------------------------- Admissions half

// Founder update 2026-10-30, tone: no outcome promise, the focus on helping the student.
export const admissionsHeadline = "College admissions help, from someone who went through it recently.";

export const highSchool = {
  title: "My high school record (founder-reported)",
  disclaimer: "Shared as background on my own application. Admissions outcomes vary and nothing here is a guarantee.",
  stats: [
    { value: "4.00/4.00", label: "GPA" },
    { value: "1550", label: "SAT" },
    { value: "35", label: "ACT" },
    { value: "40/45", label: "IB Diploma" },
  ],
  ib: [
    { level: "HL", subject: "Mathematics", score: 7 },
    { level: "HL", subject: "Physics", score: 7 },
    { level: "HL", subject: "Biology", score: 7 },
    { level: "HL", subject: "Chemistry", score: 6 },
    { level: "SL", subject: "English", score: 6 },
    { level: "SL", subject: "French B", score: 6 },
    { level: "SL", subject: "History", score: 6 },
  ],
  extendedEssay: "Extended Essay on the history of the pesticide DDT",
  activities: [
    "Top rank in the USA Biology Olympiad",
    "USA Biology Olympiad tutor",
    "Top 10 in Science Olympiad Cell Biology and Designer Genes",
    "Science Club / Science Olympiad Vice President",
    "IB Student Council",
    "MIT Beaver Works Summer Institute (CogWorks)",
    "Quantum School for Young Students",
    "Kenyon Young Writers",
    "Letter to the Editor published in The New York Times (Sept 2022)",
  ],
};

export const admissionsHelp = [
  { title: "Essays", body: "Common App personal statement and supplemental essays: brainstorming, structure, and line editing" },
  { title: "Activities and honors", body: "Activities list and honors section" },
  { title: "School list", body: "School list: reach, target, and likely schools" },
  { title: "Interviews", body: "Interview prep" },
  { title: "Timeline", body: "Application timeline for juniors and seniors" },
  { title: "Testing", body: "SAT and ACT strategy" },
];

/** The three MIT writing prizes, as [prize, placing and year]. */
export const writingPrizes = [
  ["Klein Technical Writing Prize", "1st place (2024)"],
  ["Louis Kampf Writing Prize", "(2024)"],
  ["Boit Manuscript Prize", "3rd place (2024)"],
] as const;

export const essayCredentials = [
  "News Editor, The Tech: 25+ articles, including interviews with MIT President Sally Kornbluth, Moderna co-founder Noubar Afeyan, and Nobel laureate Moungi Bawendi",
  "Burchard Scholar (top 35 humanities students at MIT), 2024–25",
];

export const mentoring = [
  "TA, MIT Beaver Works Summer Institute Medlytics: mentored ~30 high schoolers; Caring Coach Award",
  "MIT Associate Advisor",
  "First-Year Pre-Orientation Counselor",
  "DynaMIT volunteer",
];

/** The spec leaves these prices blank; they show as "Priced on your consult call" until the founder supplies them. */
export const admissionsPricing = [
  { name: "Free 15-minute consult call", price: "Free" as string, includes: null as string | null },
  { name: "Essay package", price: null, includes: null },
  { name: "Full application package", price: null, includes: "essays, activities list, school list, interview prep" },
  { name: "Hourly sessions", price: null, includes: null },
];

// From the FAQ answer "Junior year for planning; essays the summer before senior year."
export const admissionsTimeline = [
  { when: "Junior year", what: "Planning" },
  { when: "Summer before senior year", what: "Essays" },
];

// ---------------------------------------------------------------- shared

export const research = [
  {
    org: "Ragon Institute of MIT and Harvard, Ringel Lab",
    when: "Nov 2024 – Sep 2025",
    body: "How methionine restriction changes antigen presentation between macrophages and CD8+ T cells.",
  },
  {
    org: "MIT CSAIL",
    when: "Sep 2023 – Oct 2024",
    body: "Applied the deep learning model Enformer to 684 human-specific regulatory regions. Co-author on a manuscript in preparation; posters at the European Association for Cancer Research and the MIT Bioengineering Annual Conference.",
  },
  {
    org: "Beth Israel Lahey Health",
    when: null,
    // The spec's "(in preparation for resubmission — do not call it published)", without the instruction.
    body: "Built the Health Sustainability Normalized Index comparing surgical procedures by environmental impact. First author on the manuscript, in preparation for resubmission.",
  },
  { org: "Utah Health Policy Project", when: null, body: "Analyzed Utah Medicare and Medicaid; policy pamphlet distributed to Utah State Senate offices." },
  { org: "NASA L'SPACE", when: null, body: "Lead author on a probiotic biomaterials proposal for spaceflight; top 15 nationally." },
];

export const publications = [
  { title: "“The problem may not be fragmentation: it may be accumulation”", venue: "Rapid Response, The BMJ", when: "June 2026" },
  { title: "“Integration without incentive reform will fail”", venue: "Rapid Response, The BMJ", when: "March 2026" },
  { title: "Commentary on “A Post-Pandemic Wellness Experiences Scale”", venue: "Journal of Mental Health and Clinical Psychology", when: "June 2025" },
  {
    title: "“Ending FGM: A New Ruling in the Gambia Can Reignite Progress Towards SDG Target 5.3”",
    venue: "Journal of Women's Health",
    when: "December 2024",
  },
  { title: "Letter to the Editor", venue: "The New York Times", when: "September 2022" },
];

export const teaching = [
  "TA, MIT Introduction to Chemistry (Fall 2024)",
  "TA, MIT Statistics for Neuroscience (Fall 2025)",
  "TA, MIT Beaver Works Summer Institute Medlytics: mentored ~30 high schoolers; Caring Coach Award",
];

export const honors = [
  "Peter J. Eloranta Fellowship (top 6 proposals, immunology research), Summer 2025",
  "MIT–Massachusetts General Hospital Clinical Prehealth Research Extern (one of five), Summer 2025",
  "MIT Sloan Legatum Fellow, 2024–25 (sole undergraduate)",
  "PKG IDEAS Finalist and Top 2 Public Voting Winner, 2024",
  "Burchard Scholar (top 35 humanities students at MIT), 2024–25",
  "Jeffrey L. Pressman Award (health policy research), Summer 2024",
  "OME Prize sponsored by Chevron, Fall 2023",
  "BCAP Fellow, 2024",
  "MIT Social and Ethical Responsibilities of Computing Scholar, 2023–24",
  "Klein Technical Writing Prize, 1st place (2024); Louis Kampf Writing Prize (2024); Boit Manuscript Prize, 3rd place (2024)",
];

export const writing = "News Editor, The Tech: 25+ articles, including interviews with MIT President Sally Kornbluth, Moderna co-founder Noubar Afeyan, and Nobel laureate Moungi Bawendi";

export const mudzi = {
  name: "Mudzi Cooking Project",
  body: "Co-founder, Mudzi Cooking Project (Malawi): clean-burning briquettes from agricultural waste.",
  figures: [
    { value: "5,000", label: "women engaged" },
    { value: "1.5M", label: "briquettes" },
    { value: "$14,000", label: "raised" },
  ],
  more: "UN-subsidiary contract. PKG IDEAS Finalist; Princeton TigerLaunch finalist.",
};

export const bio =
  "Hi, I'm Shabari. I'm a senior at MIT studying Chemistry & Molecular Biology and Neuroscience, and I'm premed. I took the MCAT in January 2026 and scored a 522. Before that, I went through college admissions and was lucky to be admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn. At MIT, I've done research in immunology, computational genomics, and surgical sustainability, TA'd chemistry and neuroscience courses, and co-founded the Mudzi Project in Malawi. I remember how overwhelming both processes felt, so I try to make things clear, simple, and built around you.";

export const paymentNote = "Payment via Zelle after the consult call. No card checkout.";

export const faq = [
  { q: "Are the notes and practice tests really free?", a: "Yes, no signup." },
  { q: "Where do sessions happen?", a: "Zoom." },
  { q: "When should I start MCAT prep?", a: "Ideally 3–4 months before test day; any timeline works." },
  { q: "Do you tutor CARS?", a: "I focus on the three science sections." },
  { q: "When should high schoolers start college apps?", a: "Junior year for planning; essays the summer before senior year." },
  { q: "Can parents join calls?", a: "Yes." },
  { q: "How does payment work?", a: "Zelle, after the consult." },
];

export const nav = [
  { href: "/mcat", label: "MCAT Prep" },
  { href: "/admissions", label: "College Admissions" },
  { href: "/practice", label: "Free Practice Test" },
  { href: "/resources", label: "Free Notes" },
  { href: "/research", label: "Research & Teaching" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];
export const bookCta = { href: "/book", label: "Book a Call" };
