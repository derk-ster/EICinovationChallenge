/**
 * Official EIC Innovation Challenge content.
 *
 * Every public statement about the competition lives here so officers can
 * update wording in one place. Dates, deadlines and submission availability
 * are NOT stored here — they live in the competition settings that officers
 * edit from the dashboard (see src/lib/settings.ts).
 */

export const competition = {
  name: "EIC Innovation Challenge",
  club: "Entrepreneurship & Investment Club",
  clubShort: "EIC",
  school: "Liberty High School",
  prize: {
    amount: 75,
    label: "Grand Prize Gift Card",
    detail:
      "The highest-scoring student or team receives one $75 gift card. For team submissions, the prize is awarded to the team as a whole.",
  },
  videoMinSeconds: 120,
  videoMaxSeconds: 180,
  maxTeamSize: 2,
  grades: [9, 10, 11, 12] as const,
  /** Bump this when the official rules text changes; stored with each agreement. */
  rulesVersion: "2026-1",
} as const;

export const hero = {
  headline: "Turn your idea into something real.",
  supporting:
    "Develop an original product, business, website, app, or service. Bring your idea to life and compete for a $75 grand prize.",
  facts: [
    "$75 Grand Prize",
    "Free Entry",
    "Individual or Teams of 2",
    "Open to Liberty High School Students",
  ],
};

export const overview = {
  lead: "The EIC Innovation Challenge is an entrepreneurship competition organized by the Entrepreneurship & Investment Club at Liberty High School.",
  body: "Develop an original idea for a product, website, application, service, or business. Submit a mockup or prototype alongside a short presentation video.",
  encourages: [
    "Innovation",
    "Creativity",
    "Problem-solving",
    "Entrepreneurial thinking",
    "Business development",
  ],
  reassurance: [
    {
      title: "No business experience needed",
      body: "You don’t need to have started anything before. Curiosity and effort count.",
    },
    {
      title: "No advanced coding required",
      body: "A sketch, a slide deck or a cardboard model is a valid starting point.",
    },
    {
      title: "No finished product required",
      body: "Judges look at the idea, how you executed it and where it could go — not how much you spent.",
    },
  ],
};

export const eligibility = [
  { rule: "Open to Liberty High School students.", group: "who" },
  { rule: "Participate individually or in a team.", group: "who" },
  { rule: "Teams have a maximum of two students.", group: "who" },
  { rule: "One submission per student or team.", group: "entry" },
  { rule: "No previous business experience required.", group: "entry" },
  { rule: "Participation is completely free.", group: "cost" },
  { rule: "No entry fee or required purchase.", group: "cost" },
] as const;

export type CategoryId =
  | "physical-product"
  | "website-app"
  | "business-startup"
  | "service"
  | "software-tool"
  | "improvement";

export const categories: {
  id: CategoryId;
  title: string;
  short: string;
  example: string;
}[] = [
  {
    id: "physical-product",
    title: "Physical products",
    short: "Something you can hold, use or build.",
    example: "A better backpack strap, a desk organizer, a reusable lunch kit.",
  },
  {
    id: "website-app",
    title: "Websites or applications",
    short: "A digital product people visit or install.",
    example: "A study-group finder, a club sign-up site, a habit tracker.",
  },
  {
    id: "business-startup",
    title: "Businesses or startups",
    short: "A company with customers and a way to earn.",
    example: "A tutoring marketplace, a custom sticker shop, a resale brand.",
  },
  {
    id: "service",
    title: "Services",
    short: "Work you would do for someone else.",
    example: "Bike repair pick-up, senior tech help, event photography.",
  },
  {
    id: "software-tool",
    title: "Software or technology tools",
    short: "Tools, automations or hardware projects.",
    example: "A browser extension, a sensor for plant watering, a grading helper.",
  },
  {
    id: "improvement",
    title: "Improvements to existing products or services",
    short: "Take something that exists and make it better.",
    example: "A redesigned cafeteria line, a smarter locker lock, a clearer bus app.",
  },
];

export const mockupExamples = [
  "Drawings",
  "3D models",
  "Physical prototypes",
  "Website mockups",
  "Working websites",
  "Application screens",
  "Clickable prototypes",
  "Business models",
  "Service demonstrations",
];

export const videoRoadmap = [
  {
    title: "Introduction",
    question: "What is the idea?",
    tip: "Say the name and the idea in one or two sentences.",
  },
  {
    title: "Problem",
    question: "What problem does it solve?",
    tip: "Describe who has the problem and why it matters.",
  },
  {
    title: "Solution",
    question: "How does it work?",
    tip: "Walk through how your idea fixes the problem.",
  },
  {
    title: "Demonstration",
    question: "Show the prototype or mockup.",
    tip: "Screen-record, film your model, or step through your sketches.",
  },
  {
    title: "Target market",
    question: "Who would use or purchase it?",
    tip: "Be specific: which people, how many, where.",
  },
  {
    title: "Business potential",
    question: "How could it generate revenue or create value?",
    tip: "Pricing, subscriptions, partnerships, or the value it creates for people.",
  },
  {
    title: "Competition",
    question: "What makes the idea different?",
    tip: "Name alternatives that already exist and explain your edge.",
  },
];

export type RubricKey =
  | "innovation"
  | "problemSolution"
  | "prototypeExecution"
  | "businessPotential"
  | "presentation"
  | "research";

export const rubric: {
  key: RubricKey;
  title: string;
  points: number;
  looksFor: string;
}[] = [
  {
    key: "innovation",
    title: "Innovation & Creativity",
    points: 20,
    looksFor: "How original the idea is and how creatively it approaches the problem.",
  },
  {
    key: "problemSolution",
    title: "Problem & Solution",
    points: 20,
    looksFor: "How clearly a real problem is defined and how useful the solution is.",
  },
  {
    key: "prototypeExecution",
    title: "Prototype & Execution",
    points: 20,
    looksFor: "How well the mockup or prototype shows the idea and how developed it is.",
  },
  {
    key: "businessPotential",
    title: "Business Potential",
    points: 20,
    looksFor: "Whether the idea could generate revenue or create real value for people.",
  },
  {
    key: "presentation",
    title: "Presentation & Communication",
    points: 10,
    looksFor: "How clearly and confidently the video explains the idea.",
  },
  {
    key: "research",
    title: "Research & Feasibility",
    points: 10,
    looksFor: "Evidence of research and whether the idea could realistically be built.",
  },
];

export const rubricTotal = rubric.reduce((sum, r) => sum + r.points, 0);

export const judgingProcess = [
  "Every eligible submission is evaluated by EIC officers.",
  "There is no separate finalist round.",
  "Judges score each submission independently.",
  "Judges’ scores are averaged to determine the winner.",
];

export const rules: { title: string; body: string }[] = [
  {
    title: "Original work",
    body: "Submissions must be original or meaningfully developed by the student.",
  },
  {
    title: "AI tools may assist",
    body: "AI tools may assist with brainstorming, research, design, coding, and development.",
  },
  {
    title: "Your idea, your decisions",
    body: "The core idea, decision-making, and work must come from the student.",
  },
  {
    title: "No fully AI-generated projects",
    body: "Submitting an entirely AI-generated project as one’s own work is prohibited.",
  },
  {
    title: "Disclose AI use",
    body: "Students must disclose which AI tools they used and how those tools contributed.",
  },
  { title: "No plagiarism", body: "Plagiarism is prohibited." },
  {
    title: "Video length",
    body: "Presentation videos must be between 2 and 3 minutes.",
  },
  { title: "Team size", body: "Teams may contain a maximum of two students." },
  {
    title: "School appropriate",
    body: "Submissions must be appropriate for school.",
  },
  {
    title: "Deadlines",
    body: "Late submissions are not accepted unless an extension is announced.",
  },
  {
    title: "Ownership",
    body: "Students retain ownership of their ideas.",
  },
  {
    title: "Permission to display",
    body: "EIC must obtain permission before publicly displaying or using submissions.",
  },
  {
    title: "Free to enter",
    body: "There is no entry fee or required purchase.",
  },
];

export const aiPolicy = {
  summary:
    "AI can be a tool in your process. It can’t be the author of your project.",
  allowed: [
    "Brainstorming names or angles on an idea you came up with",
    "Researching your market, competitors or materials",
    "Getting feedback on your design or script",
    "Help writing or debugging code you are building",
    "Generating images or assets you then edit and use inside your own design",
  ],
  notAllowed: [
    "Asking an AI to invent the idea and build the whole project for you",
    "Submitting an AI-written business plan or video script without real changes",
    "Presenting AI-generated work as if you made it yourself",
    "Hiding or understating how AI was used",
  ],
  disclosure:
    "On the submission form you’ll list each AI tool you used and describe how it contributed.",
};

export const timeline = [
  {
    key: "announcedAt",
    title: "Competition announcement",
    body: "The challenge is announced and official rules are published.",
  },
  {
    key: "opensAt",
    title: "Idea development",
    body: "You’ll have roughly 3–4 weeks to develop your idea, build a mockup and record your video, subject to the official schedule.",
  },
  {
    key: "deadlineAt",
    title: "Submission",
    body: "Submit your prototype, video and AI disclosure before the deadline.",
  },
  {
    key: "eligibilityReview",
    title: "Eligibility review",
    body: "Officers check that each entry meets the rules.",
  },
  {
    key: "judging",
    title: "Officer judging",
    body: "Each eligible entry is scored independently by EIC officers.",
  },
  {
    key: "winnerAnnouncementAt",
    title: "Winner announcement",
    body: "The winner is announced through official EIC channels.",
  },
] as const;

export const faq: { q: string; a: string }[] = [
  {
    q: "Who can participate?",
    a: "Any Liberty High School student. You can enter on your own or with one partner.",
  },
  {
    q: "Is there an entry fee?",
    a: "No. Entry is completely free and no purchase is required.",
  },
  {
    q: "Can I work with a partner?",
    a: "Yes. Teams can have up to two students. Each student can be part of only one submission.",
  },
  {
    q: "Do I need coding experience?",
    a: "No. You can submit drawings, a physical model, slides, a mockup or a business model. Coding is optional.",
  },
  {
    q: "Does my product need to be fully functional?",
    a: "No. A mockup or prototype that shows the idea is enough. A fully functioning product is not required.",
  },
  {
    q: "Can I use AI tools?",
    a: "Yes, to assist with brainstorming, research, design, coding and development. The core idea, decisions and work must be yours, an entirely AI-generated project is not allowed, and you must disclose which tools you used and how.",
  },
  {
    q: "How long should my video be?",
    a: "Between 2 and 3 minutes. Cover the idea, the problem, your solution, a demonstration, your target market, the business potential and what makes it different.",
  },
  {
    q: "What can I submit?",
    a: "Two things: a mockup or prototype (a file or a link) and a 2–3 minute presentation video (a file or a link).",
  },
  {
    q: "How will entries be judged?",
    a: "EIC officers score every eligible entry independently on a 100-point rubric: innovation and creativity, problem and solution, prototype and execution, business potential (20 points each), and presentation and communication, research and feasibility (10 points each). Scores are averaged. There is no finalist round.",
  },
  {
    q: "What is the grand prize?",
    a: "One $75 gift card for the highest-scoring student or team. Team prizes are awarded to the team as a whole.",
  },
  {
    q: "Who owns my idea?",
    a: "You do. EIC must ask your permission before publicly displaying or using your submission.",
  },
  {
    q: "When are submissions due?",
    a: "The deadline will be shared through official EIC announcements and shown on this site once it is set.",
  },
];
