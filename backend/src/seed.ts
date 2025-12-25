import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_INVENTORY = [
    { sku: "SKU-0001", artist: "Ricardo Villalobos", album: "Late Night Grooves EP", genre: "Minimal/Techno", status: "NM", cost: 180, price: 270, stock: 1, supplier: "Distribuidor DK", owner: "Miguel", channel: "Discogs + Local" },
    { sku: "SKU-0002", artist: "Priku", album: "Bucharest Loops", genre: "Minimal rumano", status: "G", cost: 150, price: 225, stock: 1, supplier: "Acervo Vesterbro", owner: "Morten", channel: "Discogs" },
    { sku: "SKU-0003", artist: "Sublee", album: "Deep Patterns", genre: "Minimal/House", status: "NM", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "Santaolalla", channel: "Local" },
    { sku: "SKU-0004", artist: "Kirk", album: "Analog Heat", genre: "Techno", status: "VG", cost: 170, price: 255, stock: 1, supplier: "Vinyl Supply", owner: "Alejo", channel: "Local" },
    { sku: "SKU-0005", artist: "Various Artists", album: "Nordic House Sessions Vol.1", genre: "House", status: "VG+", cost: 120, price: 180, stock: 1, supplier: "Acervo Vesterbro", owner: "Alejo", channel: "Local" },
    { sku: "SKU-0006", artist: "Ricardo Villalobos & Friends", album: "Groove Ritual", genre: "Minimal/Techno", status: "VG", cost: 210, price: 315, stock: 1, supplier: "Distribuidor DK", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0007", artist: "Priku", album: "Eastern Echoes EP", genre: "Minimal rumano", status: "NM", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0008", artist: "Sublee", album: "Late Afternoon Mix", genre: "Deep House", status: "G", cost: 125, price: 200, stock: 1, supplier: "Acervo Vesterbro", owner: "El Cuartito", channel: "Local" },
    { sku: "SKU-0009", artist: "Kirk", album: "Basement Frequencies", genre: "Techno", status: "NM", cost: 160, price: 240, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0010", artist: "Local DJ Collective", album: "Vesterbro Sounds", genre: "House/Techno", status: "B", cost: 110, price: 165, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0011", artist: "Ricardo Villalobos", album: "Peruvian Nights", genre: "Minimal", status: "NM", cost: 200, price: 300, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0012", artist: "Priku & Guest", album: "Club Shadows", genre: "Minimal rumano", status: "B", cost: 155, price: 232.5, stock: 1, supplier: "Distribuidor DK", owner: "alejo", channel: "Local" },
    { sku: "SKU-0013", artist: "Sublee", album: "Ocean Drive", genre: "Minimal/Chill", status: "NM", cost: 110, price: 165, stock: 1, supplier: "Acervo Vesterbro", owner: "Miguel", channel: "Local" },
    { sku: "SKU-0014", artist: "Kirk", album: "Circuit City", genre: "Techno industrial", status: "G", cost: 180, price: 270, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0015", artist: "DJ Import", album: "Global House Beats Vol.2", genre: "House", status: "VG", cost: 130, price: 195, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0016", artist: "Ricardo Villalobos", album: "Sunset Edits", genre: "Minimal/Edits", status: "NM", cost: 210, price: 315, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0017", artist: "Priku", album: "Underground Letters", genre: "Minimal rumano", status: "VG+", cost: 145, price: 217.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0018", artist: "Sublee", album: "Room 17 Mix", genre: "Deep House", status: "VG+", cost: 130, price: 195, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Local" },
    { sku: "SKU-0019", artist: "Kirk", album: "Night Shift", genre: "Techno", status: "VG+", cost: 170, price: 255, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0020", artist: "Various Artists", album: "Wax & Coffee", genre: "Lounge/House", status: "VG+", cost: 100, price: 150, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0021", artist: "Ricardo Villalobos", album: "Minimal Moods", genre: "Minimal", status: "NM", cost: 195, price: 292.5, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0022", artist: "Priku", album: "B-side Stories", genre: "Minimal rumano", status: "G", cost: 140, price: 210, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0023", artist: "Sublee", album: "Sunrise EP", genre: "Deep House", status: "NM", cost: 120, price: 180, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0024", artist: "Kirk", album: "Rough Cuts", genre: "Techno/Minimal", status: "S", cost: 175, price: 262.5, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0025", artist: "DJ Vesterbro", album: "Midnight Mixes", genre: "House/Techno", status: "S", cost: 125, price: 187.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0026", artist: "Ricardo Villalobos", album: "Groove Anatomy", genre: "Minimal", status: "VG", cost: 200, price: 300, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0027", artist: "Priku", album: "Concrete Waves", genre: "Minimal rumano", status: "VG", cost: 150, price: 225, stock: 1, supplier: "Distribuidor DK", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0028", artist: "Sublee & Kirk", album: "Split EP", genre: "Minimal/Techno", status: "VG+", cost: 160, price: 240, stock: 1, supplier: "Vinyl Supply", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0029", artist: "Various Artists", album: "Copenhagen Clubcuts", genre: "Techno/House", status: "VG", cost: 115, price: 172.5, stock: 1, supplier: "Acervo Vesterbro", owner: "el Cuartito", channel: "Discogs" },
    { sku: "SKU-0030", artist: "Curated Selection", album: "El Cuartito Picks Vol.1", genre: "Eclectic", status: "VG+", cost: 135, price: 202.5, stock: 0, supplier: "El Cuartito Records", owner: "Manuel ", channel: "Discogs" }
];

async function main() {
    console.log('Seeding database...');
    for (const item of INITIAL_INVENTORY) {
        await prisma.record.upsert({
            where: { sku: item.sku },
            update: {},
            create: {
                sku: item.sku,
                artist: item.artist,
                album: item.album,
                genre: item.genre,
                condition: item.status,
                cost: item.cost,
                price: item.price,
                stock: item.stock,
                availableOnline: item.channel.toLowerCase().includes('discogs') || item.channel.toLowerCase().includes('online')
            }
        });
    }
    console.log('Seeding finished.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
