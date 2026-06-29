// PAO entry: { person, action, object }
const p = (person = null, action = null, object = null) => ({ person, action, object });

export const PAO_PEGS = [
    p("Zeus",             "hurls",                    "thunderbolt"),                       //  0
    p("Mr T",             "fall asleep",              "black and red van"),                 //  1
    p("Neo",              "dodges",                   "bullet"),                            //  2
    p("Moe",              "pours",                    "beer"),                              //  3
    p("Roy",              "rained on",                    "dove"),                             //  4
    p("Eugenio",          "standup comedy",           "owl joke"),                          //  5
    p("Dr J",             "dunks violently",          "basketball backboard, shattered glass"), //  6
    p("Q",                "stops the Enterprise",     "weird regal robe"),                  //  7
    p("V",                "puts on its face",                  "mask"),                              //  8
    p("Apu",              "thanks you for coming",    "squishee"),                          //  9
    p("Dizzy Gillespie",  "blows",                    "trumpet"),                           // 10
    p("Data",             "calculates",               "circuit board"),                     // 11
    p("Tintin",           "investigates",             "magnifying glass"),                  // 12
    p("Tom",              "chases",                   "mouse"),                             // 13
    p("Thor",             "throws",                   "Mjolnir"),                           // 14
    p("Dolly (Parton)",   "sings",                    "wig"),                               // 15
    p("Tchaikovsky",      "conducts",                 "cannon"),                            // 16
    p("Tim Cook",         "unveils",                  "iPhone"),                            // 17
    p("Dave Grohl",       "drums",                    "drumsticks"),                        // 18
    p("David Bowie",      "floats away",                    "lightning bolt"),                    // 19
    p("Nancy Sinatra",    "stomps",                   "boots"),                             // 20
    p("Nikola Tesla",     "zaps",                     "coil"),                              // 21
    p("Nino Bravo",       "closes the door",          "stone"),                             // 22
    p("Nemo",             "looks angry",              "submarine"),                         // 23
    p("Nero",             "burns",                    "grapes"),                            // 24
    p("Nole (Djokovic)",  "smashes to the ground",    "racket"),                            // 25
    p("(John) Nash",      "chalkboards",              "equation"),                          // 26
    p("Nog",              "salutes",                  "Starfleet badge"),                   // 27
    p("Nathan Fillion",   "rendered speechless",      "typewriter"),                        // 28
    p("Napoleon",         "tucks hand in jacket",     "bicorne"),                           // 29
    p("Marge Simpson",    "vacuums",                  "vacuum"),                            // 30
    p("Meat (Loaf)",      "roars",                    "motorcycle"),                        // 31
    p("Johnny Cash",      "strums",                   "long black jacket"),                 // 32
    p("Marilyn Monroe",   "holds skirt",              "skirt"),                             // 33
    p("Homer",            "eats",                     "donut"),                             // 34
    p("Millhouse",        "pulls up trousers",        "Bonestorm game cartridge"),          // 35
    p("Michael Jordan",   "soars",                    "sneakers"),                          // 36
    p("Michael Caine",    "fidgets",                  "stress balls"),                      // 37
    p("Morgan Freeman",   "narrates",                 "globe"),                             // 38
    p("Mary Poppins",             "flies",                   "umbrella"),                              // 39
    p("Roz (Frasier)",    "answers",                  "phone"),                             // 40
    p("Rudy Fernández",   "alley-oop",                "number 5 Club Joventut shirt"),      // 41
    p("Ron (Swanson)",    "frowns",                   "meat"),            // 42
    p("Rambo",            "fires",                    "machine gun"),                       // 43
    p("Rory",             "talks fast",               "coffee cup"),                        // 44
    p("Ralph Wiggum",     "rolls",                    "banana"),                            // 45
    p("Raj",              "whispers",                 "cocktail"),                          // 46
    p("Rick (Astley)",    "dances",                   "trench coat"),                       // 47
    p("Rafa (Nadal)",     "flexes arm",               "clay"),                              // 48
    p("Robin Hood",       "draws bow",                "arrow"),                             // 49
    p("Lisa",             "shines",                   "saxophone"),                         // 50
    p("Liz Taylor",       "poses",                    "Cleopatra crown"),                   // 51
    p("Lenny",            "stares intently",          "inanimate carbon rod"),              // 52
    p("Dalai Lama",       "meditates",                "prayer beads"),                      // 53
    p("Laura Palmer",     "acts dead",                "plastic foil"),                      // 54
    p("Leela",            "revs up engine",           "wrist scanner"),                     // 55
    p("LeBron James",     "posterizes",               "basketball"),                        // 56
    p("Lucky (Luke)",     "pulls out gun",            "revolver"),                          // 57
    p("Lovecraft",        "summons",                  "Cthulhu"),                           // 58
    p("Arsène Lupin",     "steals / sneaks",          "briefcase"),                         // 59
    p("Jesse (BrB)",      "cooks (chemistry style)",  "blue meth"),                         // 60
    p("Charles Darwin",   "writes",                   "giraffe"),                           // 61
    p("Jon (Snow)",       "pets",                     "direwolf"),                          // 62
    p("James (Bond)",     "shakes",                   "martini"),                           // 63
    p("Jerry",            "runs",                     "cheese"),                            // 64
    p("John Lennon",      "adjusts",                  "round glasses"),                     // 65
    p("Jar Jar",          "flaps",                    "ears"),                              // 66
    p("Chuck (Norris)",   "roundhouses",              "Ranger badge"),                      // 67
    p("JFK",              "waves",                    "sniper rifle"),                      // 68
    p("Jabba",            "oozes",                    "pizza"),                             // 69
    p("Gus",              "straightens",              "tie"),                               // 70
    p("Godzilla",     "demolishes",                   "Tokyo scale model"),                              // 71
    p("Commander Keen",   "jumps",                    "pogo stick"),                        // 72
    p("Groucho Marx",     "wiggles",                  "cigar"),                             // 73
    p("Gordon Ramsay",    "shouts angrily",           "white chef dress"),                  // 74
    p("Gil",              "pouts",                    "salesman red jacket"),               // 75
    p("Cage",             "closes eyes enjoying",     "long hair"),                         // 76
    p("Goku",             "charges on the side",      "Kamehameha"),                        // 77
    p("Kif",              "sighs",                    "clipboard"),                         // 78
    p("Kobe (Bryant)",    "shoots",                   "black snake"),                       // 79
    p("Frank Sinatra",    "snaps",                    "fedora"),                            // 80
    p("Vito",             "stroke",                   "horsehead"),                         // 81
    p("Phineas",          "builds",                   "contraption"),                       // 82
    p("Freddie Mercury",  "twirls",                   "moustache"),                         // 83
    p("Fry",              "drinks",                   "coffee"),                            // 84
    p("Vladimir Lenin",   "raises",                   "fist"),                              // 85
    p("Fish",             "swims",                    "scales"),                            // 86
    p("Viggo (Aragorn)",  "screams For Frodo",        "orc horde"),                         // 87
    p("Johnny Five",      "reads",                    "book"),                              // 88
    p("Vincent Price",    "cackles",                  "cape"),                              // 89
    p("Buzz Aldrin",   "steps on",                    "flag"),                             // 90
    p("Peter Pan",        "sprinkles",                "fairy dust"),                        // 91
    p("Mr. Bean",         "hides",                    "steak tartare"),                     // 92
    p("Pam (The Office)", "doodles",                  "post-it"),                           // 93
    p("Bruce Lee",        "spins around skillfully",  "nunchaku"),                          // 94
    p("Uma Thurman (Kill Bill → B+L)", "slashes",     "katana"),                            // 95
    p("Billy Joel",       "pounds",                   "piano keys"),                        // 96
    p("Pac-Man",          "chomps",                   "large pills"),                       // 97
    p("Buffoon",          "jesters",                  "clown suit"),                        // 98
    p("Pope",             "blesses",                  "holy-hand grenade from Worms"),      // 99
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
