window.YM_PLANTS = [
  {
    slug: 'pune-automotive',
    name: 'Pune Automotive Components',
    seedName: 'Pune Auto Components',
    location: 'Pune, Maharashtra, India',
    domain: 'Automotive Components',
    lat: 18.5204,
    lng: 73.8567,
    image: '/assets/images/home-pune-automotive.jpg',
    icon: '/assets/images/plant-pune-auto.svg',
  },
  {
    slug: 'ahmedabad-process',
    name: 'Ahmedabad Process Lines',
    seedName: 'Ahmedabad Process Textiles',
    location: 'Ahmedabad, Gujarat, India',
    domain: 'Textile & Chemical Processing',
    lat: 23.0225,
    lng: 72.5714,
    image: '/assets/images/home-ahmedabad-process.jpg',
    icon: '/assets/images/plant-ahmedabad-textile.svg',
  },
  {
    slug: 'chennai-electronics',
    name: 'Chennai Electronics Assembly',
    seedName: 'Chennai Electronics Assembly',
    location: 'Chennai, Tamil Nadu, India',
    domain: 'Electronics Assembly',
    lat: 13.0827,
    lng: 80.2707,
    image: '/assets/images/home-chennai-electronics.jpg',
    icon: '/assets/images/plant-chennai-electronics.svg',
  },
  {
    slug: 'bengaluru-precision',
    name: 'Bengaluru Precision Fab Lab',
    seedName: 'Bengaluru Precision Fab Lab',
    location: 'Bengaluru, Karnataka, India',
    domain: 'Precision Engineering',
    lat: 12.9716,
    lng: 77.5946,
    image: '/assets/images/home-bengaluru-precision.jpg',
    icon: '/assets/images/plant-bengaluru-precision.svg',
  },
  {
    slug: 'nagpur-logistics',
    name: 'Nagpur Central Logistics Hub',
    seedName: 'Nagpur Central Logistics Hub',
    location: 'Nagpur, Maharashtra, India',
    domain: 'Warehouse & Logistics',
    lat: 21.1458,
    lng: 79.0882,
    image: '/assets/images/home-nagpur-logistics.jpg',
    icon: '/assets/images/plant-nagpur-logistics.svg',
  },
];

window.findPlantRecord = function(apiPlant) {
  const name = (apiPlant.name || '').toLowerCase();
  return window.YM_PLANTS.find(p =>
    name.includes(p.slug.replace('-', ' ')) ||
    name.includes(p.seedName.toLowerCase().slice(0, 10)) ||
    p.name.toLowerCase().includes(name) ||
    p.seedName.toLowerCase().includes(name) ||
    apiPlant.id === p.slug
  ) || null;
};

window.getPlantCoords = function(apiPlant) {
  const rec = window.findPlantRecord(apiPlant);
  return rec ? [rec.lat, rec.lng] : null;
};

window.getPlantImage = function(apiPlant) {
  const rec = window.findPlantRecord(apiPlant);
  return rec ? rec.image : (apiPlant.image || '/assets/images/home-pune-automotive.jpg');
};

window.getConnectionPaths = function() {
  const coords = window.YM_PLANTS.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
  if (coords.length < 2) return [];
  return [
    [coords[0], coords[4]],
    [coords[4], coords[2]],
    [coords[2], coords[3]],
    [coords[3], coords[1]],
  ];
};
