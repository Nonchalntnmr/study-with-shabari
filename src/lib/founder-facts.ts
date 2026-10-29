// Facts and business requirements, copied as written from docs/FOUNDER-SPEC.md.
// Do not add, round or embellish anything here. Items still to confirm are
// tracked in docs/VERIFY.md.

export const headline = "I scored a 522 on the MCAT and got into MIT and 5 Ivies. Now I teach both.";

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

// Amendment 4: "Published in The BMJ" in the spec is shown as "BMJ Rapid Responses".
export const credibilityStrip = ["Eloranta Fellow", "Legatum Fellow", "Burchard Scholar", "BMJ Rapid Responses", "MIT TA"];

// ---------------------------------------------------------------- MCAT half

export const mcatTutoring = {
  headline: "Learn the MCAT from someone who teaches this material at MIT.",
  points: [
    "1:1 live sessions on Zoom",
    "Original practice questions and full-length exams written by Shabari",
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

export const mcatPricing = [
  { name: "Free 15-minute consult call", price: "Free", items: [] as string[] },
  {
    name: "Full MCAT Package",
    price: "$2,000",
    items: ["10 live 1:1 sessions", "2 original full-length exams", "2,000 original practice questions with explanations", "Personalized study plan"],
  },
  { name: "Custom MCAT plan", price: "Priced on the consult call", items: ["Fewer sessions or a single-section focus"] },
];

// ---------------------------------------------------------------- Admissions half

export const admissionsHeadline = "I got into MIT and 5 of 8 Ivies. I'll help you build the application that gets you in.";

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
    "Science Club / Science Olympiad Vice President",
    "USA Biology Olympiad tutor",
    "IB Student Council",
    "MIT Beaver Works Summer Institute (CogWorks)",
    "Quantum School for Young Students",
    "Kenyon Young Writers",
    "Letter to the Editor published in The New York Times (Sept 2022), responding to “Reimagining K-12 Education in America”",
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

export const essayCredentials = [
  "Klein Technical Writing Prize, MIT (biostatistics research paper, 2024)",
  "Louis Kampf Writing Prize, MIT (chemical history paper, 2024)",
  "Boit Manuscript Prize, 3rd place, MIT (chemical history paper, 2024)",
  "News Editor of The Tech, MIT's oldest and largest student newspaper: 25+ articles, including interviews with MIT President Sally Kornbluth, Moderna co-founder Noubar Afeyan, and 2023 Chemistry Nobel laureate Moungi Bawendi",
  "Burchard Scholar (top 35 humanities students at MIT)",
];

export const mentoring = [
  "TA for MIT Beaver Works Summer Institute Medlytics: mentored ~30 high school students from across the country in machine learning for medicine; Caring Coach Award",
  "MIT Associate Advisor for first-year students",
  "MIT First-Year Pre-Orientation Counselor",
  "Volunteer with DynaMIT, MIT's free STEM program for Boston middle schoolers",
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
    body: "Peter J. Eloranta Fellow (top 6 MIT proposals). Studied how methionine restriction changes antigen presentation between macrophages and CD8+ T cells using flow cytometry, cell culture, and Western blotting.",
  },
  {
    org: "MIT Computer Science & Artificial Intelligence Lab",
    when: "Sep 2023 – Oct 2024",
    body: "Applied the deep learning model Enformer to 684 human-specific regulatory regions; found most mapped to astrocyte function and digestive regulation. Co-author on a manuscript in preparation; posters at the European Association for Cancer Research and the MIT Bioengineering Annual Conference.",
  },
  {
    org: "Beth Israel Lahey Health",
    when: null,
    body: "Built the Health Sustainability Normalized Index to compare surgical procedures by environmental impact. First author on the manuscript.",
  },
  {
    org: "Massachusetts General Hospital",
    when: "Summer 2025",
    body: "MIT Clinical Prehealth Research Extern (one of five selected), anesthesiology and perioperative care.",
  },
  {
    org: "Utah Health Policy Project",
    when: "Summer 2024",
    body: "Jeffrey L. Pressman Award (health policy research, Summer 2024). Analyzed Utah Medicare and Medicaid; authored a policy pamphlet distributed to Utah State Senate offices.",
  },
  { org: "NASA L'SPACE", when: null, body: "Lead author on a probiotic biomaterials proposal for long-duration spaceflight, selected as a top 15 project nationally." },
  { org: "MIT Social and Ethical Responsibilities of Computing", when: "2023–24", body: "Scholar (2023–24): medical chatbot research." },
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
  "TA, MIT Beaver Works Summer Institute Medlytics (Caring Coach Award)",
];

export const honors = [
  "MIT Sloan Legatum Fellow, 2024–25 (sole undergraduate)",
  "Burchard Scholar, 2024–25",
  "OME Prize sponsored by Chevron, Fall 2023 (top science and engineering students)",
  "BCAP Fellow, 2024 (public health service project)",
  "PKG IDEAS Finalist and Top 2 Public Voting Winner, 2024",
];

export const mudzi = {
  name: "Mudzi Cooking Project",
  body: "Co-founder and co-director of a social enterprise in rural Malawi replacing firewood with clean-burning briquettes she formulated from cornhusk and agricultural waste.",
  figures: [
    { value: "5,000", label: "women engaged" },
    { value: "1.5 million", label: "briquettes produced" },
    { value: "$14,000", label: "raised" },
  ],
  more: "UN-subsidiary contract secured. PKG IDEAS Finalist; Princeton TigerLaunch finalist.",
};

export const bio =
  "I'm an MIT senior studying Chemistry & Molecular Biology and Neuroscience, headed to medical school for plastic surgery. I scored a 522 on the MCAT in January 2026 and was admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn. I've done research in immunology, computational genomics, and surgical sustainability, TA'd MIT chemistry and neuroscience courses, and co-founded the Mudzi Project in Malawi. I teach the way I wish I'd been taught: clearly, directly, and built around you.";

export const paymentNote = "Payment via Zelle. Details are sent after your consult call.";

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
