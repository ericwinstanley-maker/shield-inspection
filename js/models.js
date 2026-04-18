// ============================================================
// Shield Inspection Services — Data Models
// All section definitions, line items, and A-code library
// ============================================================

export const RATINGS = {
  S: { label: 'S', name: 'Satisfactory', color: 'green', description: 'Functional, average condition or better. No repair needed.' },
  M: { label: 'M', name: 'Marginal', color: 'amber', description: 'Functional but may need replacement within 3-5 years.' },
  P: { label: 'P', name: 'Poor', color: 'red', description: 'Defective, should be repaired or replaced immediately.' },
  U: { label: 'U', name: 'Unsafe', color: 'red-pulse', description: 'Safety concern, needs specialist evaluation.' },
  NA: { label: 'NA', name: 'Not Applicable', color: 'grey', description: 'Not present at this property.' },
  D: { label: 'D', name: 'Disclaimed', color: 'purple', description: 'Not accessible at time of inspection.' }
};

export const PROPERTY_TYPES = [
  'Ranch', 'Colonial', 'Cape Cod', 'Split-Level', 'Bi-Level', 'Raised Ranch',
  'Two Story', 'Tri-Level', 'Bungalow', 'Cottage', 'Victorian', 'Tudor', 'Other'
];

export const GARAGE_TYPES = ['None', '1 Car', '2 Car', '3 Car', 'Carport', 'Other'];
export const DRIVEWAY_TYPES = ['Asphalt', 'Concrete', 'Gravel', 'Dirt', 'Brick/Paver', 'Other', 'N/A'];

export const ATTENDEES = [
  'Client', 'Real Estate Agent for Buyer', 'Real Estate Agent for Seller',
  'Owner', 'Tenant', 'No one'
];

export const STRUCTURE_TYPES = ['Detached', 'Attached', 'Built-in', 'N/A'];
export const OCCUPANCY_TYPES = ['Owner-occupied', 'Vacant', 'N/A'];

// ============================================================
// INSPECTION SECTIONS — each section matches a PDF page
// ============================================================

export const INSPECTION_SECTIONS = [
  {
    id: 'exterior',
    title: 'EXTERIOR INSPECTION',
    icon: '🏗️',
    pageNum: 5,
    items: [
      { id: 'ext-1', num: 1, desc: 'The exterior wall covering.', hasOtherOption: true, helperText: "If the home has vines growing on the exterior - while aesthetically appealing, it does strictly limit the amount of the visual inspection the inspector can physically perform. In many cases, the home inspector will have to disclaim this item. Masonry walls are more tolerant of vines than is wood siding. Vines should be kept away from windows, doors, soffits, fascia and gutters. They also facilitate insect (pest)entry as well as accelerate moisture deterioration to the wall because of the slow drying effect. If the exterior wall sheathing is stucco, it is generally applied to a metal lath that is secured to the wall over building or felt paper. Stucco should terminate approx. 8 inches above the ground level and there should be a drip screed which is a metal stop that is exposed below the stucco. The stucco should NOT be bonded directly to the foundation. The inspector will pay particular attention to corners and intersections with doors & windows. Vertical cracks above or below wall openings suggest building settlement compared to repetitive vertical cracks across the wall at 16 or 24 inch intervals suggest siding problems. Your home might have a synthetic version of stucco referred to as EIFS which was popular in the 1990s and is much more flexible than it's brittle sibling (traditional stucco). The most common and widespread problem with EIFS has been concealed water damage. Wood siding needs regular maintenance and if cared for will last for many generations.", options: ['Vinyl', 'Brick', 'Wood', 'Stucco', 'Asb. Shingles', 'Aluminum', 'Composition'] },
      { id: 'ext-2', num: 2, desc: 'Flashing and trim.', hasOtherOption: true, options: ['Vinyl', 'Wood', 'Aluminum', 'Steel'] },
      { id: 'ext-3', num: 3, desc: 'All exterior doors.', hasOtherOption: true, options: ['Wood', 'Steel'] },
      { id: 'ext-4', num: 4, desc: 'Attached decks, balconies, stoops, steps, porches and associated railings.', options: ['Attached decks', 'Balconies', 'Stoops', 'Steps', 'Porches', 'Associated railings'] },
      { id: 'ext-5', num: 5, desc: 'The eaves, soffits and fascias where accessible from the ground level.', helperText: "Inspection of the soffits and fascia is usually difficult due to the lack of access. Binoculars can make a big difference, but even in the cases where they are visible, the inspection does not uncover whether a re-siding job is concealing damage or rot on the original wood soffits & fascia. The soffits and fascia enclose the rafter ends at the roof overhang and many soffits have vents that allow air to circulate in roof/attic areas which will prolong the life expectancy of the roof. If exterior chimneys & electrical masts extend up through the soffits, the inspector will pay close attention as chimney flashings may leak and cause damage in this area." },
      { id: 'ext-6', num: 6, desc: 'The vegetation, grading, surface drainage and retaining walls on the property when any of these are likely to adversely affect the building.', options: ['No retaining walls observed'] },
      { id: 'ext-7', num: 7, desc: 'The walkways, patios, driveways and related service walks leading to the dwelling entrances.', options: ['No patio observed'] },
      { id: 'ext-8', num: 8, desc: 'The entry doors, exterior faucets, swale or topography at the site, & vegetation proximate to the subject.' },
      { id: 'ext-9', num: 9, desc: 'The garage or carport including its roof, walls, foundation and overall construction observed.', options: ['No garage observed'] },
      { id: 'ext-10', num: 10, desc: 'Other exterior issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'roof',
    title: 'ROOF INSPECTION',
    icon: '🏠',
    pageNum: 6,
    items: [
      { id: 'roof-1', num: 1, desc: 'The roof covering.', hasOtherOption: true, helperText: "Asphalt composition shingles are the most common type of roofing material used today. They vary in weight, color and design. The weight of a standard asphalt composition shingle before 1973 was 240 pounds per square (of coverage); modern standard shingles weigh approximately 190 pounds, depending on the manufacturer.", options: ['Asphalt', 'Shingle', 'Wood', 'Rubber'] },
      { id: 'roof-2', num: 2, desc: 'The roof drainage systems.', hasOtherOption: true, options: ['Yankee', 'Plastic', 'Steel', 'Aluminum'] },
      { id: 'roof-3', num: 3, desc: 'The flashings utilized.', helperText: "Flashings protect joints at changes in direction and between different materials. Missing or poor flashing details are often responsible for water damage to walls & floors. Flashings are generally designed to be shedding systems. Areas that catch water or allow it into wall systems can cause considerable concealed damage. One major limitation of inspecting exterior flashing is that the inspector cannot see as much as he or she would like to because of visual limitations - therefore evidence of non-performance is all that can be commented on. Areas where there is no obvious flashing should be monitored over the long-term as the felt-paper or house-wrap may be bearing the load of the responsibility for limiting water entry." },
      { id: 'roof-4', num: 4, desc: 'The skylights, chimneys and other roof penetrations. (If applicable)', helperText: "If there is a wood-burning fireplace or stove, the inspector will try to determine how much creosote has built-up. Creosote is the tarlike/oily combustible deposits that develop on the inside of chimneys which occurs when the fire cannot get enough air to properly burn the wood. Cooler burning fires allow the creosote to rise up the chimney with the smoke. As the creosote cools, it condenses and attaches itself to the chimney walls. Masonry chimneys may have multiple flues. Some jurisdictions require liners if the chimney is only one brick or 4 inches thick. For safety reasons, liners should be in place under these conditions. Aluminum liners should only be used with natural gas or propane (not with oil or wood). Stainless steel liners are good for all types of fuels including wood. Poured-in place concrete liners are used to line old masonry chimneys. Up until the middle of the last century, flue liners were not required. A chimney two bricks or 8 inches thick does not require a liner in most areas. Cracked mortar, spalling bricks, or cracked caps are common defects found with chimneys.", options: ['No skylights observed'] },
      { id: 'roof-5', num: 5, desc: 'The method used to inspect the roof:', options: ['Visual from the ground', 'Binoculars', 'From the Attic/Scuttle', 'Drone'] },
      { id: 'roof-6', num: 6, desc: 'Other roof issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'structural',
    title: 'STRUCTURAL INSPECTION',
    icon: '🔨',
    pageNum: 7,
    items: [
      { id: 'str-1', num: 1, desc: 'The structural components including the foundation and framing.', hasOtherOption: true, options: ['Poured concrete', 'Concrete block', 'Stone', 'Cinder block'] },
      { id: 'str-2', num: 2, desc: 'The foundation for substantial cracks on both the interior & exterior.' },
      { id: 'str-3', num: 3, desc: 'The foundation for any evidence of bowing, compromise such as spalling, leaning & mortar deterioration, etc.' },
      { id: 'str-4', num: 4, desc: 'Determine the type of foundation present at the subject:', hasOtherOption: true, options: [
        { label: 'Full basement' },
        { label: 'Partial basement', hasPercent: true },
        { label: 'Crawl', hasPercent: true },
        { label: 'Slab', hasPercent: true }
      ] },
      { id: 'str-5', num: 5, desc: 'The floor, wall & ceiling structures (as applicable).' },
      { id: 'str-6', num: 6, desc: 'Other structural issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'plumbing',
    title: 'PLUMBING INSPECTION',
    icon: '🔧',
    pageNum: 8,
    items: [
      { id: 'plm-1', num: 1, desc: 'The interior water supply & distribution systems including all fixtures & faucets.',
        optionGroups: [
          { label: 'Visible supply pipes:', options: ['Copper', 'Galvanized', 'Plastic', 'Lead'] },
          { label: 'Water source:', options: ['Municipal', 'Private well'] }
        ],
        extraFields: [
          { key: 'shutoffValve', label: 'Location of main shut-off valve' },
          { key: 'waterFrom', label: 'Ran water from', placeholder: 'Start time' },
          { key: 'waterTo', label: 'to', placeholder: 'End time' }
        ]
      },
      { id: 'plm-2', num: 2, desc: 'The water heating equipment, vent systems, flues, chimneys, fuel storage & distribution systems.', options: ['Gas', 'Oil', 'Propane', 'Electric'] },
      { id: 'plm-3', num: 3, desc: 'The drain, waste & vent systems including all fixtures.',
        helperText: "Vertical supports should be observed at every other floor level and generally 10 feet vertically for copper piping. Waste pipe sizes should always go from smaller to larger diameters. If cast iron piping is observed, the inspector will especially check the top areas of horizontal runs to check for splits or cracks as this is often found in residential dwellings (especially if sewer odor is noticed). The inspector pays particular attention to sections of the plumbing whenever the pipe changes direction (or materials) for potential leak spots. Galvanized steel (or iron piping) should be more than 6 inches above grade as rusting is more likely occur closer to the ground level.",
        optionGroups: [
          { label: 'Visible waste pipes:', options: ['Copper', 'Galvanized', 'Plastic', 'Lead', 'Cast iron', '(NV)'] },
          { label: 'Galvanized steel within 6 inches of grade:', options: ['Yes', 'No', 'N/A'] }
        ],
        extraFields: [
          { key: 'galvWhere', label: 'If yes, where?', placeholder: '' }
        ]
      },
      { id: 'plm-4', num: 4, desc: 'The drainage sumps, sump pumps and related pumps.',
        optionGroups: [
          { label: 'Sump pump noted:', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Drain noted:', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'plm-5', num: 5, desc: 'Overall condition of pipes, support, visual inspection for cross connections and combustible piping.', helperText: "Rust is found on metallic piping only. In general, galvanized pipes and stainless steel piping are more prone to rust than most other materials. Copper piping tends to only corrode if the water is more acidic. Vertical piping should be supported at every floor level (but no less than 24 ft.) and copper plumbing should be supported at each floor level and at least every 10 feet. Any plastic plumbing piping requires particularly good support especially for hot water piping as it tends to expand significantly when heated. When dissimilar metals such as copper and steel/brass piping are connected, the home inspector should note whether an appropriate dielectric union is utilized that will minimize bimetallic reactions (resulting in corrosion) from taking place. A cross connection can occur wherever the supply plumbing and waste products could come together. The inspector will look at plumbing fixtures and particularly at faucets where the spout is below the overflow or flood rim of the sink/basin. If plastic piping is noted in the home, the inspector will check for it's proximity to heat sources and vents as it is combustible and should the dwelling be a multi-family home (2 units or more), this type of plumbing is not allowed to go between the units as a fire can be more easily transmitted. If the inspector notes polybutylene piping (usually grey in color) it will be looked at particularly close especially at connection points and crimp rings should be about a quarter of an inch away from the end of the tube. Supports should be observed at least every 32 inches (approx.). The home inspector looks for evidence of leaks (which includes whitish deposits on the pipe surface generally near fittings) and obviously leaks." },
      { id: 'plm-6', num: 6, desc: 'Comment on the make, approximate age and capacity of the hot water tank and any cross connection concerns.',
        extraFields: [
          { key: 'brand', label: 'Brand', placeholder: '' },
          { key: 'age', label: 'Age', placeholder: '' },
          { key: 'gallons', label: 'Gallons', placeholder: '' },
          { key: 'tprValve', label: 'Temperature/Pressure Relief (TPR) valve', placeholder: '' }
        ],
        options: ['Tankless', 'Appears intact'],
        optionGroups: [
          { label: 'Any cross-connection concerns:', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'If the water heater is propane fueled, any concerns with low lying areas?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ],
        helperText: "Conventional domestic water heaters have life expectancies of 8-12 years but can last up to 25 years if regularly drained & maintained. Water-temperature settings of 120 degrees is recommended by most manufacturers. The home inspector will likely not remove any panels on an electric water heater as there is a safety concern with live connections near the thermostats. Electric heaters should also have an ECO (energy cutout) device that will shut the unit down if the internal temperature of the water rises above 210 degrees Fahrenheit. The inspector, otherwise, checks and removes the heat roll out shield to gain access to the burner assembly (while the burner is operating & at rest) to determine whether there is rust or damage to the burner chamber and for evidence of leakage. The data plate identifies the combustible clearance requirements. Gas or oil-fired water heaters in garages must be more than 18 inches above the floor. The inspector checks that the baffle is in place, that there is an isolating valve on the cold water side of the tank (should there be a flood), and that the drain valve is intact. Propane water heaters pose special concerns as propane is heavier than air and if located in low-lying areas, leaking propane can accumulate and cause an explosion."
      },
      { id: 'plm-7', num: 7, desc: 'Is there a built-in dishwasher and if so has the inspector checked for a cross-connection?', helperText: "The typical dishwasher waste passes through the drain hose, up through the air gap and down into the sink drain piping (or into the garbage disposal system if present) below the sink. The air gap fitting has to be above the flood level rim of the kitchen sink and the drain-board (whichever is higher). The dishwasher CANNOT be directly connected to the waste plumbing system unless it's connected before the trap. There are similar concerns for clothes washing machines as the drain hose discharges waste directly into the plumbing system.", options: ['Yes', 'No', 'N/A'] },
      { id: 'plm-8', num: 8, desc: 'The home inspector looks at all traps. Type of traps observed:', helperText: "Traps are designed to prevent sewer odors from entering the house through the plumbing fixtures. The seal in the trap is provided by the waste water. P-type traps are most optimal and drum traps, S-traps, bell traps as well as crown traps are usually not permitted. S-traps can easily siphon and allow sewer gases to accumulate or clogging can occur.", options: ['P-Type', 'S-traps (less optimal)', 'Drum Trap'] },
      { id: 'plm-9', num: 9, desc: 'Other plumbing issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'electrical',
    title: 'ELECTRICAL INSPECTION',
    icon: '⚡',
    pageNum: 10,
    items: [
      { id: 'elec-1', num: 1, desc: 'The service drop.', options: ['Underground & not visible'] },
      { id: 'elec-2', num: 2, desc: 'The service entrance conductors, cables and raceways, equipment and main disconnects and the service grounding.',
        helperText: "When the inspector checks the service panels and aluminum wiring is present, the panel and it's components must be rated for use with aluminum. CUAL is acceptable here.",
        optionGroups: [
          { label: 'Service entrance location:', options: ['Overhead', 'Underground'] },
          { label: 'Grounding location:', options: ['Waterpipe', 'Rod'] }
        ]
      },
      { id: 'elec-3', num: 3, desc: 'The interior components of service panels, sub-panels, the conductors, over-current protection devices, a representative number of installed lighting fixtures, switches, receptacles & ground-fault circuit interrupters (GFCI\'s).',
        helperText: "The inspector will check for the following clearances for electrical wiring: at least an inch away from pipes & ducts, 6 inches for singlewall metal vent connectors (if gas), 9 inches or more if oil and 18 inches minimally for wood fueled appliances. Wire should generally be supported every 4 1./2 feet as they run through the house and within 12 inches of leaving panels or boxes by staples (one wire per staple) unless the wire runs through holes in framing members. In general, there should be no more than 12 outlets or lights for each single branch circuit. The inspector checks for interior wiring that is appropriate for the specific application, such as NMD for dry areas of the home and NMW cable for bathrooms, laundry-rooms, etc. The home inspector also verifies that the appropriate size wire is in place and reports accordingly if there is a potential safety condition. #14 gauge is the most common wire size for residential branch circuits. A minimum of two #12, 20 amp circuits should be observed in most updated homes. Twelve gauge circuits include: electric baseboard heaters, water heaters, dishwashers, garbage disposals and private well pumps (if applicable). Ten gauge is typically found with air conditioning, electric clothes dryers, some electric water heaters, saunas and some ovens or cook-tops. Eight gauge applies to all electric stoves and larger central air conditioning systems. If aluminum wiring was used it should be one size larger. A 15 amp branch circuit can carry 1,500 watts and a 20 amp branch circuit can safely carry 2,000 watts. Some common examples of appliances and the wattage they require: a hair dryer can draw 1400 watts, an iron 1000 watts, a portable heater 1200 watts, a vacuum cleaner 600 watts and a portable fan can draw 150 watts.",
        optionGroups: [
          { label: 'Copper wiring?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Circuit breakers?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Fuses?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Any knob & tube wiring?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: "GFCI's functional?", options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: "GFCI's circuit or outlet?", options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'elec-4', num: 4, desc: 'Describe the amperage and voltage rating of the service and location of the main disconnects & sub-panels.',
        optionGroups: [
          { label: 'Sub-panels?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ],
        extraFields: [
          { key: 'amperes', label: 'Amperes', placeholder: '' },
          { key: 'ifYesWhere', label: 'If yes, where?', placeholder: '' },
          { key: 'locationMainPanel', label: 'Location of main panel', placeholder: '' }
        ]
      },
      { id: 'elec-5', num: 5, desc: 'The wiring methods and report on the presence of solid conductor aluminum branch circuit wiring.',
        helperText: "If the inspector notes aluminum wiring, particular attention will be paid to investigate whether receptacles have a CO/ALR coding on them as CUAL or non-designated ones are not safe and should be replaced. As a matter of practice, if a few are missing the CO/ALR code, then a qualified electrician should check all outlets. The inspector also checks those areas where overhead lights (often having pull chains) are noted (typically in garages/basements) as overheating aluminum wires can often be detected there. If 8 gauge or larger stranded aluminum wiring is present, there should also be anti-oxidant grease observed. In general, annual re-inspections by a qualified inspector/electrician should be made when a home has aluminum wiring to ensure that connections have not loosened or over-heating conditions occur. Knob & Tube wiring was common in homes between 1920-1950, cloth-sheathed 2 & 3 wire conductors with no ground: 1945-1960s, cloth-sheathed with ground wire: 1960s-early 1970s, cloth-sheathed aluminum w/ground: 1964-1978, plastic-sheathed alum. with ground: 1974-1978 and the modern plastic-sheathed copper with ground: 1974-present.",
        optionGroups: [
          { label: 'Any aluminum branch wiring?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Any exposed wiring?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ],
        options: ['Annual inspection by a qualified electrician of aluminum branch circuit wiring are minimally suggested'],
        extraFields: [
          { key: 'aluminumWhere', label: 'If yes, where? (aluminum)', placeholder: '' },
          { key: 'exposedWhere', label: 'If yes, where? (exposed)', placeholder: '' }
        ]
      },
      { id: 'elec-6', num: 6, desc: 'Comment on the absence of smoke & carbon monoxide detector.',
        helperText: "Some municipalities require more than one smoke or carbon monoxide detector per level, since a home inspector is not working in the capacity of code-enforcement officer, we recommend that you check on-line or with the local building code official to determine if you need more and the required/recommended placement of each item.",
        optionGroups: [
          { label: 'Smoke detector:', options: ['Battery', 'Hard-wired'] },
          { label: 'Tested (smoke):', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Carbon Monoxide Detector:', options: ['Battery', 'Hard-wired'] },
          { label: 'Tested (CO):', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ],
        options: ['A5', 'A6']
      },
      { id: 'elec-7', num: 7, desc: 'Other electrical issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'heating',
    title: 'HEATING INSPECTION',
    icon: '🔥',
    pageNum: 11,
    items: [
      { id: 'heat-1', num: 1, desc: 'The installed heating equipment.', options: ['FHA', 'GHA', 'HWBB', 'ELEC BSBD', 'RAD.', 'STEAM', 'SPACE HTR'] },
      { id: 'heat-2', num: 2, desc: 'The vent systems, flues & chimneys.',
        helperText: "Venting should be more than: 7 feet above a sidewalk or driveway, 6 ft. away from doors, windows, or air supply intake systems, 6 ft. away from gas service regulator vents, 6 ft. away from soffits, 3 ft. or more away from the corners of a house, 1 foot above grade level and 3 ft. from an oil tank or fill vent pipe. Vent connectors should slope upward going away from the furnace or appliance at a minimum of 1/4 inch per foot and should be less than 10 feet in length.",
        optionGroups: [
          { label: 'Uphill slope?', options: ['Yes', 'No', 'N/A'], exclusive: true },
          { label: 'Rust on exhaust flues?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'heat-3', num: 3, desc: 'Describe the energy source.', options: ['Gas', 'Oil', 'Propane', 'Electric', 'Wood'] },
      { id: 'heat-4', num: 4, desc: 'Describe the heating method by its distinguishing source.',
        optionGroups: [
          { label: 'Color of flame at burner:', options: ['Blue', 'Orange', 'Red', 'Yellow'] },
          { label: 'Flame characteristics:', options: ['Steady', 'Some flickering', 'Significant flickering'] },
          { label: 'Corrosion noted on burner:', options: ['None', 'Some', 'Significant'] },
          { label: 'Any exposed exterior plastic gas piping noted?', options: ['None', 'Yes', 'Adequate', 'N/A'] }
        ],
        extraFields: [
          { key: 'exposedPipingDetail', label: 'If yes, detail', placeholder: '' }
        ]
      },
      { id: 'heat-5', num: 5, desc: 'Is gas piping appropriately supported? (3/4 & 1 inch should be minimally supported every 8 feet.)' },
      { id: 'heat-6', num: 6, desc: 'Evidence of drip legs.' },
      { id: 'heat-7', num: 7, desc: 'Evidence/location of the oil storage tank.', hasOtherOption: true,
        helperText: "Any evidence of leakage, corrosion, rust on the legs, is the distance of the tank at least 10 ft. or greater from the burner or separated by the masonry wall, missing or damaged cap, missing or corroded shutoff valve, black or smoky flame tips, on older systems more orange flames with some yellow at the tips is acceptable - black flame tips may be caused by incomplete combustion, condition of the fan inlet, oil pooling in the refractory pot or evidence of pieces of the pot that might have fallen on the bottom of the chamber, condition of the primary controller (the automatic safety device found on all oil furnaces), condition of the barometric damper - not required on new systems, maximum length for vent connectors is 10 ft., if there's a draft inducer - what's the condition, any loose connections in the venting, and if multiple vent connectors going into a chimney are observed (is the smaller appliance connected above the larger).",
        options: ['Inside', 'Outside', 'Above ground', 'Below ground', 'N/A will apply if oil is not the fuel'],
        extraFields: [
          { key: 'fillPipeLocation', label: 'Location of fill pipe', placeholder: '' }
        ]
      },
      { id: 'heat-8', num: 8, desc: 'If hot water boiling system is in place, is there a pressure-relief valve?',
        helperText: "Inspector will check the size (i.e., 100,000 BTU/hr system should be equal to or greater than the burner rating), setting (normal pressure is 12-15 psi and will prevent system from building beyond 30 psi), the PRV should discharge within 12 inches of the floor, the inspector does NOT activate the test lever during the home inspection and no water or corrosion should be evident, the high limit switch should be set at approx. 210 degrees Fahrenheit, and if the boiler is connected to the house plumbing system a back-flow prevention device is needed and is located near the PRV on the short run of connecting piping that joins the cold water supply piping from the plumbing to the boiler(in modern systems a pressure-reducing valve is found), and while not absolutely necessary they are an operating convenience",
        optionGroups: [
          { label: 'Pressure-relief valve?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'heat-9', num: 9, desc: 'Shut-off valves noted appropriately throughout?',
        helperText: "Shut-off valves should generally be located in the same room as the appliance on the rigid side of the piping, if flexible connectors are used they should be less than 6 ft. in length and should not go through ceilings, walls, floors, etc.",
        optionGroups: [
          { label: 'Shut-off valves?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'heat-10', num: 10, desc: 'Any evidence of scorching on the exterior of any fossil-fuel burning appliance?',
        optionGroups: [
          { label: 'Evidence of scorching?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'heat-11', num: 11, desc: 'Satisfactory clearance distance observed on all sides of any fossil-fuel burning appliance?',
        helperText: "The data plate on most furnaces specifies the required clearances from combustibles. The home inspector should compare the actual clearances to the data plate. Generally, 30 inches of clearance is usually required in front of any furnace for access & service. The supply plenum on any up-flow furnace should be at least 1 inch - below a combustible framing or ceiling area.",
        optionGroups: [
          { label: 'Satisfactory clearance?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'heat-12', num: 12, desc: 'Other heating issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'airConditioning',
    title: 'AIR CONDITIONING INSPECTION',
    icon: '❄️',
    pageNum: 12,
    items: [
      { id: 'ac-1', num: 1, desc: 'The installed cooling equipment (if outside air temperature is above 65°F).',
        optionGroups: [
          { label: 'Central Air:', options: ['N/A', 'Applicable'], exclusive: true },
          { label: 'Tested:', options: ['Yes', 'No', 'N/A', 'Disclaimed'], exclusive: true }
        ],
        options: ['Disclaimed due to factors noted above']
      },
      { id: 'ac-2', num: 2, desc: 'The cooling method by its distinguishing characteristics.',
        extraFields: [
          { key: 'condRefrig', label: 'Condition of refrig. lines', placeholder: '' },
          { key: 'condThermostat', label: 'Condition of thermostat', placeholder: '' },
          { key: 'condDrain', label: 'Condition of condensate drain', placeholder: '' }
        ]
      },
      { id: 'ac-3', num: 3, desc: 'The cooling unit and its adequacy.' },
      { id: 'ac-4', num: 4, desc: 'The heat-pump.',
        optionGroups: [
          { label: 'Heat-pump:', options: ['Yes', 'No', 'N/A', 'Disclaimed'], exclusive: true }
        ]
      },
      { id: 'ac-5', num: 5, desc: 'Other air conditioning/heat-pump issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'interior',
    title: 'INTERIOR INSPECTION',
    icon: '🚪',
    pageNum: 13,
    items: [
      { id: 'int-1', num: 1, desc: 'The steps, stairways & railings.', helperText: "Steps can be trip hazards, therefore the inspector will check for uniformity in the rise, run and tread. The rise (which should be no more than 8 inches high) is the part of the step you see when looking head-on at the steps (where your foot is NOT placed). The tread is where you place your foot and it should be about an inch more than the run. Most runs are a maximum of 9-11 inches." },
      { id: 'int-2', num: 2, desc: 'The countertops and a representative number of installed cabinets.' },
      { id: 'int-3', num: 3, desc: 'A representative number of doors and windows throughout.', helperText: "The inspector will generally check for the water-tightness of the home. This includes a spot check around the top, bottom and sides of doors, windows, etc. Caulking may be missing, loose or deteriorated as well as applicable flashing materials. The standards of practice do not require inspectors to check and inspect storm windows and screens, however, the home inspector will bring this to your attention as applicable. The inspection includes a careful observation for cracked, broken or missing window panes. Condensation typically shows up when there is a compromised seal and during great temperature differences between the indoors and outdoors." },
      { id: 'int-4', num: 4, desc: 'Garage doors and garage door openers as well as reversing mechanisms and other related safety items with the garage.',
        optionGroups: [
          { label: 'Door opens:', options: ['Manually', 'Motorized'], exclusive: true }
        ]
      },
      { id: 'int-5', num: 5, desc: 'The kitchen, walls, floors, cabinets, sink plumbing, electrical switches & receptacles.' },
      { id: 'int-6', num: 6, desc: 'Comment on the materials used for:',
        optionGroups: [
          { label: 'Floor sheathing:', options: ['Wood', 'Vinyl/Laminate', 'Ceramic', 'Carpet'], exclusive: true },
          { label: 'Wall sheathing:', options: ['Apparent', 'Plaster', 'Drywall', 'Paneling'], exclusive: true },
          { label: 'Ceilings:', options: ['Apparent', 'Plaster', 'Drywall', 'Wood'], exclusive: true }
        ],
        extraFields: [
          { key: 'floorOther', label: 'Other Floor Sheathing', placeholder: 'e.g. Concrete' },
          { key: 'wallOther', label: 'Other Wall Sheathing', placeholder: 'e.g. Brick' },
          { key: 'ceilOther', label: 'Other Ceilings', placeholder: 'e.g. Drop tiles' }
        ]
      },
      { id: 'int-7', num: 7, desc: 'The bathroom walls, ceilings, floor, tub/shower area, plumbing, heat, electrical & toilet/vanity or basin.' },
      { id: 'int-8', num: 8, desc: 'The living areas including: family rooms, dens, recreation, bedrooms & living rooms as applicable.',
        extraFields: [
          { key: 'numBedrooms', label: 'Number of bedrooms above grade', placeholder: 'e.g. 3' }
        ]
      },
      { id: 'int-9', num: 9, desc: 'Other interior issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'insulationVentilation',
    title: 'INSULATION & VENTILATION INSPECTION',
    icon: '🌡️',
    pageNum: 14,
    items: [
      { id: 'ins-1', num: 1, desc: 'The insulation, vapor-retarders (in unfinished areas).' },
      { id: 'ins-2', num: 2, desc: 'The ventilation of attics and foundation areas as well as the mechanical ventilation systems of the home.',
        optionGroups: [
          { label: 'Attic vents noted:', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ]
      },
      { id: 'ins-3', num: 3, desc: 'The bathroom vents (ventilation), foundation vents, dryer vents and any limitations thereof.' },
      { id: 'ins-4', num: 4, desc: 'Describe the visible vapor retarders if applicable:', hasOtherOption: true, options: ['Paper', 'Plastic', 'Foil', 'N/A'] },
      { id: 'ins-5', num: 5, desc: 'Other insulation/ventilation issues/concerns:', noRating: true }
    ]
  },
  {
    id: 'fireplace',
    title: 'FIREPLACE & SOLID FUEL-BURNING APPLIANCES',
    icon: '🪵',
    pageNum: 15,
    items: [
      { id: 'fp-1', num: 1, desc: 'The system components.', options: ['Gas', 'Wood-burning', 'Stove', 'None'],
        extraFields: [
          { key: 'numComponents', label: 'Number of Components', placeholder: '0' }
        ]
      },
      { id: 'fp-2', num: 2, desc: 'The vent systems, flues & chimneys.',
        optionGroups: [
          { label: 'Is fireplace a DIRECT-VENTED gas unit?', options: ['Yes', 'No', 'N/A'], exclusive: true }
        ],
        helperText: "Every wood-burning fireplace should have a dedicated flue. Older 2 story homes with two fireplaces typically share one flue as well as \"back-to-back\" fireplaces - these are unsafe as exhaust products from one fireplace can find their way back into the house through the other fireplace. This is an immediate safety issue. On a two fireplace system, at least one fireplace should be professionally sealed off. Type B vents are double-walled with an air space between and designed for interior use natural gas or propane appliances. BW vents are oval vents used for wall furnaces. C vents are single wall vents used in many residential applications. Type \"L\" vents are suitable for interior oil or gas appliances (unless noted for exterior use) and can be used instead of B vents (but B cannot be used instead of an L vent). Type \"L\" vents are double walled vents with an air space between (the inner wall is typically stainless steel and the outer wall is galvanized) and generally used with oil appliances. B & L type vents can serve multiple appliances as long as they are similar fuels, therefore, a number of gas appliances can use a single B vent. Multiple oil appliances using \"L\" vents must be on the same floor level if sharing a vent. An oil burning appliance can share a vent connector with a woodburning appliance as long as they are both on the same level and the oil appliance is vented ABOVE the woodburning appliances into the chimney. Condensation is more likely to damage chimneys without liners. See section 4 of the \"roof inspection\" for more information on various liners and their requirements. The inspector checks the damper which is located at the top of the firebox - this allows exhaust products to leave the house when the fireplace is operating and prevent cold air from entering when the appliance is idle." },
      { id: 'fp-3', num: 3, desc: 'Describe the fireplaces & solid fuel burning appliances as well as the chimney.', helperText: "If the chimney has a screen at the top to prevent embers or sparks from escaping (or to keep out squirrels, etc.) - the screen should have openings at least 1/4 inch large. Small screens easily become clogged with creosote. Please note that basement fireplaces often have poor draft. Draft is the ability of chimneys and vents to carry exhaust gases away & out of the house. Generally the warmer the chimney, the easier it is to maintain a good draft. Taller chimneys usually draw better than shorter chimneys. A rain cap at the top of the chimney can help to also provide protection from naturally occurring down-drafts. Wood burning stoves and fireplaces need larger flues than gas or oil appliances. Two to three flues are commonly found in masonry chimneys." },
      { id: 'fp-4', num: 4, desc: 'Clearance from component is adequate to ensure safety.', helperText: "Wood-burning fireplaces have specific safety clearances that are recommended for safety purposes. They include: 6 inches from fireplace openings & cleanout doors, 4 inches from the firebox, no more than 2 inches from chimneys, 2-9 inches away from outside combustion air inlet ducts and 12 inches from fireplace openings if above the opening and combustible material sticks out more than an inch from the face. It is difficult in many cases for the home inspector to clearly determine whether combustible clearances are adequate but diligent efforts are made. The inspector checks below and around the firebox (the area containing the fire within the fireplace/stove) for evidence of charring of combustible materials as this is an indication of a fire hazard." },
      { id: 'fp-5', num: 5, desc: 'Door or screen present, any loose fire bricks noted.' },
      { id: 'fp-6', num: 6, desc: 'Other fireplace or wood stove issues/concerns:', noRating: true }
    ]
  }
];

// ============================================================
// A-CODE LIBRARY — Pre-written recommendation paragraphs
// Codes A1-A55 from Addendum pages I, II, III
// ============================================================

export const A_CODES = [
  // === ADDENDUM I (A1–A24) ===
  { code: 'A1', text: 'The home inspector recommends monitoring of the cracks as noted in your home inspection report for any lengthening, widening or additional cracks that may appear. Any worsening of the situation may indicate movement that can lead to structural problems (if part of the home\'s foundation) or trip hazards if referring to a driveway or service walk. Please consult a qualified contractor or engineer for further analysis if any of these conditions occur.', category: 'I' },
  { code: 'A2', text: 'The home inspector disclaimed this portion of your inspection because a clear observation of the indicated area was not possible at time of inspection. This may be due to personal effects from the current occupant blocking a clear view or some other obstruction (such as insulation on basement walls, drywall or finishing material on the ceilings/walls of finished or partially finished attic areas, etc. (if applicable). In addition, if noted, snow or landscaping (if noted) may be another limitation preventing clear observation as noted by the home inspector. As a result, the client is urged to make note of this and check the area at time of the final inspection prior to closing.', category: 'I' },
  { code: 'A3', text: 'The home inspector cannot inspect the interior portions of the subject\'s foundation due to finishing noted in the basement. This applies to any ceiling areas in this area as well if applicable. As a result of the finishing these portions are disclaimed in the inspection.', category: 'I' },
  { code: 'A4', text: 'The home inspector observed rust and other evidence of moisture in the electric panel. Water and electricity do not mix. This is a safety issue that should be evaluated by a qualified electrician.', category: 'I' },
  { code: 'A5', text: 'Smoke Alarms: Every one or two-family dwelling, condominium or cooperative and each unit of a multiple dwelling in the state, used as a residence, shall have installed a smoke detector that provides an audible alarm within each bedroom or other room used for sleeping purposes. Both battery and electrically operated devices are acceptable. It should be noted however, that if your community has stricter smoke detector laws, they would take place of the state law. To find out what the law is in your community, contact your local Code Enforcement Officer. Home inspectors are not code enforcement officials. I recommend that you contact your local building inspector for more information. Municipalities may be more stringent than the state regulations with regard to number of detectors and placement (and regulations are always subject to change). The rules are similar for 2-4 family homes. This information is provided as a courtesy for you based on the home inspector\'s obligation to inspect for safety related issues (not code compliance). For more info visit: https://www.dos.ny.gov/dcea/pdf/smokedetex.pdf The inspector recommends that the client visit his or her local building dept. to get the current rules regarding number and placement for all smoke detectors in your municipality as this goes beyond the Standards of Practice for NYS Licensed Home Inspectors. As of April 1, 2019 any smoke detector that is replaced or installed should be powered by a 10 year, sealed, non-removable battery or hardwired to the home.', category: 'I' },
  { code: 'A6', text: 'Carbon Monoxide Detectors: In August, 2009 New York State passed Amanda\'s Law, which is named for a 16-year-old girl who died on January 17, 2009, due to a carbon monoxide leak from a defective boiler while she was sleeping at a friend\'s house. Amanda\'s Law requires that every one- or two- family dwelling, condominium, cooperative and each unit of a multiple dwelling shall have an operable carbon monoxide (CO) detector. Under Amanda\'s Law, homes built before January 1, 2008 are permitted to have battery-powered CO alarms, while homes built after this date are required to have the alarms hard-wired into the building. Additionally, Amanda\'s Law requires contractors to install a CO alarm when replacing a hot water tank or furnace if the home is not equipped with an alarm. CO detectors are required only if the dwelling unit has appliances, devices or systems that may emit carbon monoxide or there is an attached garage. Additional rules may apply and can change based on regulation updates. Home inspectors are not code enforcement officials, and as such I recommend that you contact your local building inspector for more information if you wish as municipalities may be more stringent than the state regulations with regard to number of alarms and placement (and regulations are always subject to change). The rules are similar for 2-4 family homes. This information is provided as a courtesy for you based on the home inspector\'s obligation to inspect for safety related issues (not code compliance). Please visit the state web-site for more information: https://www.dos.ny.gov/dcea/pdf/Part1220.pdf', category: 'I' },
  { code: 'A7', text: 'The inspector observed the noted rooms having receptacles that have reversed polarity. This describes the condition where electrical wires are connected to the wrong terminals of a receptacle; it\'s a common condition that can be hazardous if the "hot" side of your electrical system gets connected to certain types of lamps or equipment. I recommend inspection by a qualified electrician to further evaluate the situation.', category: 'I' },
  { code: 'A7a', text: 'The inspector did not observe a main disconnect/shutoff in the service panel box. In the event of an emergency, there is no way to quickly turn off all circuits in the residence. This is a safety concern and should be brought to the attention of a qualified electrician.', category: 'I' },
  { code: 'A8', text: 'The home inspector observed the noted rooms as having an "open" ground, this is a shock hazard. I recommend inspection by a qualified electrician to further evaluate the situation.', category: 'I' },
  { code: 'A8a', text: 'The home inspector observed a double tap in the service panel or subpanel box (at the indicated circuit). While allowed by some manufacturers occasionally, most times, this is considered a potential shock hazard as one wire may come lose and cause a short circuit. This should be reviewed with a qualified electrician.', category: 'I' },
  { code: 'A9', text: 'The home inspector did not observe any GFCI outlets or protected branch circuits during the inspection. While this is not required in older construction, it is a relatively inexpensive safety upgrade that you may want to consider in the near future. Any area that gets wet or has the potential to get wet should have this kind of shock or electrocution protection afforded it including: bathrooms, kitchens, laundry rooms, basements, exterior areas, etc.', category: 'I' },
  { code: 'A10', text: 'The home inspector observed exposed wiring in the areas noted. This is a fire hazard and should be evaluated by a qualified electrician.', category: 'I' },
  { code: 'A11', text: 'No sump pump cover was noted – this is a safety hazard. I recommend purchase of an appropriately sized lid from a local hardware store to correct this.', category: 'I' },
  { code: 'A12', text: 'This is a safety concern and should be evaluated by a qualified contractor.', category: 'I' },
  { code: 'A12a', text: 'The home inspector recommends further review by a qualified contractor.', category: 'I' },
  { code: 'A13', text: 'The electrical service entrance cable is frayed or compromised. This can allow water to enter the electricity panel. This can create a health and safety issue and should be evaluated by an electrician.', category: 'I' },
  { code: 'A14', text: 'The home inspector notes that there was no access to the attic and as such a complete roof & ventilation inspection could not be completed. The stated visible conditions in the inspection report are based on exterior observations only.', category: 'I' },
  { code: 'A15', text: 'The home inspector observed some rust/corrosion in the burner assembly area which may be caused by condensation or a slow leak. If this condition gets worse it will lead to less efficient operation or failure of the unit. Based on the age of the unit, the inspector recommends advising a qualified contractor/plumber/HVAC technician of this at your first annual maintenance check.', category: 'I' },
  { code: 'A16', text: 'The home inspector did not observe shut off valves for all fossil fuel burning appliances within the same room as the appliance, as such, you will likely have to turn off the main gas shut off to the residence should maintenance or an emergency situation arise.', category: 'I' },
  { code: 'A17', text: 'The home inspector did not observe an expansion tank/failed expansion tank. This may cause extra pressure on the plumbing system that could result in failure. Review by a plumber is recommended.', category: 'I' },
  { code: 'A18', text: 'Based on my visual inspection, there appears to be inadequate ventilation in the attic. This may be due to excessive insulation inappropriately located near existing vents, a lack of vents, some other type of blockage or a combination thereof. The implications of this, is a shortened roof life, possible ice damming and an increase in moisture in the attic. I recommend further evaluation by a qualified contractor.', category: 'I' },
  { code: 'A19', text: 'Missing trim, fascia and/or siding (as appropriately noted) allows for penetration of rain, snow and increases the potential for infestation. I recommend further evaluation by a qualified contractor.', category: 'I' },
  { code: 'A20', text: 'Excessive corrosion/galvanic action was noted in this area and as such the potential for failure will increase. I recommend monitoring this area. During your first seasonal inspection be sure to have a qualified contractor review this area for further evaluation.', category: 'I' },
  { code: 'A21', text: 'The inspector observed an inappropriate slope in this area which can lead to an accumulation of water and snow which is an added concern for the home\'s foundation. Spalling, foundation deterioration and ultimately leakage can occur if left unaddressed. I recommend further evaluation by a qualified contractor.', category: 'I' },
  { code: 'A22', text: 'Deferred maintenance was noted in this area – the implication is failure of this component. I recommend further evaluation by a qualified contractor.', category: 'I' },
  { code: 'A23', text: 'Gutters or appropriate roof drainage was not observed at the garage – the implication of this is wood rot at the base of the garage foundation and an increased chance for infestation. I recommend evaluation by a qualified contractor.', category: 'I' },
  { code: 'A24', text: 'The flashing in this area appears suspect. While not a problem right now, I recommend monitoring and if the condition worsens or failure is noted (such as leakage) - I recommend evaluation by a qualified contractor.', category: 'I' },

  // === ADDENDUM II (A25–A48a) ===
  { code: 'A25', text: 'The home inspector observed what appears to be asbestos wall sheathing on the exterior of the subject premises. This type of siding was used extensively from the 1930\'s through the 1970\'s because it provides an added level of insulation and has fire resistant properties. Unless otherwise noted in your report, I recommend monitoring on a seasonal basis as compromised asbestos shingles can become "friable" which means that the materials contained therein become airborne and can result in a health hazard. Check with a qualified contractor if you have further questions.', category: 'II' },
  { code: 'A26', text: 'The home inspector observed that there was no extension pipe on the hot water heater\'s temperature pressure relief valve (TPR). If excess pressure within the tank activates this safety device, hot water can spray haphazardly and burn anyone in the area. This is a low price fix and is recommended for safety purposes.', category: 'II' },
  { code: 'A26a', text: 'While inspecting the roof, the inspector observed some deferred maintenance around the chimney. When mortar is compromised, the structural integrity of the chimney can become questionable and the chance for further damage from water penetration is heightened. I recommend you contact a qualified contractor to review and repair as necessary.', category: 'II' },
  { code: 'A27', text: 'The home inspector did not observe a sump pump at the premises and based on his/her experience in the municipality; this town requires one in order to transfer title. I recommend you check with your real estate professional or local town official to see if this applies to you.', category: 'II' },
  { code: 'A28', text: 'The eye sensor at the garage door does not appear to be operational or may be out of alignment – this is a potential safety hazard and should be inspected by a qualified individual to realign or adjust appropriately. If there is no eye sensor present, the inspector notes that a retro-fit kit is available and if installed would significantly increase the safety at the inspected property. Further review by a qualified contractor for more information.', category: 'II' },
  { code: 'A29', text: 'The reversing mechanism on the automatic garage door does not appear to be adjusted properly or may not be functioning based on my in-field test. This is a potential safety hazard and should be inspected by a qualified individual for proper adjustment.', category: 'II' },
  { code: 'A30', text: 'The home inspector observed some efflorescence in this area. This may indicate that water is moving through the wall which can compromise the integrity of this component if the condition worsens. I recommend monitoring for now.', category: 'II' },
  { code: 'A31', text: 'Spalling was observed in this area. Spalling refers to a breakdown of masonry type materials (brick, concrete, stone, etc) due to a variety of conditions including mechanical weathering (freezing & thawing, thermal expansion & contracting, pressure and improper finishing). A continuation of this situation may cause a breakdown in this wall component – therefore I recommend periodic monitoring and further actions should the condition worsen.', category: 'II' },
  { code: 'A32', text: 'The home inspector observed this condition which from my experience may be considered a repair item if you are obtaining financing in terms of a mortgage loan. I recommend contacting your real estate agent before allowing a real estate appraiser to come out so you can alleviate any unnecessary "re-inspection" fees that might be charged by your lender.', category: 'II' },
  { code: 'A33', text: 'The home inspector observed that there was not an automatic door closer from the attached garage to the main residence. This is a safety issue and I recommend that a qualified contractor make the repair.', category: 'II' },
  { code: 'A34', text: 'Downspout extensions were missing. This causes unnecessary hydrostatic pressure on the foundation that could lead to leaks. The home inspector recommends review by a qualified contractor.', category: 'II' },
  { code: 'A34a', text: 'Downspouts from the second story gutter were discharging on to the roof. This can cause the shingles to wear prematurely in that area and ultimately lead to a leak. Extending the downspouts to the lower levels gutter would correct this.', category: 'II' },
  { code: 'A35', text: 'A missing chimney cap was noted. Chimney caps prevent hot embers from exiting the fire chimney and causing fires. They also prevent pests and debris from entering the chimney and causing blockages. It is recommended that a qualified contractor install a chimney cap.', category: 'II' },
  { code: 'A36', text: 'The home inspector notes that basement finishing was observed, however, according to the Standards of Practice and Code of Ethics for NYS Licensed Home Inspectors, we are not required to confirm that a building permit was obtained in accordance with the municipal authorities. The client is urged to confirm themselves whether a building permit was obtained or required at such time the modification was made.', category: 'II' },
  { code: 'A37', text: 'The home inspector observed galvanized gas lines. This is quite common however this type of piping can flake apart causing the fuel line to become clogged. The home inspector recommends review by a qualified plumber.', category: 'II' },
  { code: 'A37a', text: 'An appliance grade gas line was being utilized instead of a proper type of gas line. Appliance grade gas lines should not pass through floors or walls and should only be utilized in the immediate area of an appliance. Further review by a qualified contractor is recommended.', category: 'II' },
  { code: 'A37b', text: 'A copper gas line was noted. Copper tubing is soft and could be damaged easily, which in turn creates a safety issue. Replacement by a qualified contractor is recommended.', category: 'II' },
  { code: 'A38', text: 'The home inspector performed a due diligence inspection of the fireplace and the visible portions of the flue. While no significant buildup of creosote was observed a professional cleaning is recommended based on manufacturer\'s guidelines. If this information is not available, please visit the National Fire Protection Agency website at: www.nfpa.org Seasonal maintenance, cleaning & annual inspections are encouraged for any wood-burning components to maintain their integrity & safety.', category: 'II' },
  { code: 'A39', text: 'The inspector notes that the first approx. 18 inches of the water supply (cold water in, hot water out pipes at the top of the hot water heater) are not metallic. It gets very hot at the vent connector and this may lead to a leak – further review by a qualified plumber is recommended.', category: 'II' },
  { code: 'A40', text: 'If noted in your report, the inspector did not observe a cold water shut off at the top of your hot water heater, this isolates water from entering the tank should a repair be needed. A qualified plumber can make this change for you.', category: 'II' },
  { code: 'A41', text: 'The inspector observed a section of gas line in this area terminating at a shut off valve instead of a properly sized cap – this is a potential leak/safety concern and further review by a qualified HVAC technician is recommended.', category: 'II' },
  { code: 'A42', text: 'The home inspector did not observe a drip leg at the furnace or hot water heater (as appropriately noted), the implication is that any foreign particles that might be present in the fuel may clog the intricate components of the appliance and require unnecessary maintenance. As a result, the client is urged to bring this to the attention of his or her HVAC technician at the next seasonal maintenance interval.', category: 'II' },
  { code: 'A43', text: 'The inspector observed this condition which is atypical to what is normally observed (based on the home inspector\'s experience and training), while the component observed is functioning as intended, amateurish/atypical repairs generally do not last as long as when a professional is called in. I recommend periodic monitoring of the noted component and bringing it to the attention of the next qualified contractor for any other subsequent related repairs that may be called for.', category: 'II' },
  { code: 'A44', text: 'The home inspector observed the presence of suspected microbial growth in the noted area. While not qualified nor hired to inspect for this condition (based on the terms of our engagement contract), the inspector encourages the client to contact a qualified individual to determine the amount of area affected by this and based any recommendations on such information.', category: 'II' },
  { code: 'A45', text: 'The bathroom\'s fan was discharging into the attic or soffit instead of the exterior of the home. This could allow microbial growth to form or create other types of moisture related damage. I recommend a qualified contractor evaluate and make the necessary repairs.', category: 'II' },
  { code: 'A46', text: 'The inspector encourages that the client have a qualified HVAC technician/plumber check (and clean as appropriate), this component on a seasonal basis in order to ensure the long-term integrity of the component based on manufacturer\'s guidelines.', category: 'II' },
  { code: 'A47', text: 'The home inspector observed window(s) that appeared to have a broken seal. This reduces efficiency and distorts the view through the window. I recommend further evaluation by a qualified contractor.', category: 'II' },
  { code: 'A48', text: 'Mortar was missing or deteriorated around the flue pipe where it ties into the chimney. If left like this carbon monoxide could leak into the home creating a health risk. I recommend repair by a qualified contractor.', category: 'II' },
  { code: 'A48a', text: 'The flue pipe from the furnace/boiler/hot water heater was rusted or had holes in it. This can allow carbon monoxide to enter the home creating a health risk. Repair or replacement by a qualified contractor is recommended.', category: 'II' },

  // === ADDENDUM III (A49–A55) ===
  { code: 'A49', text: 'Federal Pacific or Challenger manufactured the electric panel. These companies have had litigation against them for faulty equipment that has lead to fires. Although there were no signs of fires or charring at time of inspection, I recommend further evaluation by a qualified electrician.', category: 'III' },
  { code: 'A50', text: 'The home inspector observed a loose toilet. If left in this condition a leak is likely. I recommend further review by a qualified contractor.', category: 'III' },
  { code: 'A51', text: 'The laundry tub was not secured. A leak is likely if not repaired by a qualified contractor.', category: 'III' },
  { code: 'A52', text: 'The home inspector noted what appeared to be professional crack/foundation repairs. You are urged to ascertain who did the work, if there is a transferable warranty, and was all suggested work completed.', category: 'III' },
  { code: 'A53', text: 'The vegetation was growing up against or too close to the home. The vegetation can damage the home\'s exterior. It also creates a conduit for pests and moisture. The home inspector recommends review by a qualified landscaper.', category: 'III' },
  { code: 'A54', text: 'An extension cord was being utilized as a long term wiring solution. These are intended for temporary use. Having additional outlets installed by a qualified contractor is a safer alternative.', category: 'III' },
  { code: 'A55', text: 'The air intake for the furnace was drawing combustion air from inside the home instead of the outside ambient air. Some HVAC technicians say this is perfectly fine while others disagree and state it reduces efficiency by up to 5% and could cause damage to the furnace. You are urged to check with your favorite HVAC company.', category: 'III' }
];

// ============================================================
// Create a new blank inspection object
// ============================================================

export function createNewInspection() {
  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
  const now = new Date().toISOString();

  // Build section data from definitions
  const sections = {};
  for (const sec of INSPECTION_SECTIONS) {
    sections[sec.id] = {
      items: sec.items.map(item => ({
        id: item.id,
        rating: null,
        comments: '',
        photos: [],
        selectedOptions: item.options ? {} : undefined,
        otherText: item.hasOtherOption ? '' : undefined
      }))
    };
  }

  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'in-progress',

    cover: {
      street: '',
      city: '',
      state: 'NY',
      zip: '',
      clientName: '',
      inspectionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      coverPhotoId: null,
      inspectionFee: '',
      realtorRelease: '',
      realtorName: '',
      clientEmail: '',
      clientSignature: null,
      signatureDate: ''
    },

    general: {
      timeStarted: '',
      timeCompleted: '',
      propertyType: '',
      garageType: '',
      driveway: '',
      attendees: [],
      structureType: '',
      occupancy: '',
      weather: '',
      temperature: '',
      approximateAge: '',
      squareFootage: ''
    },

    sections,

    summary: {
      concerns: '',
      selectedPhotos: []
    },

    addendumCodes: [],

    settings: {
      inspectorEmail: ''
    }
  };
}
