const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PACKAGES = [
  {
    title: "Gokarna & Murudeshwar Beach Trek - 2N/3D Package",
    category: "PRODUCT_SPEC",
    content: `[Source Document: Trekatour Gokarna Beach Trek Official Package]
Package: 2N/3D Gokarna & Murudeshwar Beach Trek & Camping
Base Price: ₹5,499/- Per Person
Advance Booking Amount: INR 1,500/- Per Person
Departure City: Hyderabad (Every Friday evening from Nampally/Secunderabad/Kacheguda)
Duration: 2 Nights / 3 Days Weekend Trek
Difficulty: Easy to Moderate

Day-by-Day Itinerary:
- Day 0 (Friday): Board overnight train/sleeper bus from Hyderabad to Hubli/Gokarna (departure approx 7:00 PM).
- Day 1 (Saturday): Morning arrival in Gokarna. Check into beachside campsite. Freshen up & breakfast. Begin the iconic 5-Beach Trek covering Kudle Beach, Om Beach, Half Moon Beach, and Paradise Beach. Experience cliff jumping, sunset views at Om Beach, and bonfire dinner with music at the campsite. Overnight stay in beach tents (twin/triple sharing).
- Day 2 (Sunday): Early morning breakfast. Drive to Murudeshwar. Visit the world-famous 123-feet Lord Shiva Statue and Raja Gopura temple complex. Enjoy water sports at Murudeshwar Beach (scuba diving / jet ski optional). Visit Mirjan Fort for photography. Evening departure back towards Hyderabad.
- Day 3 (Monday): Arrive in Hyderabad by 7:00 AM. Trip concludes with lifelong memories.

Inclusions:
- Round-trip travel from Hyderabad to Gokarna and return.
- 2 Nights stay (Beachside camping / Homestay triple sharing).
- 2 Breakfasts and 1 Bonfire Dinner.
- Certified Trekatour trek leader / trip captain.
- Sightseeing permits, tolls, and entry passes.
- First-aid medical kit.

Exclusions:
- Lunches and Day 2 dinner.
- Water sports charges at Murudeshwar/Om Beach.
- Personal expenses, shopping, mineral water.`
  },
  {
    title: "Coorg Coffee County & Tadiandamol Trek - 2N/3D Package",
    category: "PRODUCT_SPEC",
    content: `[Source Document: Trekatour Coorg Coffee County Official Package]
Package: 2N/3D Coorg Coffee County & Tadiandamol Peak Trek
Base Price: ₹5,999/- Per Person
Advance Booking Amount: INR 2,000/- Per Person
Departure City: Hyderabad (Every Friday evening from Hyderabad via AC/Non-AC Sleeper)
Duration: 2 Nights / 3 Days Weekend Getaway
Difficulty: Moderate Trek (Tadiandamol Peak)

Day-by-Day Itinerary:
- Day 0 (Friday): Departure from Hyderabad by 7:30 PM.
- Day 1 (Saturday): Morning arrival in Coorg (Madikeri). Check-in at traditional estate homestay surrounded by coffee and spice plantations. Authentic Kodava breakfast. Visit Abbey Falls, Raja's Seat viewpoint, and Mandalpatti 4x4 Jeep Safari for panoramic sunset views over the Western Ghats. Campfire with estate dinner. Overnight stay in Coorg.
- Day 2 (Sunday): Early morning trek to Tadiandamol Peak (highest point in Coorg, 1,748m elevation) through Shola forests and mist-covered grasslands. Packed trail snacks provided. Post-trek visit to Namdroling Monastery (Golden Temple, Bylakuppe) to experience Tibetan culture. Evening departure for return journey.
- Day 3 (Monday): Arrive back in Hyderabad by 8:00 AM.

Inclusions:
- Hyderabad to Coorg and return transportation.
- 2 Days internal transfers in private vehicle.
- 1 Night plantation estate homestay accommodation.
- 2 Breakfasts and 1 Traditional Coorg Dinner.
- Forest department trekking permits for Tadiandamol.
- Experienced Trekatour outdoor captain.

Exclusions:
- Mandalpatti 4x4 Jeep ride fee (split among group).
- Meals not mentioned in inclusions.
- Personal shopping (coffee, homemade chocolates, spices).`
  },
  {
    title: "Manali Snow Valley & Solang Adventure - 4N/5D Package",
    category: "PRODUCT_SPEC",
    content: `[Source Document: Trekatour Manali Himalayan Expedition Official Package]
Package: 4N/5D Manali, Solang Valley, Atal Tunnel & Kasol Expedition
Base Price: ₹11,999/- Per Person
Advance Booking Amount: INR 3,000/- Per Person
Departure City: Hyderabad to Delhi (Train/Flight) + Volvo AC Bus Delhi-Manali-Delhi
Duration: 4 Nights / 5 Days Mountain Expedition
Difficulty: Easy to Moderate Adventure

Day-by-Day Itinerary:
- Day 1: Board luxury AC Volvo bus from Delhi (Majnu Ka Tilla / Kashmiri Gate) in evening towards Manali. Overnight scenic journey through Himachal valleys.
- Day 2: Morning arrival in Manali. Check-in at riverside alpine hotel/cottage. Afternoon local exploration: Hadimba Temple, Vashisht Hot Springs, Old Manali cafés, and Mall Road. Welcome dinner and orientation.
- Day 3: Full day Solang Valley & Atal Tunnel excursion. Drive through the historic Atal Tunnel to Sissu (Lahaul Valley). Snow activities at Solang Valley: Paragliding, Snow scootering, Zorbing, and Cable car ride. Evening bonfire and music.
- Day 4: Scenic drive to Kasol & Manikaran Sahib Gurudwara. Stroll along Parvati River in Kasol (Mini Israel). Enjoy natural hot sulphur springs at Manikaran. Return to Manali or board evening Volvo back to Delhi.
- Day 5: Arrive in Delhi in the morning for onward journey to Hyderabad.

Inclusions:
- Delhi to Manali to Delhi Luxury AC Volvo transportation.
- 3 Nights stay in Deluxe 3-Star mountain view hotel (triple/double sharing).
- Daily Breakfast and Dinner (3 Breakfasts + 3 Dinners).
- All sightseeing transfers in private Tempo Traveller / Cab.
- Atal Tunnel & Solang Valley permits and green tax.
- 24/7 Trekatour trip coordinator.

Exclusions:
- Travel from Hyderabad to Delhi (can be booked on request).
- Adventure activity charges (paragliding, river rafting, snow scooter).
- Lunches and personal expenses.`
  },
  {
    title: "Dandeli White Water River Rafting & Jungle Camp - 2N/3D Package",
    category: "PRODUCT_SPEC",
    content: `[Source Document: Trekatour Dandeli Adventure Official Package]
Package: 2N/3D Dandeli Kali River Rafting & Jungle Safari Camp
Base Price: ₹4,999/- Per Person
Advance Booking Amount: INR 1,500/- Per Person
Departure City: Hyderabad (Every Friday night via train/bus)
Duration: 2 Nights / 3 Days Weekend Getaway
Difficulty: Beginner Adventure

Day-by-Day Itinerary:
- Day 0 (Friday): Depart Hyderabad at 8:00 PM towards Hubli/Dandeli.
- Day 1 (Saturday): Reach Dandeli resort/jungle camp in morning. Freshen up and breakfast. Head to Kali River for White Water Rafting (9km rapids, Grade II & III). Kayaking, Zorbing, and Natural Jacuzzi bath in river. Jungle night walk and campfire with BBQ dinner.
- Day 2 (Sunday): Early morning jungle safari in Dandeli Wildlife Sanctuary / Kali Tiger Reserve. Visit Supa Dam backwaters and Syntheri Rocks. Post lunch, drive to Hubli and board return train/bus to Hyderabad.
- Day 3 (Monday): Reach Hyderabad by 6:30 AM.

Inclusions:
- Hyderabad to Dandeli return transfers.
- Jungle camp / Resort accommodation with swimming pool.
- All meals at camp (2 Breakfasts, 1 Lunch, 1 Dinner).
- River rafting equipment and certified rafting guide.
- Jacuzzi bath, Kayaking, Coracle boat ride.
- Campfire and music.

Exclusions:
- Long run river rafting optional upgrade.
- Safari camera permits.
- Personal drinks and snacks.`
  }
];

async function main() {
  console.log('Seeding Trekatour packages into KnowledgeBase...');
  for (const pkg of PACKAGES) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { title: pkg.title }
    });
    if (!existing) {
      const created = await prisma.knowledgeBase.create({
        data: {
          title: pkg.title,
          category: pkg.category,
          content: pkg.content,
          isActive: true
        }
      });
      console.log(`Created: ${created.title} (ID: ${created.id})`);
    } else {
      console.log(`Already exists: ${existing.title}`);
    }
  }
  console.log('Done seeding packages!');
}

main()
  .catch((e) => {
    console.error('Error seeding packages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
