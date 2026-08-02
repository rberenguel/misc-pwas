// PAO entry: { person, action, object }
const p = (person = null, action = null, object = null) => ({ person, action, object });

export const PAO_PEGS = [
    p("Zeus",             "hurls",                    "thunderbolt"),                       //  0
    p("Mr T",             "fall asleep",              "black and red van"),                 //  1
    p("Neo",              "dodges",                   "bullet"),                            //  2
    p("Moe",              "pours",                    "beer"),                              //  3
    p("Roy",              "rained on",                    "dove"),                             //  4
    p("Eugenio",          "standup comedy",           "owl joke"),                          //  5
    p("Che Guevara",             "smoking cigar",          "bandana"), //  6
    p("Q",                "makes things change",     "weird regal robe"),                  //  7
    p("V",                "puts on its face",                  "mask"),                              //  8
    p("Apu",              "thanks you for coming",    "squishee"),                          //  9
    p("Tom Selleck",      "twitches moustache",       "Hawaiian shirt"),                    // 10
    p("David Tennant",    "throws open door to vast space", "sonic screwdriver"),          // 11
    p("Tintin",           "investigates",             "magnifying glass"),                  // 12
    p("Troy McClure",     "introduces",               "film reel"),                         // 13
    p("Tony Robbins",     "firewalks",                "burning coals"),                     // 14
    p("David Lynch",      "places",                   "Directed by David Lynch sticker"),   // 15
    p("The Joker",        "laughs maniacally",        "playing card"),                      // 16
    p("Tim Cook",         "unveils",                  "iPhone"),                            // 17
    p("Darth Vader",      "force-chokes",             "lightsaber"),                        // 18
    p("David Bowie",      "floats away",                    "tin can"),                    // 19
    p("Nancy Sinatra",    "stomps",                   "boots"),                             // 20
    p("Nikola Tesla",     "closes circuit",                     "Tesla coil"),                              // 21
    p("Nino Bravo",       "closes the door",          "stone"),                             // 22
    p("Nemo",             "looks angry",              "submarine"),                         // 23
    p("Nero",             "burns",                    "grapes"),                            // 24
    p("Niles (Crane)",    "adjusts cufflinks",        "sherry glass"),                      // 25
    p("(John) Nash",      "chalkboards",              "equation"),                          // 26
    p("Nog",              "salutes",                  "Starfleet badge"),                   // 27
    p("Nathan Fillion",   "rendered speechless",      "typewriter"),                        // 28
    p("Natalie Portman",  "shaves head",              "electric razor"),                    // 29
    p("Marge Simpson",    "vacuums",                  "blue hair"),                         // 30
    p("Margaret Thatcher","stands, glacial",           "miner's helmet"),                    // 31
    p("Johnny Cash",      "strums",                   "long black jacket"),                 // 32
    p("Marilyn Monroe",   "holds skirt",              "skirt"),                             // 33
    p("Homer",            "eats",                     "donut"),                             // 34
    p("Millhouse",        "pulls up trousers",        "Bonestorm game cartridge"),          // 35
    p("Michael Jordan",   "soars in the air",                    "sneakers"),                          // 36
    p("Michael Caine",    "fidgets",                  "stress balls"),                      // 37
    p("Humphrey Bogart",  "looks quizzically",        "maltese falcon"),                    // 38
    p("Mary Poppins",             "flies",                   "umbrella"),                              // 39
    p("Roz (Frasier)",    "answers",                  "phone"),                             // 40
    p("Robert De Niro",   "talks to mirror",          "spring knife"),                              // 41
    p("Rafael Nadal",     "pumps fist",               "clay"),                              // 42
    p("Rambo",            "fires",                    "machine gun"),                       // 43
    p("Rory",             "talks fast",               "coffee cup"),                        // 44
    p("Ralph Wiggum",     "rolls",                    "banana"),                            // 45
    p("Ronnie James (Dio)","throws devil horns",       "Holy Diver album"),                  // 46
    p("Rick (Astley)",    "dances",                   "trench coat"),                       // 47
    p("Roger Federer",    "serves as in tennis",                   "Wimbledon trophy"),                  // 48
    p("Rocky Balboa",     "trains",                   "jumping rope"),                      // 49
    p("Lisa",             "blows musical instrument",                   "saxophone"),                         // 50
    p("Linus Torvalds",   "flames",                   "Tux penguin"),                       // 51
    p("Lenny",            "stares intently",          "inanimate carbon rod"),              // 52
    p("Luka Modric",      "dribbles (feet)",                 "Ballon d'Or"),                       // 53
    p("Lrrr (Ruler)",     "zaps",            "laser gun"),                         // 54
    p("Leela",            "revs up engine",           "wrist scanner"),                     // 55
    p("LeBron James",     "posterizes",               "basketball"),                        // 56
    p("Lisa Kudrow",      "plays",                    "acoustic guitar"),                   // 57
    p("Lord Voldemort",   "casts",                    "wand"),                              // 58
    p("Little Prince",    "tends",                    "rose"),                              // 59
    p("Jake Sisko",       "writes",                   "funky looking vest"),                       // 60
    p("James Dean",       "combs hair",               "comb"),                              // 61
    p("Jack Nicholson",   "breaks through door",      "axe"),                               // 62
    p("John McClane",     "limps on",                 "broken glass"),                      // 63
    p("Julia Roberts",    "shops",                    "shopping bag"),                      // 64
    p("John Lennon",      "adjusts",                  "round glasses"),                     // 65
    p("Jar Jar",          "flaps",                    "ears"),                              // 66
    p("Jeff Goldblum",    "stammers",                 "dinosaur"),                          // 67
    p("JFK",              "waves",                    "sniper rifle"),                      // 68
    p("James Bond",       "shakes",                   "martini"),                           // 69
    p("Gene Simmons",     "sticks out tongue",        "white face makeup"),                 // 70
    p("Gérard Depardieu", "fences",                   "sabre"),                             // 71
    p("Commander Keen",   "jumps",                    "pogo stick"),                        // 72
    p("Groucho Marx",     "wiggles",                  "Groucho glasses"),                   // 73
    p("Gordon Ramsay",    "shouts angrily",           "white chef dress"),                  // 74
    p("Gil",              "pouts",                    "salesman red jacket"),               // 75
    p("Cage",             "closes eyes enjoying",     "long hair"),                         // 76
    p("Genghis Khan",     "charges on horseback",     "Mongolian bow"),                      // 77
    p("Kif",              "sighs",                    "clipboard"),                         // 78
    p("Kobe (Bryant)",    "shoots towards a basket",                   "black snake"),                       // 79
    p("Frank Sinatra",    "snaps fingers",                    "tuxedo fedora"),                            // 80
    p("Vito",             "stroke",                   "horsehead"),                         // 81
    p("Phineas",          "builds",                   "contraption"),                       // 82
    p("Viggo (Mortensen)", "screams For Frodo",       "orc horde"),                         // 83
    p("Fry",              "drinks",                   "coffee"),                            // 84
    p("Vladimir Lenin",   "raises",                   "fist"),                              // 85
    p("Fish",             "swims",                    "scales"),                            // 86
    p("Vincent van Gogh", "cuts ear",       "sunflowers"),                        // 87
    p("Victor Frankenstein", "sews limbs",             "big bolt"),                          // 88
    p("Vincent Price",    "cackles",                  "cape"),                              // 89
    p("Bart Simpson",     "skateboards",              "slingshot"),                         // 90
    p("Prof. Doofenshmirtz", "emerges sooty",          "lab coat"),                          // 91
    p("Bill Nye",          "mixes liquids",            "bowtie"),                            // 92
    p("Philip Marlowe",   "lights",                   "cigarette"),                         // 93
    p("Bob Ross",         "paints",                   "happy little tree"),                 // 94
    p("Bruce Lee",        "spins around skillfully",  "nunchaku"),                          // 95
    p("Billy Joel",       "pounds",                   "piano keys"),                        // 96
    p("Peter Griffin",    "fights",                   "giant chicken"),                     // 97
    p("Benjamin Franklin","flies",                    "kite with key"),                     // 98
    p("Perry the Platypus","puts on hat disguise",                 "comic fedora"),                            // 99
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
