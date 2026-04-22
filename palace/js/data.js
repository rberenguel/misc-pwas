export const MAJOR_PEGS = [
    "Mr T", "Neo", "Moe", "Ray", "Owl", "Shoe", "Q", "V", "Apu", "Toes",
    "Toad", "Tintin", "Tom", "Tire", "Towel", "Dish", "Tim Cook", "Dove", "Tub", "Nose",
    "Note", "Neon", "Nemo", "Noir", "Nole (Djokovic)", "(John) Nash", "Nog", "Knife", "Nib", "Maze",
    "Moto", "Moon", "Mummy", "Homer", "Meat Loaf", "MJ", "Mickey", "Movie", "Map", "Rose",
    "Rat", "Rain", "Ram", "Rory", "Rail", "Arch", "Rick (Astley)", "Roger Federer", "Rope", "Lisa",
    "Latte", "Lion", "Lime", "Lyre", "Leela", "LeBron James", "Lake", "Leaf", "Lip", "Jesse (BrB)",
    "Jedi", "Jon (Snow)", "James (Bond)", "Jerry", "(Billy) Joel", "Jar Jar", "Chuck (Norris)", "Chef", "Jabba", "Case",
    "Cat", "Coin", "Comb", "Car", "Coal", "Cage", "Cake", "Coffee", "Cup", "Fez",
    "Vito", "Phone", "Foam", "Fry", "Foil", "Fish", "Fog", "FIFA", "FBI", "Bus",
    "Bat", "Bone", "Boom", "Bear", "Bell", "Beach", "Book", "Beef", "Pope", "Daisies"
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
