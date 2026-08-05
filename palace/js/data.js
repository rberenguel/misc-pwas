// PAO entry: { person, action, object }
const p = (person = null, action = null, object = null) => ({ person, action, object });

export const PAO_PEGS = [
    p("Zeus",             "seizing",                    "sauce"),                       //  0
    p("Mr T",             "teeing",              "toe"),                 //  1
    p("Neo",              "no-ing",                   "gnat"),                            //  2
    p("Moe",              "meowing",                    "ham"),                              //  3
    p("Roy",              "rowing",                    "roe"),                             //  4
    p("Eugenio",          "laying",           "loo"),                          //  5
    p("Che Guevara",             "chewing",          "shoe"), //  6
    p("Q",                "hugging",     "key"),                  //  7
    p("V",                "waving",                  "fee"),                              //  8
    p("Apu",              "peeing",    "pie"),                          //  9
    p("Tom Selleck",      "tossing",       "dice"),                    // 10
    p("David Tennant",    "tidying", "toad"),          // 11
    p("Tintin",           "tuning",             "tuna"),                  // 12
    p("Troy McClure",     "timing",               "tome"),                         // 13
    p("Tony Robbins",     "tearing",                "deer"),                     // 14
    p("David Lynch",      "dealing",                   "doily"),   // 15
    p("The Joker",        "dodging",        "dish"),                      // 16
    p("Tim Cook",         "attacking",                  "taco"),                            // 17
    p("Darth Vader",      "diving",             "dove"),                        // 18
    p("David Bowie",      "tipping",                    "tape"),                    // 19
    p("Nancy Sinatra",    "nosing",                   "nose"),                             // 20
    p("Nikola Tesla",     "knighting",                     "knight"),                              // 21
    p("Nino Bravo",       "nannying",          "nun"),                             // 22
    p("Nemo",             "naming",              "gnome"),                         // 23
    p("Nero",             "honoring",                    "noir"),                            // 24
    p("Niles (Crane)",    "kneeling",        "nail"),                      // 25
    p("(John) Nash",      "nudging",              "nacho"),                          // 26
    p("Nog",              "knocking",                  "nuke"),                   // 27
    p("Nathan Fillion",   "envying",      "knife"),                        // 28
    p("Natalie Portman",  "napping",              "napa"),                    // 29
    p("Marge Simpson",    "missing",                  "mouse"),                         // 30
    p("Margaret Thatcher","meeting",           "meat"),                    // 31
    p("Johnny Cash",      "mining",                   "moon"),                 // 32
    p("Marilyn Monroe",   "maiming",              "mime"),                             // 33
    p("Homer",            "marrying",                     "mare"),                             // 34
    p("Millhouse",        "mailing",        "mole"),          // 35
    p("Michael Jordan",   "mashing",                    "match"),                          // 36
    p("Michael Caine",    "mocking",                  "mike"),                      // 37
    p("Humphrey Bogart",  "moving",        "muff"),                    // 38
    p("Mary Poppins",             "moping",                   "map"),                              // 39
    p("Roz (Frasier)",    "raising",                  "rose"),                             // 40
    p("Robert De Niro",   "riding",          "rat"),                              // 41
    p("Rafael Nadal",     "running",               "rhino"),                              // 42
    p("Rambo",            "roaming",                    "rum"),                       // 43
    p("Rory",             "rearing",               "rear"),                        // 44
    p("Ralph Wiggum",     "rolling",                    "roll"),                            // 45
    p("Ronnie James (Dio)","reaching",       "roach"),                  // 46
    p("Rick (Astley)",    "rifling",                   "rifle"),                       // 47
    p("Roger Federer",    "serves as in tennis",                   "Wimbledon trophy"),                  // 48
    p("Rocky Balboa",     "rubbing",                   "rope"),                      // 49
    p("Lisa",             "lassoing",                   "lace"),                         // 50
    p("Linus Torvalds",   "leading",                   "lute"),                       // 51
    p("Lenny",            "leaning",          "lion"),              // 52
    p("Luka Modric",      "looming",                 "llama"),                       // 53
    p("Lrrr (Ruler)",     "luring",            "lyre"),                         // 54
    p("Leela",            "lol'ing",           "lolly"),                     // 55
    p("LeBron James",     "lashing",               "leash"),                        // 56
    p("Lisa Kudrow",      "licking",                    "lego"),                   // 57
    p("Lord Voldemort",   "leaving",                    "loaf"),                              // 58
    p("Little Prince",    "leaping",                    "loupe"),                              // 59
    p("Jake Sisko",       "chasing",                   "cheese"),                       // 60
    p("James Dean",       "shooting",               "jet"),                              // 61
    p("Jack Nicholson",   "shining",      "chain"),                               // 62
    p("John McClane",     "shaming",                 "gem"),                      // 63
    p("Julia Roberts",    "cheering",                    "cherry"),                      // 64
    p("John Lennon",      "chilling",                  "jello"),                     // 65
    p("Jar Jar",          "judging",                    "judge"),                              // 66
    p("Jeff Goldblum",    "shaking",                 "shake"),                          // 67
    p("JFK",              "shaving",                    "shiv"),                      // 68
    p("James Bond",       "chipping",                   "chip"),                           // 69
    p("Gene Simmons",     "kissing",        "goose"),                 // 70
    p("Gérard Depardieu", "cutting",                   "cod"),                             // 71
    p("Commander Keen",   "canning",                    "can"),                        // 72
    p("Groucho Marx",     "combing",                  "comb"),                   // 73
    p("Gordon Ramsay",    "carrying",           "core"),                  // 74
    p("Gil",              "calling",                    "koala"),               // 75
    p("Cage",             "catching",     "cage"),                         // 76
    p("Genghis Khan",     "cooking",     "cookie"),                      // 77
    p("Kif",              "coughing",                    "coffee"),                         // 78
    p("Kobe (Bryant)",    "cupping",                   "cape"),                       // 79
    p("Frank Sinatra",    "phasing",                    "vice"),                            // 80
    p("Vito",             "feeding",                   "foot"),                         // 81
    p("Phineas",          "fanning",                   "fan"),                       // 82
    p("Viggo Mortensen", "fuming",       "fife (flute)"),                         // 83
    p("Fry",              "frying",                   "fur"),                            // 84
    p("Vladimir Lenin",   "falling",                   "file"),                              // 85
    p("Fish",             "fishing",                    "fish"),                            // 86
    p("Vincent van Gogh", "viking",       "fokker"),                        // 87
    p("Victor Frankenstein", "fiving",             "???"),                          // 88
    p("Vincent Price",    "vaping",                  "fob"),                              // 89
    p("Bart Simpson",     "posing",              "pez"),                         // 90
    p("Prof. Doofenshmirtz", "petting",          "bat"),                          // 91
    p("Bill Nye",          "pinning",            "pen"),                            // 92
    p("Philip Marlowe",   "palming",                   "pom"),                         // 93
    p("Bob Ross",         "burying",                   "bear"),                 // 94
    p("Bruce Lee",        "peeling",  "ball"),                          // 95
    p("Billy Joel",       "pitching",                   "peach"),                        // 96
    p("Peter Griffin",    "puking",                   "pig"),                     // 97
    p("Benjamin Franklin","puffing",                    "beef"),                     // 98
    p("Perry the Platypus","pooping",                 "poop"),                            // 99
];

// Consonant sounds for each digit in the Major System
export const MAJOR_CONSONANTS = {
    0: 'S, Z',
    1: 'T, D',
    2: 'N',
    3: 'M',
    4: 'R',
    5: 'L',
    6: 'J, SH, CH',
    7: 'K, G',
    8: 'F, V',
    9: 'P, B'
};

// Returns array of consonant strings per digit, e.g. 42 → ["R", "N"]
export function majorHintDigits(num) {
    return String(num).split('').map(d => MAJOR_CONSONANTS[parseInt(d)]);
}

export const PHOSPHOR_ICONS = [
    'airplane', 'alarm', 'alien', 'anchor', 'android-logo', 'apple-podcasts', 'archive', 'armchair', 'arrow-fat-right', 'asterisk',
    'atom', 'baby', 'backpack', 'balloon', 'bandaids', 'bank', 'barbell', 'barcode', 'baseball', 'basket',
    'basketball', 'bathtub', 'battery-full', 'bed', 'bell-ringing', 'bicycle', 'binoculars', 'bird', 'bluetooth', 'boat',
    'bone', 'book-open', 'bookmarks', 'boot', 'bowling-ball', 'brain', 'briefcase', 'bug', 'buildings', 'bus',
    'butterfly', 'cactus', 'calculator', 'calendar-blank', 'camera', 'campfire', 'car', 'carrot', 'cat', 'cell-signal-full',
    'chair', 'chart-bar', 'check-circle', 'cheese', 'clock', 'cloud-rain', 'club', 'coat-hanger', 'coffee', 'coin',
    'compass', 'computer-tower', 'confetti', 'cookie', 'crown', 'cube', 'currency-dollar', 'database', 'desktop', 'diamond',
    'dice-five', 'dog', 'drop', 'ear', 'egg', 'envelope', 'eraser', 'eye', 'factory', 'fan',
    'feather', 'film-strip', 'fire', 'fish-simple', 'flag', 'flashlight', 'flask', 'floppy-disk', 'flower', 'folder',
    'football', 'fork-knife', 'game-controller', 'ghost', 'gift', 'globe', 'graduation-cap', 'guitar', 'hamburger', 'hammer'
];
