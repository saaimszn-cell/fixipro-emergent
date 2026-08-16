import os
from datetime import datetime, timezone, timedelta
from core import db, hash_password, verify_password, now


# Full 42-category master service catalogue. Each category shows its
# child services when clicked on the public /services page.
CATEGORIES = [
    {"slug": "general-handyman-home-repairs", "name": "General Handyman & Home Repairs", "icon": "Hammer",
     "description": "Small repairs, odd jobs and general maintenance for every home.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["General Handyman Service", "General Home Repairs", "Property Repairs", "Minor Household Repairs", "Odd Jobs", "Small Repair Jobs", "Home Maintenance", "Regular Maintenance", "Preventative Maintenance", "Emergency Small Repairs", "Fixture Repairs", "Fittings Replacement", "Sealant Replacement", "Silicone Sealing", "Draught Proofing", "Snagging Jobs", "Wall Repairs", "Ceiling Repairs", "Small Hole Repairs", "Crack Filling"]},
    {"slug": "door-to-door-mobile-car-service", "name": "Door-to-Door Mobile Car Service", "icon": "Wrench",
     "description": "Servicing, cleaning, bulbs, tyres and small repairs — at your kerb.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Engine Oil Change", "Oil Filter Change", "Air Filter Change", "Fuel Filter Change", "Cabin Filter Change", "Pollen Filter Change", "Fluid Top-Up", "Coolant Top-Up", "Screen Wash Top-Up", "Basic Vehicle Inspection", "Basic Vehicle Maintenance", "Battery Check", "Battery Replacement", "Battery Terminal Cleaning", "Jump Start", "Tyre Pressure Check", "Tyre Inflation", "Wheel Visual Check", "Spare Wheel Change", "Bulb Replacement", "Headlight Bulb Replacement", "Brake Light Bulb Replacement", "Indicator Bulb Replacement", "Wiper Blade Replacement", "Fuse Replacement", "Number Plate Replacement", "Car Washing", "Exterior Car Cleaning", "Interior Car Cleaning", "Car Detailing", "Vacuum Cleaning", "Dashboard Cleaning", "Vehicle Pressure Washing"]},
    {"slug": "pharmacy-prescription-services", "name": "Pharmacy & Prescription Services", "icon": "Pill",
     "description": "Prescription collection and delivery to your door.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Prescription Collection & Home Delivery", "Pharmacy Collection", "Medicine Collection", "Repeat Prescription Collection", "Customer Pharmacy Pickup & Delivery", "Pharmacy-to-Home Delivery"]},
    {"slug": "doors-locks-security", "name": "Doors, Locks & Security", "icon": "Lock",
     "description": "Door repairs, lock replacements and security upgrades.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Door Repairs", "Internal Door Repairs", "External Door Repairs", "Door Installation", "Door Replacement", "Door Adjustment", "Door Handle Replacement", "Door Knob Replacement", "Door Hinge Repair", "Door Hinge Replacement", "Door Closer Installation", "Door Lock Replacement", "Lock Repairs", "Lock Installation", "Yale Lock Replacement", "Mortice Lock Replacement", "Deadbolt Installation", "Door Latch Repair", "Door Alignment", "Door Frame Repairs", "Letterbox Replacement", "Peephole Installation", "Door Security Upgrades", "Security Chain Installation", "Key Safe Installation"]},
    {"slug": "windows-glazing", "name": "Windows & Glazing", "icon": "Square",
     "description": "Window handles, seals, hinges and glazing repairs.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Window Repairs", "Window Handle Replacement", "Window Lock Replacement", "Window Hinge Replacement", "Window Adjustment", "Window Seal Replacement", "Draughty Window Repair", "Window Frame Repairs", "Double Glazing Repairs", "Double Glazed Unit Replacement", "Misted Glass Replacement", "Broken Glass Replacement", "Window Restrictor Installation", "Window Resealing", "Window Draught Proofing"]},
    {"slug": "bathroom-services", "name": "Bathroom Services", "icon": "Droplet",
     "description": "Taps, toilets, showers and everything wet.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Bathroom Repairs", "Tap Repair", "Tap Replacement", "Leak Fixing", "Basin Repairs", "Basin Installation", "Sink Repairs", "Toilet Repairs", "Toilet Seat Replacement", "Toilet Flush Repairs", "Cistern Repairs", "Shower Repairs", "Shower Installation", "Shower Head Replacement", "Shower Screen Installation", "Bath Repairs", "Bath Panel Installation", "Bath Resealing", "Shower Resealing", "Silicone Sealing", "Bathroom Accessory Installation", "Towel Rail Installation", "Bathroom Cabinet Installation", "Bathroom Mirror Installation", "Pipe Repairs", "Blocked Sink Assistance"]},
    {"slug": "kitchen-services", "name": "Kitchen Services", "icon": "ChefHat",
     "description": "Cabinets, worktops, taps, splashbacks and appliance installs.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Kitchen Repairs", "Kitchen Cabinet Repairs", "Cabinet Handle Replacement", "Kitchen Worktop Repairs", "Kitchen Worktop Installation", "Kitchen Tap Repairs", "Kitchen Tap Replacement", "Kitchen Sink Repairs", "Kitchen Sink Installation", "Kitchen Resealing", "Cooker Installation", "Dishwasher Installation", "Washing Machine Installation", "Tumble Dryer Installation", "Extractor Fan Installation", "Fridge Installation", "Freezer Installation", "Appliance Installation", "Splashback Installation", "Kitchen Shelving"]},
    {"slug": "plumbing-services", "name": "Plumbing Services", "icon": "Wrench",
     "description": "Leaks, drips, waste pipes and appliance connections.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Minor Plumbing Repairs", "Leaking Tap Repair", "Tap Replacement", "Leaking Pipe Repair", "Sink Waste Repair", "Basin Waste Repair", "Toilet Repairs", "Cistern Repairs", "Flush Repairs", "Shower Repairs", "Flexible Hose Replacement", "Waste Pipe Repairs", "Pipe Repairs", "Trap Replacement", "Silicone Repairs", "Appliance Plumbing Connection", "Washing Machine Connection", "Dishwasher Connection"]},
    {"slug": "electrical-services", "name": "Electrical Services", "icon": "Zap",
     "description": "Light fittings, sockets, doorbells and safety alarms.",
     "image": "https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg",
     "services_list": ["Minor Electrical Repairs", "Light Fitting Installation", "Light Fitting Replacement", "Ceiling Light Replacement", "Wall Light Installation", "Bulb Replacement", "LED Light Replacement", "Switch Replacement", "Socket Faceplate Replacement", "Doorbell Installation", "Battery Doorbell Installation", "Smoke Alarm Installation", "Carbon Monoxide Alarm Installation", "Basic Electrical Fixture Replacement"]},
    {"slug": "painting-decorating", "name": "Painting & Decorating", "icon": "Paintbrush",
     "description": "Interior and exterior painting, prep and finishing.",
     "image": "https://images.pexels.com/photos/31671971/pexels-photo-31671971.jpeg",
     "services_list": ["Interior Painting", "Wall Painting", "Ceiling Painting", "Door Painting", "Window Frame Painting", "Skirting Board Painting", "Touch-Up Painting", "Minor Paint Repairs", "Wallpaper Removal", "Wallpaper Installation", "Feature Wall Installation", "Filling Small Wall Holes", "Crack Filling", "Surface Preparation", "Caulking", "Decorative Finishing"]},
    {"slug": "flooring-services", "name": "Flooring Services", "icon": "Grid",
     "description": "Laminate, vinyl, tiles, skirting and thresholds.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Flooring Repairs", "Laminate Flooring Repairs", "Laminate Flooring Installation", "Vinyl Flooring Repairs", "Vinyl Flooring Installation", "Tile Repairs", "Broken Tile Replacement", "Floor Tile Installation", "Skirting Board Installation", "Skirting Board Repairs", "Carpet Edge Repairs", "Carpet Repairs", "Threshold Strip Replacement", "Floor Trim Installation"]},
    {"slug": "tiling-services", "name": "Tiling Services", "icon": "Grid",
     "description": "Wall & floor tiling, regrouting and resealing.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Wall Tile Repairs", "Floor Tile Repairs", "Broken Tile Replacement", "Bathroom Tile Repairs", "Kitchen Tile Repairs", "Splashback Tiling", "Small Area Tiling", "Tile Regrouting", "Grout Repairs", "Tile Resealing", "Silicone Replacement"]},
    {"slug": "carpentry-woodwork", "name": "Carpentry & Woodwork", "icon": "Hammer",
     "description": "Timber trims, doors, cabinets and small woodwork.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Minor Carpentry", "Timber Repairs", "Wooden Trim Repairs", "Skirting Board Work", "Architrave Repairs", "Door Frame Repairs", "Wooden Shelf Installation", "Cabinet Repairs", "Cupboard Repairs", "Wooden Furniture Repairs", "Fence Timber Repairs", "Gate Timber Repairs"]},
    {"slug": "furniture-assembly-repairs", "name": "Furniture Assembly & Repairs", "icon": "Package",
     "description": "IKEA and flat-pack assembly plus repairs.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Flat Pack Assembly", "IKEA Furniture Assembly", "Wardrobe Assembly", "Bed Assembly", "Chest of Drawers Assembly", "Cabinet Assembly", "Desk Assembly", "Table Assembly", "Chair Assembly", "Bookcase Assembly", "Shelving Unit Assembly", "Garden Furniture Assembly", "Furniture Disassembly", "Furniture Reassembly", "Furniture Repairs", "Furniture Adjustment"]},
    {"slug": "tv-shelves-wall-mounting", "name": "TV, Shelves & Wall Mounting", "icon": "Monitor",
     "description": "TV brackets, floating shelves, mirrors and pictures.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["TV Mounting", "TV Bracket Installation", "TV Wall Installation", "Shelf Installation", "Floating Shelf Installation", "Picture Hanging", "Mirror Hanging", "Wall Cabinet Mounting", "Coat Hook Installation", "Bathroom Accessory Mounting", "Heavy Item Wall Mounting", "Decorative Item Mounting"]},
    {"slug": "curtains-blinds", "name": "Curtains & Blinds", "icon": "AlignJustify",
     "description": "Curtain poles, tracks and blind fitting.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Curtain Pole Installation", "Curtain Rail Installation", "Curtain Track Installation", "Curtain Hanging", "Blind Fitting", "Roller Blind Installation", "Venetian Blind Installation", "Roman Blind Installation", "Blind Replacement", "Curtain Pole Replacement", "Curtain Rail Replacement"]},
    {"slug": "garden-outdoor-services", "name": "Garden & Outdoor Services", "icon": "Leaf",
     "description": "Mowing, hedges, fencing, decking and clearance.",
     "image": "https://images.pexels.com/photos/36990157/pexels-photo-36990157.png",
     "services_list": ["Garden Maintenance", "Grass Cutting", "Lawn Mowing", "Lawn Edging", "Hedge Trimming", "Shrub Trimming", "Weed Removal", "Garden Clearance", "Leaf Clearance", "Fence Repairs", "Fence Panel Replacement", "Gate Repairs", "Gate Installation", "Shed Repairs", "Shed Assembly", "Garden Furniture Assembly", "Decking Repairs", "Patio Maintenance"]},
    {"slug": "pressure-power-washing", "name": "Pressure & Power Washing", "icon": "Droplets",
     "description": "Driveways, patios, paving, fences and vehicles.",
     "image": "https://images.pexels.com/photos/36990157/pexels-photo-36990157.png",
     "services_list": ["Driveway Pressure Washing", "Patio Pressure Washing", "Paving Pressure Washing", "Block Paving Cleaning", "Concrete Cleaning", "Path Cleaning", "Walkway Cleaning", "Garden Wall Cleaning", "Brick Cleaning", "Fence Cleaning", "Decking Cleaning", "Garden Furniture Cleaning", "Shed Exterior Cleaning", "Garage Door Cleaning", "Exterior Wall Cleaning", "Render Cleaning", "Bin Area Cleaning", "Wheelie Bin Cleaning", "Balcony Cleaning", "Car Pressure Washing", "Van Pressure Washing"]},
    {"slug": "gutter-exterior-property", "name": "Gutter & Exterior Property Services", "icon": "CloudRain",
     "description": "Gutter cleaning, downpipes, fascias and soffits.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Gutter Cleaning", "Gutter Clearing", "Gutter Repairs", "Gutter Joint Repairs", "Downpipe Cleaning", "Downpipe Repairs", "Fascia Cleaning", "Soffit Cleaning", "Fascia Minor Repairs", "Soffit Minor Repairs", "Roofline Maintenance", "Minor Exterior Repairs", "Exterior Property Cleaning"]},
    {"slug": "roofing-repairs", "name": "Roofing Repairs", "icon": "Home",
     "description": "Minor roof repairs, tile replacement, inspections.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg",
     "services_list": ["Minor Roof Repairs", "Roof Inspection Assistance", "Loose Tile Repair", "Broken Tile Replacement", "Minor Roofline Repairs", "Minor Leak Investigation", "Shed Roof Repairs", "Garage Roof Minor Repairs"]},
    {"slug": "appliance-installation", "name": "Appliance Installation", "icon": "Plug",
     "description": "Washing machines, cookers, fridges and more.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Washing Machine Installation", "Dishwasher Installation", "Tumble Dryer Installation", "Cooker Installation", "Extractor Fan Installation", "Fridge Installation", "Freezer Installation", "Microwave Installation", "Small Appliance Setup", "Appliance Connection", "Appliance Levelling", "Appliance Removal Assistance", "Appliance Replacement Assistance"]},
    {"slug": "smart-home-services", "name": "Smart Home Services", "icon": "Smartphone",
     "description": "Doorbells, cameras, thermostats and smart lighting.",
     "image": "https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg",
     "services_list": ["Smart Doorbell Installation", "Video Doorbell Installation", "Smart Camera Installation", "Wi-Fi Camera Installation", "Smart Thermostat Physical Installation", "Smart Lock Installation", "Smart Lighting Setup", "Smart Bulb Installation", "Smart Plug Setup", "Home Device Mounting", "Wi-Fi Device Setup", "Basic Smart Home Setup"]},
    {"slug": "home-security-installation", "name": "Home Security Installation", "icon": "ShieldCheck",
     "description": "Cameras, sensors, alarms and key safes.",
     "image": "https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg",
     "services_list": ["Security Camera Installation", "CCTV Camera Mounting", "Video Doorbell Installation", "Door Security Upgrade", "Window Security Upgrade", "Security Light Installation", "Motion Sensor Installation", "Door Sensor Installation", "Window Sensor Installation", "Key Safe Installation", "Security Chain Installation"]},
    {"slug": "cleaning-services", "name": "Cleaning Services", "icon": "Sparkles",
     "description": "Domestic, deep, end-of-tenancy and more.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["General Home Cleaning", "Deep Cleaning", "Kitchen Cleaning", "Bathroom Cleaning", "Move-In Cleaning", "Move-Out Cleaning", "End of Tenancy Cleaning", "Property Refresh Cleaning", "Empty Property Cleaning", "Post-Move Cleaning", "Interior Window Cleaning", "Appliance Exterior Cleaning", "Cabinet Cleaning", "Garage Cleaning", "Outdoor Cleaning"]},
    {"slug": "property-maintenance", "name": "Property Maintenance", "icon": "Building",
     "description": "Regular and preventative maintenance visits.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["House Maintenance", "Property Maintenance", "Regular Maintenance", "Preventative Maintenance", "Minor Property Repairs", "Move-In Repairs", "Move-Out Repairs", "Emergency Small Repairs", "Rental Property Repairs", "Property Inspection Assistance", "Property Refresh", "Maintenance Visits", "Multi-Job Maintenance Visits", "Vacant Property Maintenance"]},
    {"slug": "landlord-services", "name": "Landlord Services", "icon": "Key",
     "description": "Turnover, changeover, insurance and safety for BTLs.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Landlord Maintenance", "Rental Property Repairs", "Tenant Changeover Repairs", "Pre-Tenancy Repairs", "End-of-Tenancy Repairs", "Move-In Repairs", "Move-Out Repairs", "Property Refresh", "Minor Damage Repairs", "Furniture Assembly", "Fixture Replacement", "Lock Replacement", "Smoke Alarm Installation", "Carbon Monoxide Alarm Installation", "Regular Property Maintenance", "Vacant Property Checks"]},
    {"slug": "tenant-services", "name": "Tenant Services", "icon": "User",
     "description": "Move-in help, small fixes and end-of-tenancy prep.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Tenant Minor Repairs", "Furniture Assembly", "TV Mounting", "Shelf Installation", "Curtain Installation", "Blind Installation", "Minor Plumbing", "Minor Electrical", "Move-In Assistance", "Move-Out Assistance", "Property Damage Repairs", "Fixture Replacement", "General Handyman Jobs"]},
    {"slug": "end-of-tenancy-services", "name": "End of Tenancy Services", "icon": "ClipboardCheck",
     "description": "Cleans, repairs, garden tidy — deposit-back ready.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["End of Tenancy Cleaning", "End of Tenancy Repairs", "Wall Touch-Ups", "Hole Filling", "Minor Painting", "Fixture Repairs", "Door Repairs", "Lock Repairs", "Furniture Removal Assistance", "Property Refresh", "Garden Tidy-Up", "Cleaning & Repair Package"]},
    {"slug": "moving-home-setup", "name": "Moving & Home Setup Assistance", "icon": "Truck",
     "description": "Furniture moving, disassembly, reassembly and setup.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Move-In Assistance", "Move-Out Assistance", "Furniture Moving", "Furniture Disassembly", "Furniture Reassembly", "Heavy Item Moving Assistance", "Room-to-Room Furniture Moving", "Flat Pack Assembly After Move", "Curtain Installation After Move", "Blind Installation After Move", "TV Mounting After Move", "Shelf Installation After Move", "Home Setup Assistance", "Minor Post-Move Repairs"]},
    {"slug": "emergency-handyman-services", "name": "Emergency Handyman Services", "icon": "AlertTriangle",
     "description": "Same-day urgent locks, doors, windows and leaks.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Emergency Small Repairs", "Urgent Door Repairs", "Urgent Lock Repairs", "Urgent Window Repairs", "Minor Emergency Leak Assistance", "Emergency Furniture Repair", "Emergency Property Repair", "Temporary Damage Fix", "Urgent Landlord Repair", "Same-Day Handyman Jobs"]},
    {"slug": "commercial-small-business", "name": "Commercial & Small Business Services", "icon": "Briefcase",
     "description": "Office and shop repairs, furniture and maintenance.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Office Handyman Repairs", "Shop Repairs", "Small Commercial Property Maintenance", "Office Furniture Assembly", "Commercial Shelving Installation", "Fixture Installation", "Door Repairs", "Lock Repairs", "Minor Plumbing", "Minor Electrical", "Painting Touch-Ups", "Regular Maintenance Visits", "Commercial Pressure Washing", "Office Furniture Moving", "Commercial Property Cleaning"]},
    {"slug": "seasonal-services", "name": "Seasonal Services", "icon": "Sun",
     "description": "Winter prep, autumn leaves, spring refresh.",
     "image": "https://images.pexels.com/photos/36990157/pexels-photo-36990157.png",
     "services_list": ["Winter Property Checks", "Draught Proofing", "Gutter Clearing", "Autumn Leaf Clearance", "Garden Seasonal Maintenance", "Outdoor Furniture Assembly", "Outdoor Furniture Storage Assistance", "Spring Property Refresh", "Winter Preparation", "Holiday Property Checks"]},
    {"slug": "shopping-collection-delivery", "name": "Shopping, Collection & Delivery", "icon": "ShoppingBag",
     "description": "Groceries, click-and-collect, parcels and drop-offs.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Grocery Collection & Delivery", "Small Shopping Collection", "Click & Collect Pickup", "Parcel Collection", "Parcel Delivery", "Parcel Drop-Off", "Local Item Collection & Delivery", "Shop-to-Home Delivery", "Store Collection & Home Delivery"]},
    {"slug": "local-errand-services", "name": "Local Errand Services", "icon": "MapPin",
     "description": "Keys, documents and quick local errands.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Key Collection & Delivery", "Document Collection & Delivery", "Small Item Pickup & Delivery", "Local Errand Service", "Local Collection Service", "Local Delivery Service"]},
    {"slug": "waste-clearance-assistance", "name": "Waste & Clearance Assistance", "icon": "Trash2",
     "description": "House, garden and property clearance.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Small Household Clearance", "Garden Waste Clearance", "Furniture Removal Assistance", "Packaging Removal", "Moving Waste Clearance", "Garage Clearance", "Shed Clearance", "Small Property Clearance"]},
    {"slug": "home-accessibility", "name": "Home Accessibility Services", "icon": "Accessibility",
     "description": "Grab rails, handrails and mobility adjustments.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Grab Rail Installation", "Handrail Installation", "Mobility Aid Installation Assistance", "Accessibility Fixture Installation", "Home Accessibility Adjustments", "Minor Accessibility Improvements"]},
    {"slug": "child-family-safety", "name": "Child & Family Home Safety", "icon": "Baby",
     "description": "Baby gates, safety locks and anchoring.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Baby Gate Installation", "Child Safety Lock Installation", "Furniture Safety Anchoring", "Cabinet Safety Device Installation", "Child Safety Equipment Installation", "Home Safety Fixture Installation"]},
    {"slug": "pet-home-services", "name": "Pet Home Services", "icon": "PawPrint",
     "description": "Pet doors, gates and pet-area repairs.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg",
     "services_list": ["Pet Door Installation", "Pet Gate Installation", "Pet Safety Gate Installation", "Pet Fixture Installation", "Minor Pet Area Repairs"]},
    {"slug": "holiday-home-vacant", "name": "Holiday Home & Vacant Property", "icon": "Home",
     "description": "Vacant checks, seasonal visits and keyholder service.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Holiday Home Maintenance", "Vacant Property Checks", "Vacant Property Maintenance", "Property Condition Checks", "Minor Repairs During Vacancy", "Seasonal Property Checks", "Keyholder Visit Service"]},
    {"slug": "airbnb-short-let", "name": "Airbnb & Short-Let Property Services", "icon": "Bed",
     "description": "Turnaround, guest changeover and refresh.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Airbnb Property Maintenance", "Short-Let Property Maintenance", "Short-Let Property Turnaround", "Guest Changeover Repairs", "Furniture Repairs", "Fixture Repairs", "Emergency Guest Property Repairs", "Property Refresh", "Cleaning Coordination", "Regular Maintenance Visits"]},
    {"slug": "multi-property-maintenance", "name": "Multi-Property Maintenance", "icon": "Layers",
     "description": "Portfolio and scheduled maintenance across sites.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg",
     "services_list": ["Multi-Property Maintenance", "Portfolio Property Maintenance", "Scheduled Maintenance Visits", "Landlord Portfolio Repairs", "Property Inspection Visits", "Preventative Maintenance Visits", "Multi-Site Handyman Services"]},
    {"slug": "future-marketplace-services", "name": "Future Marketplace Services", "icon": "Rocket",
     "description": "Emerging services we're rolling out next.",
     "image": "https://images.pexels.com/photos/36990157/pexels-photo-36990157.png",
     "services_list": ["Home Safety Checks", "Property Condition Checks", "Assisted Home Setup", "Home Improvement Assistance", "Local Collection Services", "Local Delivery Services", "Property Support Services", "Household Assistance Services", "Multi-Service Home Visits", "Scheduled Household Maintenance", "Recurring Property Maintenance", "Recurring Garden Maintenance", "Recurring Cleaning Services", "Same-Day Local Services", "Emergency Local Services"]},
]


# A handful of first-class Service documents that stay for legacy links,
# category-slug routing and existing seeded demo data.
SERVICES = [
    ("plumbing-services", "Leak Repair", "leak-repair", 85, "per visit"),
    ("plumbing-services", "Boiler Service", "boiler-service", 110, "per service"),
    ("bathroom-services", "Bathroom Installation", "bathroom-installation", 2500, "per project"),
    ("electrical-services", "Socket & Switch Installation", "socket-switch-installation", 70, "per point"),
    ("electrical-services", "EV Charger Installation", "ev-charger-installation", 800, "per install"),
    ("cleaning-services", "End of Tenancy Clean", "end-of-tenancy-clean", 220, "per property"),
    ("cleaning-services", "Deep Clean", "deep-clean", 160, "per visit"),
    ("garden-outdoor-services", "Lawn Care & Mowing", "lawn-care-mowing", 35, "per visit"),
    ("garden-outdoor-services", "Garden Clearance", "garden-clearance", 180, "per job"),
    ("painting-decorating", "Interior Painting", "interior-painting", 320, "per room"),
    ("furniture-assembly-repairs", "Furniture Assembly", "furniture-assembly", 55, "per item"),
    ("tv-shelves-wall-mounting", "TV & Shelf Mounting", "tv-shelf-mounting", 60, "per job"),
    ("door-to-door-mobile-car-service", "Car Wash & Detail", "car-wash-detail", 45, "per vehicle"),
    ("pharmacy-prescription-services", "Prescription Delivery", "prescription-delivery", 8, "per trip"),
    ("general-handyman-home-repairs", "General Handyman Visit", "general-handyman-visit", 60, "per hour"),
]

FAQS = [
    {"question": "How do I book a service?", "answer": "Create a free account, describe your job with your address and budget, and any verified handyman in your area can claim it. Once claimed you pay securely and we hold the funds in escrow until the work is done and you've handed over your completion code.", "category": "Customers"},
    {"question": "How does the completion code work?", "answer": "When your payment is confirmed, a unique 6-digit code appears on your dashboard. Only when the handyman has finished the work do you read out that code — they enter it on their side to release payment. If they leave without finishing, the code isn't given and funds stay held.", "category": "Payments"},
    {"question": "Are professionals vetted?", "answer": "Yes. Every handyman passes ID verification, insurance checks and qualification review before they can claim jobs.", "category": "Customers"},
    {"question": "When is my address shared with the handyman?", "answer": "Only after you've paid. Until then, only your city/postcode is shown so pros can gauge the area, but your exact street address is hidden.", "category": "Customers"},
    {"question": "How do I get paid as a handyman?", "answer": "When the customer gives you their completion code and you enter it in your dashboard, 85% of the agreed price lands in your wallet instantly (FixiPro keeps 15%). Withdraw any time over £10.", "category": "Providers"},
    {"question": "Can I cancel a request?", "answer": "You can cancel any request before a handyman claims it, free of charge, from your dashboard.", "category": "Customers"},
]

BLOG_POSTS = [
    {"title": "10 questions to ask before hiring a handyman", "slug": "questions-before-hiring-handyman",
     "excerpt": "Avoid cowboys and costly surprises with these essential questions.",
     "content": "Hiring a handyman is about trust. Ask about insurance, written scope, guarantees, references and payment terms. On FixiPro, every handyman is pre-vetted so you can skip the guesswork.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg", "author": "FixiPro Editorial"},
    {"title": "The true cost of an end-of-tenancy clean in 2026", "slug": "end-of-tenancy-clean-cost-2026",
     "excerpt": "What landlords expect, what it costs, and how to get your deposit back.",
     "content": "End-of-tenancy cleans typically range from £150 to £300 depending on property size. Professional cleaning aligned to letting-agent standards dramatically improves your chances of a full deposit return.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg", "author": "FixiPro Editorial"},
]

CMS_PAGES = [
    {"slug": "privacy-policy", "title": "Privacy Policy", "content": """Last updated: July 2026

FixiPro Ltd ("we", "us") operates the fixipro marketplace connecting customers with independent handymen. This Privacy Policy explains what personal data we collect, why, and your rights over that data.

1. What we collect
• Account: your name, email, hashed password, phone number and account role (customer or handyman).
• Job data: job descriptions, addresses and postcodes you provide when posting a job, and messages you send through the platform.
• Payment: card details are collected and stored solely by our payment processor Stripe — FixiPro never sees or stores your full card number. We store only the payment reference, amount and status.
• Verification (handymen only): identity documents, insurance certificates and qualifications you upload.
• Usage: IP address, device and browser type, and audit logs of your activity on the platform, used for security and fraud prevention.

2. How we use it
• To match customers with handymen and process bookings and payments.
• To hold funds in escrow and release them once the customer's completion code is verified.
• To protect the marketplace from fraud, abuse and unpaid work.
• To comply with UK legal obligations including tax and money-laundering rules.
• To send you transactional emails about your jobs — marketing emails only if you opt in.

3. Third-party services
• Stripe (payments and payouts) — see stripe.com/privacy.
• Google reCAPTCHA (spam protection on public forms).
• Our transactional email provider (currently used for account and job notifications).
We share only the minimum data each service needs, under a data-processing agreement.

4. Data retention & your rights
• Job, payment and audit records are retained for 7 years to meet UK legal and tax obligations.
• Verification documents are retained while your account is active and 6 years after closure.
• Under the UK GDPR you may request a copy of your data, correction, deletion (where legally allowed), restriction or portability at any time. Email privacy requests to privacy@fixipro from the address on your account.

5. Security
• Passwords are hashed with bcrypt; sensitive tokens are hashed and never stored in plain text.
• All traffic is served over HTTPS. Login and payment endpoints are rate-limited.
• Access to production data is restricted to a small number of vetted staff and logged.

6. Complaints
If you're unhappy with how we handle your data you can complain to the UK Information Commissioner's Office at ico.org.uk."""},
    {"slug": "terms", "title": "Terms of Service", "content": """Last updated: July 2026

Welcome to FixiPro. By creating an account or using our marketplace you agree to these Terms of Service. Please read them carefully.

1. Who we are and what we do
FixiPro Ltd operates a UK marketplace that connects customers with independent handymen. FixiPro is not itself a provider of the underlying services — the handyman you hire is an independent contractor, not our employee.

2. Accounts
You must be 18 or over and provide accurate information. You are responsible for keeping your login credentials confidential. You may hold either a customer or a handyman account, not both under the same email.

3. Posting jobs (customers)
When you post a job you agree that:
• The description, address and budget you supply are accurate.
• You will only post work you have the right to have done at the address.
• Once a handyman claims your job and you pay, the funds are held in escrow by our payment processor.

4. Claiming jobs (handymen)
Handymen may only claim jobs after passing verification. By claiming a job you commit to attend at the customer's location and complete the work as described, in a professional and workmanlike manner.

5. Payment & escrow
• You pay the agreed price at the point of claim. Funds are held in escrow.
• Only when you personally hand over the 6-digit completion code shown in your dashboard to the handyman, and they enter it correctly on theirs, is the payment released.
• FixiPro deducts a 15% platform commission from the released amount; the handyman receives 85%.
• Refunds may be issued at FixiPro's discretion where the customer can show a job was not completed or was materially defective.

6. Cancellation & disputes
• Customers may cancel any job free of charge before it is claimed. After claim, cancellation may be subject to a small fee to cover the handyman's time.
• If a dispute arises, contact support@fixipro. We may mediate, request evidence, and where the facts are clear we may release, refund or split the escrow accordingly.

7. Prohibited use
You must not use FixiPro to arrange illegal work, to defraud or harass other users, to circumvent our fee (by moving payment off-platform), or to abuse the completion-code system. Violations may result in immediate suspension.

8. Limitation of liability
The handyman is an independent contractor. FixiPro's liability is limited to the amount paid through the platform for the job in question. We do not exclude liability where UK law does not permit.

9. Suspension & termination
We may suspend or terminate accounts for breach of these Terms, fraud, misconduct or safety concerns. Handymen may be removed for repeated no-shows, poor work, or refusing to honour completion codes.

10. Changes to these terms
We may update these Terms from time to time. Material changes will be notified by email and take effect 14 days after posting.

11. Governing law
These Terms are governed by the laws of England and Wales."""},
    {"slug": "trust-safety", "title": "Trust & Safety", "content": """Your peace of mind is why FixiPro exists.

Handyman verification
Every handyman must complete our verification before they can claim a single job:
• Government-issued photo ID matched to their FixiPro account.
• Proof of address and phone verification.
• Public Liability Insurance certificate on file, checked for validity.
• Trade certifications where legally required (Gas Safe, NICEIC, etc).
• A live review of their profile, coverage and pricing by our onboarding team.

Escrow protection
When you pay, your money goes into escrow — FixiPro holds the funds, not the handyman. Payment is only released to the handyman when you personally give them the 6-digit completion code shown in your dashboard, and they enter it correctly. No code = no payout.

If something goes wrong
• If the handyman doesn't turn up, doesn't finish the work, or the work is defective — do not give them the completion code.
• Contact support@fixipro from your account. Our team will review the messages, timeline and any photos, mediate between both parties, and where appropriate refund the escrow to you.
• Where the handyman is at fault, we may cover reasonable reimbursement from platform funds on top of the refund, up to the limits set out in our Terms.

Legal recourse
Fraud, theft or damage by users of the platform is a serious matter. Where we have reasonable grounds to believe a crime has been committed we will:
• Immediately suspend the offending account.
• Provide all necessary account, payment, message and audit records to UK police and the courts under lawful request.
• Support customers and handymen in pursuing civil claims where our records help their case.

Report a problem
See the "Report a Problem" form below (or use /contact) for any safety, fraud or misconduct concern. All reports go directly to the trust & safety team and are triaged within one working day."""},
    {"slug": "cookies", "title": "Cookie Policy",
     "content": "We use essential cookies for authentication and security, plus optional analytics cookies to improve the product. You can manage preferences at any time from your browser settings."},
    {"slug": "accessibility", "title": "Accessibility Statement",
     "content": "We are committed to WCAG 2.1 AA compliance. If you encounter any accessibility barriers, email accessibility@fixipro and we will resolve them promptly."},
]

EMAIL_TEMPLATES = [
    {"name": "welcome", "subject": "Welcome to FixiPro", "body": "Hi {{name}}, welcome aboard. Post your first job and a verified local handyman will claim it in minutes.", "channel": "email"},
    {"name": "job_claimed", "subject": "Your job has been claimed", "body": "Hi {{name}}, {{provider}} has claimed your job '{{job}}'. Pay securely to schedule the work — funds are held in escrow.", "channel": "email"},
    {"name": "job_completed", "subject": "Job marked complete", "body": "Hi {{name}}, your job '{{job}}' is complete. Please leave a review.", "channel": "email"},
]

SMS_TEMPLATES = [
    {"name": "job_claimed_sms", "subject": "", "body": "FixiPro: {{provider}} claimed your job '{{job}}'. Pay in-app to schedule.", "channel": "sms"},
    {"name": "booking_reminder", "subject": "", "body": "FixiPro: reminder — {{provider}} arrives {{date}} for '{{job}}'.", "channel": "sms"},
]

PUSH_TEMPLATES = [
    {"name": "new_message", "subject": "New message", "body": "{{sender}} sent you a message.", "channel": "push"},
    {"name": "job_status", "subject": "Job update", "body": "'{{job}}' is now {{status}}.", "channel": "push"},
]

AI_CONFIGS = [
    {"key": "customer_assistant", "name": "Customer AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are FixiPro's customer assistant for a UK home services marketplace. Help customers describe their job, understand pricing, and navigate booking. Be concise, friendly, British English."},
    {"key": "provider_assistant", "name": "Provider AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are FixiPro's handyman assistant. Help handymen write winning quotes, price jobs fairly for the UK market, and manage their schedule. Be concise and practical."},
    {"key": "admin_assistant", "name": "Admin AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are FixiPro's admin assistant. Summarise platform activity, flag anomalies, and help draft announcements. Be precise."},
    {"key": "whatsapp_assistant", "name": "WhatsApp AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are FixiPro's WhatsApp assistant. Qualify leads, answer FAQs, collect job details for quotes, and hand over to a human when asked. Short messages."},
]

# Only three live coverage areas — everywhere else is 'coming soon'.
COVERAGE = ["Innsworth", "Forres", "Elgin"]


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Saaim (Owner)", "role": "super_admin", "phone": "+44 20 7946 0000",
            "status": "active", "two_factor_enabled": False, "favourites": [],
            "created_at": now(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


async def seed_demo_users():
    if await db.users.count_documents({"email": "customer@example.com"}) == 0:
        await db.users.insert_one({
            "email": "customer@example.com", "password_hash": hash_password("Customer@123"),
            "name": "Emma Thompson", "role": "customer", "phone": "+44 7700 900123",
            "status": "active", "two_factor_enabled": False, "favourites": [], "created_at": now(),
        })
    if await db.users.count_documents({"email": "provider@example.com"}) == 0:
        res = await db.users.insert_one({
            "email": "provider@example.com", "password_hash": hash_password("Provider@123"),
            "name": "James Carter", "role": "provider", "phone": "+44 7700 900456",
            "status": "active", "two_factor_enabled": False, "favourites": [], "created_at": now(),
        })
        await db.providers.insert_one({
            "user_id": str(res.inserted_id), "business_name": "Carter Home Services Ltd",
            "bio": "Gas Safe registered plumber and general home services specialist with 12 years of experience covering Innsworth, Forres and Elgin.",
            "services": [], "coverage": ["Innsworth", "Forres", "Elgin"], "verified": True,
            "verification_status": "approved", "documents": [
                {"name": "Public Liability Insurance", "type": "insurance", "status": "approved", "uploaded_at": now()},
                {"name": "Gas Safe Certificate", "type": "certification", "status": "approved", "uploaded_at": now()},
            ],
            "insurance": {"provider": "AXA", "policy_no": "AX-8842-UK", "expires": "2027-01-01", "status": "valid"},
            "certifications": ["Gas Safe Registered", "NVQ Level 3 Plumbing"],
            "rating": 4.8, "jobs_done": 0, "created_at": now(),
        })


async def seed_catalog():
    # Overwrite categories every startup so master list stays authoritative.
    existing_by_slug = {c["slug"]: c async for c in db.categories.find()}
    cat_ids = {}
    for c in CATEGORIES:
        payload = {**c, "updated_at": now()}
        if c["slug"] in existing_by_slug:
            await db.categories.update_one({"slug": c["slug"]}, {"$set": payload})
            cat_ids[c["slug"]] = str(existing_by_slug[c["slug"]]["_id"])
        else:
            res = await db.categories.insert_one({**payload, "created_at": now()})
            cat_ids[c["slug"]] = str(res.inserted_id)
    if await db.services.count_documents({}) > 0:
        return
    cat_images = {c["slug"]: c["image"] for c in CATEGORIES}
    for cat_slug, name, slug, price, unit in SERVICES:
        await db.services.insert_one({
            "category_id": cat_ids.get(cat_slug, ""), "category_slug": cat_slug, "name": name, "slug": slug,
            "description": f"Professional {name.lower()} by vetted, insured local specialists. Upfront pricing, workmanship guaranteed.",
            "base_price": price, "unit": unit, "image": cat_images.get(cat_slug, ""),
            "rating": 4.6, "jobs_completed": 0, "created_at": now(),
        })


async def seed_content():
    if await db.blog_posts.count_documents({}) == 0:
        for p in BLOG_POSTS:
            await db.blog_posts.insert_one({**p, "published": True, "created_at": now()})
    # Upsert CMS pages so updates propagate on redeploy
    for p in CMS_PAGES:
        await db.cms_pages.update_one({"slug": p["slug"]}, {"$set": {
            **p, "seo_title": p["title"] + " | FixiPro",
            "seo_desc": p["content"][:150], "updated_at": now(),
        }}, upsert=True)
    if await db.faqs.count_documents({}) == 0:
        for f in FAQS:
            await db.faqs.insert_one(f)
    if await db.email_templates.count_documents({}) == 0:
        await db.email_templates.insert_many(EMAIL_TEMPLATES)
        await db.sms_templates.insert_many(SMS_TEMPLATES)
        await db.push_templates.insert_many(PUSH_TEMPLATES)
    if await db.ai_configs.count_documents({}) == 0:
        await db.ai_configs.insert_many(AI_CONFIGS)
    # Ensure settings exist & coverage list is authoritative
    defaults = [
        {"key": "platform_fee_pct", "value": 15},
        {"key": "site_name", "value": "FixiPro"},
        {"key": "support_email", "value": "hello.fixipro@gmail.com"},
        {"key": "maintenance_mode", "value": False},
        {"key": "coverage_cities", "value": COVERAGE},
    ]
    for d in defaults:
        await db.settings.update_one({"key": d["key"]}, {"$set": d}, upsert=True)


async def seed_demo_marketplace():
    if await db.requests.count_documents({}) > 0:
        return
    customer = await db.users.find_one({"email": "customer@example.com"})
    provider_user = await db.users.find_one({"email": "provider@example.com"})
    provider = await db.providers.find_one({"user_id": str(provider_user["_id"])})
    service = await db.services.find_one({"slug": "leak-repair"})
    if not (customer and provider_user and provider and service):
        return
    await db.requests.insert_one({
        "customer_id": str(customer["_id"]), "service_id": str(service["_id"]),
        "service_name": service["name"], "category_slug": "plumbing-services",
        "title": "Kitchen tap leaking at the base",
        "description": "Mixer tap drips constantly and leaks at the base when running. Need it repaired or replaced this week.",
        "postcode": "GL3 1DP", "city": "Innsworth", "address": "12 Rowan Way, Innsworth",
        "budget": 95.0, "urgency": "soon",
        "preferred_date": (now() + timedelta(days=3)).date().isoformat(),
        "status": "open", "created_at": now() - timedelta(days=1),
    })
    await db.providers.update_one({"_id": provider["_id"]},
                                  {"$set": {"services": [str(service["_id"])]}})


async def seed_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.services.create_index("slug", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.notifications.create_index("user_id")
    await db.messages.create_index("conversation_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.rate_limit_hits.create_index("at", expireAfterSeconds=3600)
    await db.rate_limit_hits.create_index("identifier")
    await db.contact_messages.create_index("created_at")


async def run_seed():
    await seed_admin()
    await seed_demo_users()
    await seed_catalog()
    await seed_content()
    await seed_demo_marketplace()
    await seed_indexes()
