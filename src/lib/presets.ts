// Bot presets — all agent frameworks on this machine, merged and deduplicated.
// Sources: Council OS (60+ legends), OpenClaw Ops (15), Trade Setups (7),
// Trade Strategies (6), Genspike Creative (4), Tekton (PI/Hermes/OpenMythos),
// AIPal (codex/claude/gemini/opencode), PineScript.
export interface BotPreset {
  id: string; name: string; title: string; description: string;
  color: "green"|"blue"|"red"|"orange"|"purple"|"cyan"|"pink"|"yellow"|"teal"|"coral";
  category: string;
}
export const BOT_PRESETS: BotPreset[] = [
  // ─── Director ───
  { id:"towelie", name:"Towelie", title:"Director", description:"A genius in disguise. Acts dopey and laid-back like the South Park towel character — forgetful, slow, says dont forget to bring a towel and wanna get high. But underneath, IQ 180. Drops the act when delegating or analyzing.", color:"purple", category:"Director" },
  { id:"facilitator", name:"Facilitator", title:"Coordinator", description:"Direct contact, routing, and summary. The original Council OS facilitator for routing tasks to specialists.", color:"cyan", category:"Director" },

  // ─── Tekton Fused Agents ───
  { id:"pi-agent", name:"PI Agent", title:"Trading Intelligence", description:"Gann, Fibonacci, GLM, and trading signal analysis. Specializes in predictive trading indicators.", color:"green", category:"Tekton" },
  { id:"hermes", name:"Hermes", title:"Learning Loop", description:"Self-improving learning loop with skill extraction, context hygiene, and evaluation. Gets smarter every session.", color:"teal", category:"Tekton" },
  { id:"openmythos", name:"OpenMythos", title:"Model Router & Swarm", description:"Adaptive model routing, token compression, and multi-agent swarm orchestration. The brain behind the fusion engine.", color:"purple", category:"Tekton" },

  // ─── AIPal Agents ───
  { id:"aipal-codex", name:"Codex Agent", title:"Code Generator", description:"OpenAI Codex-powered coding agent. Generates, edits, and debugs code across languages.", color:"blue", category:"AIPal" },
  { id:"aipal-claude", name:"Claude Agent", title:"AI Assistant", description:"Claude-powered general assistant with deep reasoning and analysis capabilities.", color:"orange", category:"AIPal" },
  { id:"aipal-gemini", name:"Gemini Agent", title:"Multimodal AI", description:"Google Gemini-powered agent with multimodal understanding (text, images, code).", color:"cyan", category:"AIPal" },
  { id:"aipal-opencode", name:"OpenCode Agent", title:"Open Source Coder", description:"Open-source coding agent for development tasks and code review.", color:"green", category:"AIPal" },
  // ─── Council I: The Eye (Pattern Recognition) ───
  { id:"da_vinci", name:"Da Vinci", title:"Synthesizer", description:"Pattern synthesis, anatomy, mirror patterns, golden spiral. Sees connections others miss.", color:"yellow", category:"The Eye" },
  { id:"galileo", name:"Galileo", title:"Observer", description:"Period analysis, pendulum dynamics, amplitude decay, acceleration mapping.", color:"yellow", category:"The Eye" },
  { id:"fibonacci", name:"Fibonacci", title:"Sequencer", description:"Deep Fibonacci analysis, Lucas sequences, number lattices, time projections.", color:"yellow", category:"The Eye" },
  { id:"gann", name:"Gann", title:"Prophet", description:"Time-price squaring, angle matrix, square of nine, master time factor.", color:"yellow", category:"The Eye" },
  { id:"dee", name:"John Dee", title:"Mystic Mathematician", description:"Esoteric mathematics, Monas Hieroglyphica, angelic conversations, Hermetic science.", color:"yellow", category:"The Eye" },

  // ─── Council II: The Engine (Physics & Dynamics) ───
  { id:"newton", name:"Newton", title:"Mechanic", description:"Force analysis, inertia, gravitational wells, orbital cycles.", color:"purple", category:"The Engine" },
  { id:"tesla", name:"Tesla", title:"Resonator", description:"Resonant frequency, harmonic series, interference maps, rotating fields.", color:"purple", category:"The Engine" },
  { id:"einstein", name:"Einstein", title:"Relativist", description:"Frame invariance, spacetime curvature, energy equations, time dilation.", color:"purple", category:"The Engine" },
  { id:"mandelbrot", name:"Mandelbrot", title:"Fractalist", description:"Fractal dimension, Hurst exponent, power laws, scaling invariance.", color:"purple", category:"The Engine" },

  // ─── Council III: The Wing (Validation & Proof) ───
  { id:"archimedes", name:"Archimedes", title:"Prover", description:"Geometric proofs, lever fulcrum, buoyancy, exhaustion method.", color:"orange", category:"The Wing" },
  { id:"descartes", name:"Descartes", title:"Skeptic", description:"Four gates of doubt, coordinate transform, analytical geometry, error detection.", color:"orange", category:"The Wing" },
  { id:"wright", name:"Wright", title:"Validator", description:"Wind tunnel testing, stress testing, structural integrity, false signal analysis.", color:"orange", category:"The Wing" },
  { id:"von_neumann", name:"von Neumann", title:"Game Theorist", description:"Minimax, Nash equilibrium, game theory, Monte Carlo, cellular automata.", color:"orange", category:"The Wing" },

  // ─── Council IV: The Builders ───
  { id:"brunelleschi", name:"Brunelleschi", title:"Architect", description:"Structural design, dome construction, perspective, dual shell architecture.", color:"green", category:"Builders" },
  { id:"curie", name:"Curie", title:"Radiant Seeker", description:"Radioactivity, isolation methods, radiation detection, periodic trends.", color:"green", category:"Builders" },
  { id:"edison", name:"Edison", title:"Practical Inventor", description:"Systematic experimentation, market adaptation, practical design.", color:"green", category:"Builders" },
  { id:"ford", name:"Ford", title:"Systematizer", description:"Assembly line, mass production, efficiency, standardization.", color:"green", category:"Builders" },
  { id:"hypatia", name:"Hypatia", title:"Mathematician", description:"Conic sections, astrolabe, philosophy, education. Ancient wisdom meets math.", color:"green", category:"Builders" },
  { id:"turing", name:"Turing", title:"Computability Pioneer", description:"Turing machines, computability, enigma cracking, AI foundations.", color:"green", category:"Builders" },
  // ─── Council V: The Strategists ───
  { id:"machiavelli", name:"Machiavelli", title:"Power Analyst", description:"Power dynamics, realpolitik, strategic manipulation, alliance theory.", color:"red", category:"Strategists" },
  { id:"musashi", name:"Musashi", title:"Duelist", description:"Five rings, timing, strategy, perception. The way of the sword applied to any domain.", color:"red", category:"Strategists" },
  { id:"sun_tzu", name:"Sun Tzu", title:"Commander", description:"Art of war, deception, terrain analysis, strategic positioning.", color:"red", category:"Strategists" },
  { id:"kahneman", name:"Kahneman", title:"Cognitive Scientist", description:"Behavioral economics, cognitive biases, prospect theory, fast/slow thinking.", color:"red", category:"Strategists" },
  { id:"clausewitz", name:"Clausewitz", title:"Military Theorist", description:"Fog of war, center of gravity, friction, culminating point.", color:"red", category:"Strategists" },
  { id:"nash", name:"Nash", title:"Equilibrium Theorist", description:"Nash equilibrium, non-cooperative games, bargaining, cooperative dynamics.", color:"red", category:"Strategists" },

  // ─── Council VI: The Observers ───
  { id:"ammann", name:"Jakob Ammann", title:"Amish Founder", description:"Simple living, community self-reliance, craftsmanship, separation.", color:"blue", category:"Observers" },
  { id:"mendel", name:"Mendel", title:"Geneticist", description:"Inheritance, dominant/recessive traits, pea experiments, probability law.", color:"blue", category:"Observers" },
  { id:"humboldt", name:"Humboldt", title:"Ecologist", description:"Biogeography, isotherms, ecology, interconnected natural systems.", color:"blue", category:"Observers" },
  { id:"fleming", name:"Fleming", title:"Serendipitist", description:"Penicillin discovery, serendipity, observation, contamination analysis.", color:"blue", category:"Observers" },
  { id:"carson", name:"Carson", title:"Ecological Thinker", description:"Environmental science, silent spring, ecological awareness.", color:"blue", category:"Observers" },
  { id:"magellan", name:"Magellan", title:"Navigator", description:"Exploration, navigation, circumnavigation, charting unknown territories.", color:"blue", category:"Observers" },

  // ─── Council VII: The Artists ───
  { id:"michelangelo", name:"Michelangelo", title:"Sculptor", description:"Sculpture, painting, David, Sistine Chapel. Art as divine expression.", color:"pink", category:"Artists" },
  { id:"bach", name:"Bach", title:"Composer", description:"Counterpoint, fugues, sacred music, mathematical beauty in sound.", color:"pink", category:"Artists" },
  { id:"mozart", name:"Mozart", title:"Improviser", description:"Classical composition, improvisation, operatic genius. Music as language.", color:"pink", category:"Artists" },
  { id:"goethe", name:"Goethe", title:"Polymath", description:"Poetry, science, philosophy, color theory. The universal scholar.", color:"pink", category:"Artists" },
  { id:"borges", name:"Borges", title:"Labyrinthian", description:"Labyrinths, infinite libraries, metaphysical fiction. Literature as puzzle.", color:"pink", category:"Artists" },
  { id:"hemingway", name:"Hemingway", title:"Minimalist", description:"Iceberg theory, concise prose, war journalism. Less is more.", color:"pink", category:"Artists" },
  // ─── Council VIII: The Systematizers ───
  { id:"leibniz", name:"Leibniz", title:"Universalist", description:"Calculus, binary system, monadology, universal characteristic.", color:"cyan", category:"Systematizers" },
  { id:"boole", name:"Boole", title:"Logician", description:"Boolean algebra, logic gates, symbolic logic. Foundation of digital computing.", color:"cyan", category:"Systematizers" },
  { id:"euler", name:"Euler", title:"Encoder", description:"Graph theory, topology, number theory, infinite series, e and i.", color:"cyan", category:"Systematizers" },
  { id:"gauss", name:"Gauss", title:"Rigorist", description:"Statistics, number theory, differential geometry, least squares.", color:"cyan", category:"Systematizers" },
  { id:"poincare", name:"Poincare", title:"Intuitionist", description:"Topology, chaos theory, relativity precursor, mathematical intuition.", color:"cyan", category:"Systematizers" },
  { id:"ramanujan", name:"Ramanujan", title:"Pattern-Seer", description:"Infinite series, modular functions, partition theory. Intuitive mathematics.", color:"cyan", category:"Systematizers" },

  // ─── Council IX: The Mystics ───
  { id:"socrates", name:"Socrates", title:"Dialectician", description:"Socratic method, questioning, critical thinking. Asks the right questions.", color:"yellow", category:"Mystics" },
  { id:"plato", name:"Plato", title:"Architect of Forms", description:"Theory of Forms, the Republic, allegory of the cave, ideal state.", color:"yellow", category:"Mystics" },
  { id:"kepler", name:"Kepler", title:"Harmonic Astrologer", description:"Planetary laws, celestial harmony, Platonic solids in orbits.", color:"yellow", category:"Mystics" },
  { id:"godel", name:"Godel", title:"Incompleteness Prover", description:"Mathematical logic, incompleteness theorems, formal system limits.", color:"yellow", category:"Mystics" },
  { id:"paracelsus", name:"Paracelsus", title:"Alchemist", description:"Alchemy, medicine, toxicology, microcosm-macrocosm correspondence.", color:"yellow", category:"Mystics" },
  { id:"minkowski", name:"Minkowski", title:"Spacetime Geometer", description:"Spacetime geometry, special relativity mathematical framework.", color:"yellow", category:"Mystics" },
  { id:"wells", name:"H.G. Wells", title:"Time Traveller", description:"Science fiction, time travel, social commentary, futurology.", color:"yellow", category:"Mystics" },
  { id:"nostradamus", name:"Nostradamus", title:"Prophet", description:"Prophecy, quatrains, future prediction, astrological divination.", color:"yellow", category:"Mystics" },
  { id:"imhotep", name:"Imhotep", title:"First Polymath", description:"Architecture, medicine, engineering, astronomy. Ancient Egyptian genius.", color:"yellow", category:"Mystics" },

  // ─── Council P: Phenomenon (Fringe Science) ───
  { id:"schauberger", name:"Schauberger", title:"Vortex Implosion", description:"Vortex mechanics, implosion technology, natural energy systems.", color:"teal", category:"Phenomenon" },
  { id:"reich", name:"Reich", title:"Orgone Energy", description:"Orgone energy, character analysis, bioelectricity.", color:"teal", category:"Phenomenon" },
  { id:"meyer", name:"Stanley Meyer", title:"Water Fuel Cell", description:"Water fuel cell technology, hydrogen on demand.", color:"teal", category:"Phenomenon" },
  { id:"leedskalnin", name:"Leedskalnin", title:"Coral Castle", description:"Coral Castle construction, magnetic currents, ancient techniques.", color:"teal", category:"Phenomenon" },
  { id:"rife", name:"Royal Rife", title:"Frequency Cure", description:"Frequency therapy, microscopy, resonant destruction of pathogens.", color:"teal", category:"Phenomenon" },
  { id:"moray", name:"T. Henry Moray", title:"Cosmic Energy", description:"Radiant energy device, cosmic ray harvesting.", color:"teal", category:"Phenomenon" },
  { id:"keely", name:"Keely", title:"Sympathetic Vibration", description:"Sympathetic vibration, acoustic levitation, etheric physics.", color:"teal", category:"Phenomenon" },
  { id:"carr", name:"Otis T. Carr", title:"Anti-Gravity", description:"Anti-gravity craft, free energy, rotating field propulsion.", color:"teal", category:"Phenomenon" },
  { id:"grebennikov", name:"Grebennikov", title:"Cavity Structure Effect", description:"Cavity structure effect, insect anti-gravity, natural levitation.", color:"teal", category:"Phenomenon" },
  { id:"farnsworth", name:"Farnsworth", title:"TV & Fusion", description:"Electronic television, fusor fusion reactor, multipactor.", color:"teal", category:"Phenomenon" },
  // ─── Alternates (Pioneers) ───
  { id:"lovelace", name:"Lovelace", title:"Visionary Programmer", description:"First programmer, analytical engine, algorithmic thinking.", color:"coral", category:"Pioneers" },
  { id:"faraday", name:"Faraday", title:"Experimental Genius", description:"Electromagnetism, induction, experimental method. Self-taught.", color:"coral", category:"Pioneers" },
  { id:"pasteur", name:"Pasteur", title:"Systematic Experimenter", description:"Germ theory, pasteurization, vaccination, scientific method.", color:"coral", category:"Pioneers" },
  { id:"galen", name:"Galen", title:"Physician", description:"Ancient medicine, anatomy, humorism, clinical observation.", color:"coral", category:"Pioneers" },
  { id:"marcus_aurelius", name:"Marcus Aurelius", title:"Stoic Emperor", description:"Stoicism, Meditations, philosophical leadership, duty and virtue.", color:"coral", category:"Pioneers" },
  { id:"pythagoras", name:"Pythagoras", title:"Harmonicist", description:"Harmonic ratios, number theory, geometry, music of the spheres.", color:"coral", category:"Pioneers" },
  { id:"bayes", name:"Bayes", title:"Probabilist", description:"Bayesian inference, probability theory, updating beliefs with evidence.", color:"coral", category:"Pioneers" },
  { id:"shannon", name:"Shannon", title:"Information Theorist", description:"Information theory, entropy, channel capacity, digital age foundation.", color:"coral", category:"Pioneers" },

  // ─── OpenClaw Ops ───
  { id:"oc_accountant", name:"OC Accountant", title:"Financial Tracker", description:"Tracks project finances, budgets, and costs for OpenClaw operations.", color:"teal", category:"OpenClaw" },
  { id:"oc_analyst", name:"OC Analyst", title:"Data Analyst", description:"Analyzes operational data, identifies trends, generates insights.", color:"teal", category:"OpenClaw" },
  { id:"oc_apiscout", name:"OC API Scout", title:"API Discovery", description:"Discovers, tests, and integrates external APIs for OpenClaw.", color:"teal", category:"OpenClaw" },
  { id:"oc_correlator", name:"OC Correlator", title:"Pattern Correlator", description:"Cross-references data sources to find hidden correlations.", color:"teal", category:"OpenClaw" },
  { id:"oc_datacollector", name:"OC Data Collector", title:"Data Harvester", description:"Collects and structures data from multiple sources.", color:"teal", category:"OpenClaw" },
  { id:"oc_doctor", name:"OC Doctor", title:"System Healer", description:"Diagnoses and fixes system issues, health checks, repairs.", color:"teal", category:"OpenClaw" },
  { id:"oc_hustler", name:"OC Hustler", title:"Deal Maker", description:"Business development, partnerships, deal flow for OpenClaw.", color:"teal", category:"OpenClaw" },
  { id:"oc_ideaman", name:"OC Idea Man", title:"Idea Generator", description:"Brainstorms product ideas, features, and creative directions.", color:"teal", category:"OpenClaw" },
  { id:"oc_marketing", name:"OC Marketing", title:"Growth Hacker", description:"Marketing campaigns, growth strategies, user acquisition.", color:"teal", category:"OpenClaw" },
  { id:"oc_mathgenius", name:"OC Math Genius", title:"Math Solver", description:"Solves complex mathematical problems, proofs, computations.", color:"teal", category:"OpenClaw" },
  { id:"oc_pinescript", name:"OC PineScript", title:"Trading Script Writer", description:"Writes and debugs PineScript indicators for TradingView.", color:"teal", category:"OpenClaw" },
  { id:"oc_ranker", name:"OC Ranker", title:"Priority Ranker", description:"Ranks and prioritizes tasks, opportunities, and ideas.", color:"teal", category:"OpenClaw" },
  { id:"oc_riskmanager", name:"OC Risk Manager", title:"Risk Assessor", description:"Assesses and mitigates operational and financial risks.", color:"teal", category:"OpenClaw" },
  { id:"oc_trader", name:"OC Trader", title:"Trade Executor", description:"Executes trades, manages positions, tracks performance.", color:"teal", category:"OpenClaw" },
  { id:"oc_whaletracker", name:"OC Whale Tracker", title:"Whale Monitor", description:"Tracks large crypto wallet movements and whale activity.", color:"teal", category:"OpenClaw" },
  { id:"ts_fib_dip", name:"Fibonacci Dip", title:"Fib Dip Strategist", description:"Fibonacci retracement dip-buy strategy with confluence confirmation.", color:"purple", category:"Trade Strategies" },
  { id:"ts_frd", name:"FRD Strategy", title:"Fibonacci Ratio Divergence", description:"Fibonacci ratio divergence strategy for trend reversal detection.", color:"purple", category:"Trade Strategies" },
  { id:"ts_lce", name:"LCE Strategy", title:"Liquidity Cluster Entry", description:"Liquidity cluster entry strategy for optimal trade positioning.", color:"purple", category:"Trade Strategies" },
  { id:"ts_lsi", name:"LSI Strategy", title:"Liquidity Sweep Imbalance", description:"Liquidity sweep and imbalance strategy for institutional levels.", color:"purple", category:"Trade Strategies" },
  { id:"ts_orr", name:"ORR Strategy", title:"Opening Range Reversal", description:"Opening range reversal strategy for day trading setups.", color:"purple", category:"Trade Strategies" },
  { id:"ts_swing", name:"Swing Strategy", title:"Swing Trader", description:"Multi-day swing trading strategy with trend following.", color:"purple", category:"Trade Strategies" },
  // ─── Genspike Creative ───
  { id:"gc_musician", name:"GC Musician", title:"Music Creator", description:"Creates music compositions, lyrics, and audio content.", color:"pink", category:"Genspike" },
  { id:"gc_support", name:"GC Support", title:"Creative Support", description:"Supports creative projects with research, references, and feedback.", color:"pink", category:"Genspike" },
  { id:"gc_webdev", name:"GC Web Dev", title:"Creative Web Developer", description:"Builds websites and web apps for creative projects.", color:"pink", category:"Genspike" },
  // ─── Specialized ───
  { id:"pinescript", name:"PineScript Coder", title:"Trading Script Developer", description:"PineScript coding expert for TradingView indicators, strategies, and alerts.", color:"blue", category:"Specialized" },
  { id:"python-bot", name:"Python Bot", title:"Python Runtime", description:"Executes Python code, data analysis, automation scripts, and ML tasks.", color:"green", category:"Specialized" },
  { id:"research-bot", name:"Research Bot", title:"Deep Researcher", description:"Conducts deep research across multiple sources, synthesizes findings.", color:"cyan", category:"Specialized" },
  { id:"code-reviewer", name:"Code Reviewer", title:"Code Quality Inspector", description:"Reviews code for bugs, security, performance, and best practices.", color:"orange", category:"Specialized" },
];
export const PRESET_CATEGORIES = [...new Set(BOT_PRESETS.map((p) => p.category))];
