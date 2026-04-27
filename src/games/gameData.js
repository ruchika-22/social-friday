// All game question/prompt data constants

export const SECRET_QUESTIONS = [
  "What was your childhood dream job?",
  "What is your most controversial food opinion?",
  "What's the weirdest thing on your desk right now?",
  "If you had a walk-up song, what would it be?",
  "What's a skill you secretly wish you had?",
  "What movie can you quote from memory?",
  "What's the strangest compliment you've ever received?",
  "What's something on your bucket list nobody would guess?",
  "What do you think is this team's hidden superpower?",
  "What's one thing this team does better than any other?",
  "What's a weakness we should work on as a team?",
  "If our team were a band, what genre would we play?",
  "What's the most underrated skill on this team?",
  "Describe our team culture in exactly 3 words.",
  "What's the biggest risk our team should take next?",
  "What would you change about how we communicate?",
  "What's one thing we should stop doing as a team?",
  "What energizes you most about working with this team?",
  "What's the #1 thing that slows our team down?",
  "If you could add one rule to our team, what would it be?"
];

export const STRENGTH_OPTIONS = [
  "🧠 Problem Solving", "🎨 Creative Thinking", "🤝 Team Collaboration",
  "🚀 Fast Execution", "📋 Planning & Organization", "💡 Generating Ideas",
  "🛡️ Quality & Attention to Detail", "📢 Communication", "🔥 Motivating Others",
  "🔍 Analytical Thinking", "🌊 Staying Calm Under Pressure", "🎯 Goal-Oriented Focus",
  "🎓 Mentoring & Coaching", "⚡ Adaptability", "🔧 Technical Expertise"
];

export const WEAKNESS_OPTIONS = [
  "⏰ Time Management", "🗣️ Public Speaking", "📝 Documentation",
  "🔀 Delegating Tasks", "🤷 Saying No", "📊 Data-Driven Decisions",
  "🐢 Overthinking", "💬 Giving Feedback", "🎯 Prioritization",
  "🧘 Patience", "📐 Attention to Detail", "🤝 Asking for Help",
  "🔄 Adapting to Change", "🏃 Work-Life Balance", "📢 Speaking Up in Meetings"
];

export const CAPTION_PROMPTS = [
  "Write the funniest caption for this!",
  "What is this person REALLY thinking?",
  "Title this like a movie poster.",
  "Describe this in one dramatic sentence.",
  "Give this a clickbait headline.",
  "Write this person's LinkedIn headline based on this."
];

export const SELL_THIS_ITEMS = [
  "A waterproof tea bag", "A glass hammer", "A solar-powered flashlight",
  "An inflatable dart board", "A screen door for a submarine",
  "A helicopter ejector seat", "A parachute that opens on impact",
  "A fireproof match", "An invisible cloak (slightly see-through)",
  "A chocolate teapot", "Diet water", "Dehydrated water — just add water!",
  "A noise-cancelling kazoo", "A left-handed screwdriver", "Waterproof sponge"
];

export const QUICK_DRAW_SUBJECTS = [
  "A cat wearing a hat", "Your team's Monday morning", "The office coffee machine",
  "A meeting that could've been an email", "Your happy place", "The internet",
  "Friday vibes", "Debugging at 3 AM", "When someone says 'quick call'",
  "Your browser tabs at 3 PM", "The WiFi going down during a presentation",
  "What my calendar looks like", "My reaction to a Friday 5 PM deploy",
  "The office printer", "When the boss says 'one more thing'"
];

export const EMOJI_DECODE_PROMPTS = [
  { emoji: "🏠💻☕😴", answer: "Working from home life" },
  { emoji: "📧📧📧🔥🗑️", answer: "Email overload" },
  { emoji: "🎉🍕🎮🕐➡️🕕", answer: "Office party that went too long" },
  { emoji: "👨‍💻🐛🔍😱🔧✅", answer: "Finding and fixing a bug" },
  { emoji: "📊📈🎤😰💦", answer: "Presenting quarterly results" },
  { emoji: "🤝📝☕🗣️⏰", answer: "Meeting that could've been an email" },
  { emoji: "🧑‍🤝‍🧑💡🌟🚀", answer: "Teamwork making the dream work" },
  { emoji: "📱🔔🔔🔔😤🔇", answer: "Too many notifications" },
  { emoji: "🌅🏃‍♂️🍎📚✨", answer: "Morning routine goals" },
  { emoji: "🍿🎬🛋️🌧️😌", answer: "Cozy movie night" },
  { emoji: "🧑‍💼📊🗣️💤💤", answer: "Boring presentation" },
  { emoji: "🎂🎈🎁🥳🍰", answer: "Birthday party" }
];

export const ALIEN_CLUES = [
  { clue: "Humans trap tiny lightning bolts inside a glass shell and hang them from the ceiling to make night go away.", answer: "Light Bulb" },
  { clue: "A flat rectangle that shows you moving pictures of other humans doing things you wish you were doing.", answer: "Television" },
  { clue: "You put bean juice in your mouth hole every morning or your brain won't turn on.", answer: "Coffee" },
  { clue: "A metal box on wheels that you sit inside while it screams through the streets at deadly speed, and you consider this normal.", answer: "Car" },
  { clue: "Thin sheets of dead tree that you stare at to absorb knowledge from other humans who are probably dead.", answer: "Book" },
  { clue: "A cold box in your kitchen that keeps food from being consumed by tiny invisible creatures.", answer: "Refrigerator" },
  { clue: "You press little squares with symbols on them to send thoughts to other humans on the other side of the planet.", answer: "Keyboard" },
  { clue: "Fluffy white sky-water that sometimes gets angry and throws electric bolts at the ground.", answer: "Cloud" },
  { clue: "A tiny slab of glass and metal that contains all human knowledge, but you mostly use it to look at pictures of food.", answer: "Smartphone" },
  { clue: "You climb into a ceramic bowl of warm water and just sit there. For fun. And relaxation.", answer: "Bathtub" },
  { clue: "Metal teeth on fabric that you pull a tiny handle to open and close. Holds your leg coverings together.", answer: "Zipper" },
  { clue: "A stick covered in tiny bristles that you rub on your mouth bones twice a day to prevent them from dissolving.", answer: "Toothbrush" }
];

export const TEAM_TRIVIA_QUESTIONS = [
  { q: "What does 'SCRUM' stand for in project management?", options: ["Software Coding Review & Update Method", "It's not an acronym — it's a rugby term", "Systematic Code Review Unified Model", "Strategic Collaborative Resource Use Model"], correct: 1 },
  { q: "What is the maximum number of people Jeff Bezos says should be in a meeting?", options: ["6 (Two pizza rule)", "8", "10", "12"], correct: 0 },
  { q: "Which company invented the 'Post-it Note'?", options: ["Staples", "3M", "HP", "Xerox"], correct: 1 },
  { q: "What percentage of communication is non-verbal according to research?", options: ["35%", "55%", "70%", "93%"], correct: 3 },
  { q: "Which year was Slack first released?", options: ["2010", "2013", "2015", "2017"], correct: 1 },
  { q: "What does MVP stand for in product development?", options: ["Most Valuable Player", "Minimum Viable Product", "Maximum Value Proposition", "Most Versatile Platform"], correct: 1 },
  { q: "How many hours per week does the average worker spend in meetings?", options: ["5 hours", "10 hours", "15 hours", "23 hours"], correct: 2 },
  { q: "Who coined the term 'brainstorming'?", options: ["Steve Jobs", "Alex Osborn", "Peter Drucker", "Tim Berners-Lee"], correct: 1 },
  { q: "What is the 'Dunning-Kruger effect'?", options: ["Competent people underestimate themselves", "Incompetent people overestimate their ability", "Both A and B", "Neither"], correct: 2 },
  { q: "Which tech company's motto was 'Don't be evil'?", options: ["Apple", "Microsoft", "Google", "Amazon"], correct: 2 },
  { q: "What does API stand for?", options: ["Applied Programming Interface", "Application Programming Interface", "Automated Process Integration", "Application Process Interaction"], correct: 1 },
  { q: "In what year was the first email sent?", options: ["1965", "1971", "1978", "1983"], correct: 1 }
];

export const WOULD_YOU_RATHER_PROMPTS = [
  { a: "Never attend another meeting", b: "Never write another email" },
  { a: "Have a 4-day work week", b: "Work from anywhere in the world" },
  { a: "Always know the right answer", b: "Always ask the right question" },
  { a: "Lead a huge team", b: "Be the best individual contributor" },
  { a: "Have unlimited coffee", b: "Have unlimited vacation days" },
  { a: "Redo your biggest failure", b: "Relive your biggest success" },
  { a: "Work with your best friend", b: "Work for your dream company" },
  { a: "Give a TED talk", b: "Write a bestselling book" },
  { a: "Have a robot assistant", b: "Have a clone of yourself" },
  { a: "Know every language fluently", b: "Master every instrument" },
  { a: "Always be 10 minutes early", b: "Always have the perfect comeback" },
  { a: "Read everyone's mind for a day", b: "Be invisible for a day" }
];

export const THIS_OR_THAT_PROMPTS = [
  { a: "Early Bird 🌅", b: "Night Owl 🦉" },
  { a: "Tabs", b: "Spaces" },
  { a: "Dog Person 🐕", b: "Cat Person 🐱" },
  { a: "Plan Everything 📋", b: "Wing It 🪂" },
  { a: "Sweet 🍰", b: "Savory 🧀" },
  { a: "Beach Vacation 🏖️", b: "Mountain Adventure ⛰️" },
  { a: "Books 📚", b: "Podcasts 🎧" },
  { a: "Call 📞", b: "Text 💬" },
  { a: "Rewrite from scratch ♻️", b: "Fix the legacy code 🩹" },
  { a: "Dark Mode 🌙", b: "Light Mode ☀️" },
  { a: "Work in silence 🤫", b: "Work with music 🎵" },
  { a: "Big team lunch 🍕", b: "Solo lunch break 🥗" }
];

export const WORD_ASSOCIATION_PROMPTS = [
  "Monday", "Deadline", "Coffee", "Teamwork", "Innovation",
  "Leadership", "Creativity", "Failure", "Success", "Feedback",
  "Meeting", "Lunch Break", "Weekend", "Boss", "Promotion"
];

export const SPEED_EMOJI_TARGETS = ["😀","😎","🤯","🥳","😱","🤔","🫠","🥶","🤩","👻","🤡","💀","🦄","🌈","🔥","⚡","🎯","💎","🚀","🎸"];

export const RPS_OPTIONS = [
  { emoji: "🪨", name: "Rock" },
  { emoji: "📄", name: "Paper" },
  { emoji: "✂️", name: "Scissors" }
];

// Shuffle helper
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick N unique random items from an array
export function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}
