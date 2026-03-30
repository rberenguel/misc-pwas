export const MAJOR_PEGS = [
    "Tie", "Neo", "Ham", "Ray", "Owl", "Shoe", "Key", "Wave", "Bee", "Toes",
    "Toad", "Tin", "Tomb", "Tire", "Towel", "Dish", "Dog", "Dove", "Tub", "Nose",
    "Net", "Neon", "Name", "Noir", "Nail", "Notch", "Neck", "Knife", "Knob", "Mice",
    "Mat", "Moon", "Mummy", "Homer", "Mule", "Match", "Mug", "Movie", "Map", "Rose",
    "Rat", "Rain", "Ram", "Rory", "Rail", "Arch", "Rock", "Rifle", "Rope", "Lisa",
    "Latte", "Lion", "Llama", "Lyre", "Leela", "Leech", "Lake", "Lava", "Lip", "Cheese",
    "Shit", "Chain", "Jam", "Cherry", "Joel", "Judge", "Chalk", "Chef", "Ship", "Case",
    "Cat", "Coin", "Comb", "Car", "Coal", "Cage", "Cake", "Coffee", "Cup", "Fez",
    "Fat", "Phone", "Foam", "Fry", "Foil", "Fish", "Fog", "FIFA", "FBI", "Bus",
    "Bat", "Bone", "Bamm", "Bear", "Bell", "Beach", "Book", "Beef", "Pipe", "Daisies"
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
