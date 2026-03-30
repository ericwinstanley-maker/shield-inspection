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
      { id: 'ext-1', num: 1, desc: 'The exterior wall covering', options: ['Vinyl', 'Aluminum', 'Brick', 'Wood', 'Composition', 'Stucco', 'Asb. Shingles'] },
      { id: 'ext-2', num: 2, desc: 'Flashing and trim' },
      { id: 'ext-3', num: 3, desc: 'All exterior doors' },
      { id: 'ext-4', num: 4, desc: 'All exterior windows' },
      { id: 'ext-5', num: 5, desc: 'The eaves, soffits and fascias where accessible from the ground level' },
      { id: 'ext-6', num: 6, desc: 'The vegetation, grading, surface drainage and retaining walls on the property' },
      { id: 'ext-7', num: 7, desc: 'The walkways, patios, driveways and related service walks' },
      { id: 'ext-8', num: 8, desc: 'The entry doors, exterior faucets, swale or topography at the site' },
      { id: 'ext-9', num: 9, desc: 'The garage or carport including its roof, walls, foundation and construction' },
      { id: 'ext-10', num: 10, desc: 'Other exterior issues/concerns' }
    ]
  },
  {
    id: 'roof',
    title: 'ROOF INSPECTION',
    icon: '🏠',
    pageNum: 6,
    items: [
      { id: 'roof-1', num: 1, desc: 'The roof covering', options: ['Asphalt', 'Wood', 'Rubber', 'Steel', 'Other'] },
      { id: 'roof-2', num: 2, desc: 'The roof drainage systems', options: ['Yankee', 'Plastic', 'Aluminum', 'Steel', 'Other'] },
      { id: 'roof-3', num: 3, desc: 'The flashings utilized' },
      { id: 'roof-4', num: 4, desc: 'The skylights, chimneys and other roof penetrations' },
      { id: 'roof-5', num: 5, desc: 'The method used to inspect the roof', options: ['Visual from ground', 'From Attic/Scuttle', 'Binoculars', 'Drone'] },
      { id: 'roof-6', num: 6, desc: 'Other roof issues/concerns' }
    ]
  },
  {
    id: 'structural',
    title: 'STRUCTURAL INSPECTION',
    icon: '🔨',
    pageNum: 7,
    items: [
      { id: 'str-1', num: 1, desc: 'The foundation, basements and crawl spaces' },
      { id: 'str-2', num: 2, desc: 'The basement floor for heaving, settlement and moisture penetration' },
      { id: 'str-3', num: 3, desc: 'Foundation walls for indications of damage' },
      { id: 'str-4', num: 4, desc: 'The columns, beams, joists, trusses and sub-flooring' },
      { id: 'str-5', num: 5, desc: 'Probing of a representative number of structural components where deterioration is suspected' },
      { id: 'str-6', num: 6, desc: 'The overall grading and drainage at the foundation' },
      { id: 'str-7', num: 7, desc: 'The overall structural condition' },
      { id: 'str-8', num: 8, desc: 'Other structural issues/concerns' }
    ]
  },
  {
    id: 'plumbing',
    title: 'PLUMBING INSPECTION',
    icon: '🔧',
    pageNum: 8,
    items: [
      { id: 'plm-1', num: 1, desc: 'The interior water supply including all fixtures and faucets' },
      { id: 'plm-2', num: 2, desc: 'The interior drain, waste and vent systems' },
      { id: 'plm-3', num: 3, desc: 'The hot water system, controls, chimneys, flues and vents' },
      { id: 'plm-4', num: 4, desc: 'Sump pumps and related piping' },
      { id: 'plm-5', num: 5, desc: 'Overall condition of pipes, support, visual inspection for cross connections' },
      { id: 'plm-6', num: 6, desc: 'The water heater make, model and approximate age' },
      { id: 'plm-7', num: 7, desc: 'Water pressure and flow' },
      { id: 'plm-8', num: 8, desc: 'Hose bibs (exterior faucets)' },
      { id: 'plm-9', num: 9, desc: 'Laundry connections and drain' },
      { id: 'plm-10', num: 10, desc: 'Other plumbing issues/concerns' }
    ]
  },
  {
    id: 'electrical',
    title: 'ELECTRICAL INSPECTION',
    icon: '⚡',
    pageNum: 10,
    items: [
      { id: 'elec-1', num: 1, desc: 'The service entrance conductors and equipment' },
      { id: 'elec-2', num: 2, desc: 'The main and distribution panels, breakers, fuses and over-current devices' },
      { id: 'elec-3', num: 3, desc: 'The grounding and bonding of the electrical system' },
      { id: 'elec-4', num: 4, desc: 'A representative number of installed lighting fixtures, switches and receptacles' },
      { id: 'elec-5', num: 5, desc: 'The wiring methods and presence of solid conductor aluminum branch circuit wiring' },
      { id: 'elec-6', num: 6, desc: 'Ground fault circuit interrupters (GFCI)' },
      { id: 'elec-7', num: 7, desc: 'Smoke/CO detectors' },
      { id: 'elec-8', num: 8, desc: 'Other electrical issues/concerns' }
    ]
  },
  {
    id: 'heating',
    title: 'HEATING INSPECTION',
    icon: '🔥',
    pageNum: 11,
    items: [
      { id: 'heat-1', num: 1, desc: 'The installed heating equipment' },
      { id: 'heat-2', num: 2, desc: 'The energy source and heating method by its distinguishing characteristics' },
      { id: 'heat-3', num: 3, desc: 'The heating unit and its adequacy' },
      { id: 'heat-4', num: 4, desc: 'The vent systems, flues, and chimneys' },
      { id: 'heat-5', num: 5, desc: 'The condition of the furnace/boiler and operation' },
      { id: 'heat-6', num: 6, desc: 'The distribution system (ducts, pipes, radiators as applicable)' },
      { id: 'heat-7', num: 7, desc: 'The thermostat operation' },
      { id: 'heat-8', num: 8, desc: 'Other heating issues/concerns' }
    ]
  },
  {
    id: 'airConditioning',
    title: 'AIR CONDITIONING INSPECTION',
    icon: '❄️',
    pageNum: 12,
    items: [
      { id: 'ac-1', num: 1, desc: 'The installed cooling equipment (if outside air temperature is above 65°F)' },
      { id: 'ac-2', num: 2, desc: 'The cooling method by its distinguishing characteristics' },
      { id: 'ac-3', num: 3, desc: 'The cooling unit and its adequacy' },
      { id: 'ac-4', num: 4, desc: 'The heat pump' },
      { id: 'ac-5', num: 5, desc: 'Other air conditioning/heat-pump issues/concerns' }
    ]
  },
  {
    id: 'interior',
    title: 'INTERIOR INSPECTION',
    icon: '🚪',
    pageNum: 13,
    items: [
      { id: 'int-1', num: 1, desc: 'The steps, stairways and railings' },
      { id: 'int-2', num: 2, desc: 'The countertops and a representative number of installed cabinets' },
      { id: 'int-3', num: 3, desc: 'A representative number of doors and windows throughout' },
      { id: 'int-4', num: 4, desc: 'Garage doors and garage door openers including reversing mechanisms' },
      { id: 'int-5', num: 5, desc: 'The kitchen: walls, floors, cabinets, sink plumbing, electrical' },
      { id: 'int-6', num: 6, desc: 'Comment on the materials used for flooring, walls, and ceilings' },
      { id: 'int-7', num: 7, desc: 'The bathroom: walls, ceilings, floor, tub/shower, plumbing, toilet' },
      { id: 'int-8', num: 8, desc: 'The living areas: family rooms, dens, bedrooms and living rooms' },
      { id: 'int-9', num: 9, desc: 'Other interior issues/concerns' }
    ]
  },
  {
    id: 'insulationVentilation',
    title: 'INSULATION & VENTILATION INSPECTION',
    icon: '🌡️',
    pageNum: 14,
    items: [
      { id: 'ins-1', num: 1, desc: 'The insulation, vapor-retarders (in unfinished areas)' },
      { id: 'ins-2', num: 2, desc: 'The ventilation of attics and foundation areas and mechanical ventilation systems' },
      { id: 'ins-3', num: 3, desc: 'The bathroom vents, foundation vents, dryer vents and limitations' },
      { id: 'ins-4', num: 4, desc: 'Describe the visible vapor retarders if applicable' },
      { id: 'ins-5', num: 5, desc: 'Other insulation/ventilation issues/concerns' }
    ]
  },
  {
    id: 'fireplace',
    title: 'FIREPLACE & SOLID FUEL-BURNING APPLIANCES',
    icon: '🪵',
    pageNum: 15,
    items: [
      { id: 'fp-1', num: 1, desc: 'The system components' },
      { id: 'fp-2', num: 2, desc: 'The vent systems, flues and chimneys' },
      { id: 'fp-3', num: 3, desc: 'Describe the fireplaces and solid fuel burning appliances as well as the chimney' },
      { id: 'fp-4', num: 4, desc: 'Other fireplace/solid fuel issues/concerns' }
    ]
  }
];

// ============================================================
// A-CODE LIBRARY — Pre-written recommendation paragraphs
// Codes A1-A55 from Addendum pages I, II, III
// ============================================================

export const A_CODES = [
  { code: 'A1', text: 'The home inspector recommends monitoring of the cracks as noted in your home inspection report for any lengthening, widening or additional cracks that may appear. Any worsening of the situation may indicate movement that can lead to structural problems (if part of the home\'s foundation) or trip hazards if referring to a driveway or service walk. Please consult a qualified contractor or engineer for further analysis if any of these conditions occur.', category: 'I' },
  { code: 'A2', text: 'The home inspector disclaimed this portion of your inspection because a clear observation of the indicated area was not possible at time of inspection. This may be due to personal effects from the current occupant blocking a clear view or some other obstruction (such as insulation on basement walls, drywall or finishing material on the ceilings/walls of finished or partially finished attic areas, etc.). In addition, if noted, snow or landscaping may be another limitation preventing clear observation. The client is urged to make note of this and check the area at time of the final inspection prior to closing.', category: 'I' },
  { code: 'A3', text: 'The home inspector cannot inspect the interior portions of the subject\'s foundation due to finishing noted in the basement. This applies to any ceiling areas in this area as well if applicable. As a result of the finishing these portions are disclaimed in the inspection.', category: 'I' },
  { code: 'A4', text: 'The home inspector observed rust and other evidence of moisture in the electric panel. Water and electricity do not mix. This is a safety issue that should be evaluated by a qualified electrician.', category: 'I' },
  { code: 'A5', text: 'Smoke Alarms: Every one or two-family dwelling, condominium or cooperative and each unit of a multiple dwelling in the state, used as a residence, shall have installed a smoke detector that provides an audible alarm within each bedroom or other room used for sleeping purposes. Both battery and electrically operated devices are acceptable. The inspector recommends that the client visit his or her local building dept. to get the current rules regarding number and placement for all smoke detectors.', category: 'I' },
  { code: 'A6', text: 'Carbon Monoxide Detectors: Amanda\'s Law requires that every one or two-family dwelling, condominium or cooperative and each unit of a multiple dwelling in the state have a functioning carbon monoxide detector installed. Contact your local building/code enforcement official for requirements regarding number and placement.', category: 'I' },
  { code: 'A7', text: 'The home inspector observed an underground oil tank at the subject property. Underground oil tanks can rust and deteriorate which can cause leakage into the soil and contaminate ground water. I recommend having the tank checked by a qualified environmental or tank company to determine the condition of the tank.', category: 'I' },
  { code: 'A8', text: 'Non-grounded, two-prong receptacles observed as noted. While these are not necessarily defective and may have been acceptable when originally installed, they do not provide the same level of protection as modern three-prong grounded receptacles. I recommend consultation with a qualified electrician regarding upgrading options.', category: 'I' },
  { code: 'A8a', text: 'A double-tapped breaker was observed (two wires connected to a single breaker terminal designed for one wire). This is a potential safety hazard. Evaluation and repair by a qualified electrician is recommended.', category: 'I' },
  { code: 'A9', text: 'Ground Fault Circuit Interrupter (GFCI) protection was not observed or was not functioning properly at the locations noted. GFCI receptacles are required in kitchens, bathrooms, laundry areas, garages, and exterior outlets. I recommend installation/repair by a qualified electrician.', category: 'I' },
  { code: 'A10', text: 'The main water shut-off valve was not readily accessible or could not be located. In an emergency, it is important to know where this valve is located and that it is functional. I recommend having a qualified plumber identify and ensure its proper operation.', category: 'I' },
  { code: 'A11', text: 'The water supply pipes are galvanized steel. These pipes have a tendency to corrode and build up mineral deposits on the inside, which restricts water flow and reduces water pressure over time. I recommend monitoring the water pressure and having a qualified plumber evaluate if low pressure is noted.', category: 'I' },
  { code: 'A12', text: 'The home inspector observed conditions that warrant attention. Further evaluation by a qualified contractor is recommended to determine the extent and appropriate remediation. This condition should be addressed in a timely manner to prevent further deterioration.', category: 'I' },
  { code: 'A12a', text: 'The home inspector observed this condition which warrants attention. Please see the detailed description in the body of your report and the accompanying photo(s) for reference. Further evaluation by a qualified professional is recommended if the described condition is a concern.', category: 'I' },
  { code: 'A13', text: 'The electrical service panel cover was not removed due to its condition or the type of panel (such as panels with factory-sealed or specialized covers). As a result, the interior components of the panel were not inspected. I recommend evaluation by a qualified electrician.', category: 'I' },
  { code: 'A14', text: 'Missing or damaged shingles were observed on the roof. This condition can allow water penetration which may cause damage to the roof structure or interior of the home. I recommend repair by a qualified roofing contractor.', category: 'I' },
  { code: 'A15', text: 'The furnace filter was dirty or appeared to need replacement. A dirty filter restricts air flow and reduces the efficiency of the heating system. Regular filter changes (every 1–3 months) are recommended.', category: 'I' },
  { code: 'A16', text: 'Deferred maintenance was noted in this area – the implication is failure of this component. I recommend further evaluation by a qualified contractor.', category: 'I' },
  { code: 'A17', text: 'Gutters or appropriate roof drainage was not observed at the garage – the implication of this is wood rot at the base of the garage foundation and an increased chance for infestation. I recommend evaluation by a qualified contractor.', category: 'I' },
  { code: 'A18', text: 'The flashing in this area appears suspect. While not a problem right now, I recommend monitoring and if the condition worsens or failure is noted (such as leakage) - I recommend evaluation by a qualified contractor.', category: 'I' },
  { code: 'A19', text: 'The home inspector observed what appears to be previous or current termite/insect damage or activity. While the home inspector is not a pest control specialist, I recommend a full pest inspection by a licensed pest control operator.', category: 'I' },
  { code: 'A20', text: 'The handrail/guardrail at the noted location does not appear to meet current safety standards. This could be a trip/fall hazard. I recommend evaluation and repair by a qualified contractor.', category: 'I' },
  { code: 'A21', text: 'The home inspector noted evidence of previous water penetration/damage in this area. While no active leaking was observed at time of inspection, the client is urged to monitor this area. If active leaking is noted, evaluation by a qualified contractor is recommended.', category: 'I' },
  { code: 'A22', text: 'Rotted or deteriorated wood was observed at the noted location. This weakens the structural integrity and invites pests and further water damage. I recommend repair or replacement by a qualified contractor.', category: 'I' },
  { code: 'A23', text: 'The basement showed evidence of moisture/water issues. While the basement may have been dry at time of inspection, stains, efflorescence, or other indicators suggest moisture may be present during periods of heavy rain. I recommend monitoring and consultation with a waterproofing specialist if issues persist.', category: 'I' },
  { code: 'A24', text: 'The crawl space was not accessible and could not be inspected. Conditions in this area are unknown. The client is urged to have this area inspected when access is available.', category: 'I' },
  { code: 'A25', text: 'The home inspector observed what appears to be asbestos wall sheathing on the exterior of the subject premises. This type of siding was used extensively from the 1930\'s through the 1970\'s because it provides an added level of insulation and has fire resistant properties. Unless otherwise noted in your report, I recommend monitoring on a seasonal basis as compromised asbestos shingles can become "friable" which means that the materials contained therein become airborne and can result in a health hazard. Check with a qualified contractor if you have further questions.', category: 'II' },
  { code: 'A26', text: 'The home inspector observed that there was no extension pipe on the hot water heater\'s temperature pressure relief valve (TPR). If excess pressure within the tank activates this safety device, hot water can spray haphazardly and burn anyone in the area. This is a low price fix and is recommended for safety purposes.', category: 'II' },
  { code: 'A27', text: 'While inspecting the roof, the inspector observed some deferred maintenance around the chimney. When mortar is compromised, the structural integrity of the chimney can become questionable and the chance for further damage from water penetration is heightened. I recommend you contact a qualified contractor to review and repair as necessary.', category: 'II' },
  { code: 'A28', text: 'The home inspector did not observe a sump pump at the premises and based on his/her experience in the municipality; this town requires one in order to transfer title. I recommend you check with your real estate professional or local town official to see if this applies to you.', category: 'II' },
  { code: 'A29', text: 'The eye sensor at the garage door does not appear to be operational or may be out of alignment – this is a potential safety hazard and should be inspected by a qualified individual to realign or adjust appropriately. If there is no eye sensor present, the inspector notes that a retro-fit kit is available and if installed would significantly increase the safety at the inspected property. Further review by a qualified contractor for more information.', category: 'II' },
  { code: 'A30', text: 'The reversing mechanism on the automatic garage door does not appear to be adjusted properly or may not be functioning based on my in-field test. This is a potential safety hazard and should be inspected by a qualified individual for proper adjustment.', category: 'II' },
  { code: 'A31', text: 'The home inspector observed some efflorescence in this area. This may indicate that water is moving through the wall which can compromise the integrity of this component if the condition worsens. I recommend monitoring for now.', category: 'II' },
  { code: 'A32', text: 'Spalling was observed in this area. Spalling refers to a breakdown of masonry type materials (brick, concrete, stone, etc) due to a variety of conditions including mechanical weathering (freezing & thawing, thermal expansion & contracting, pressure and improper finishing). A continuation of this situation may cause a breakdown in this wall component – therefore I recommend periodic monitoring and further actions should the condition worsen.', category: 'II' },
  { code: 'A33', text: 'The home inspector observed this condition which from my experience may be considered a repair item if you are obtaining financing in terms of a mortgage loan. I recommend contacting your real estate agent before allowing a real estate appraiser to come out so you can alleviate any unnecessary "re-inspection" fees that might be charged by your lender.', category: 'II' },
  { code: 'A34', text: 'The home inspector observed that there was not an automatic door closer from the attached garage to the main residence. This is a safety issue and I recommend that a qualified contractor make the repair.', category: 'II' },
  { code: 'A35', text: 'Downspout extensions were missing. This causes unnecessary hydrostatic pressure on the foundation that could lead to leaks. The home inspector recommends review by a qualified contractor.', category: 'II' },
  { code: 'A36', text: 'Downspouts from the second story gutter were discharging on to the roof. This can cause the shingles to wear prematurely in that area and ultimately lead to a leak. Extending the downspouts to the lower levels gutter would correct this.', category: 'II' },
  { code: 'A37', text: 'A missing chimney cap was noted. Chimney caps prevent hot embers from exiting the fire chimney and causing fires. They also prevent pests and debris from entering the chimney and causing blockages. It is recommended that a qualified contractor install a chimney cap.', category: 'II' },
  { code: 'A37a', text: 'The home inspector notes that basement finishing was observed, however, according to the Standards of Practice and Code of Ethics for NYS Licensed Home Inspectors, we are not required to confirm that a building permit was obtained in accordance with the municipal authorities. The client is urged to confirm themselves whether a building permit was obtained for the work.', category: 'II' },
  { code: 'A37b', text: 'The home inspector observed galvanized gas lines. This is quite common however this type of piping can flake apart causing the fuel line to become clogged. The home inspector recommends review by a qualified plumber.', category: 'II' },
  { code: 'A38', text: 'The inspector notes that the first approx. 18 inches of the water supply (cold water in, hot water out pipes at the top of the hot water heater) are not metallic. It gets very hot at the vent connector and this may lead to a leak – further review by a qualified plumber is recommended.', category: 'II' },
  { code: 'A39', text: 'An appliance grade gas line was being utilized instead of a proper type of gas line. Appliance grade gas lines should not pass through floors or walls and should only be utilized in the immediate area of an appliance. Further review by a qualified contractor is recommended.', category: 'II' },
  { code: 'A40', text: 'A copper gas line was noted. Copper tubing is soft and could be damaged easily, which in turn creates a safety issue. Replacement by a qualified contractor is recommended.', category: 'II' },
  { code: 'A41', text: 'The home inspector performed a due diligence inspection of the fireplace and the visible portions of the flue. While no significant buildup of creosote was observed a professional cleaning is recommended based on manufacturer\'s guidelines. If this information is not available, please visit the National Fire Protection Agency website at: www.nfpa.org. Seasonal inspections by a qualified chimney sweep are encouraged for any wood-burning components to maintain their integrity & safety.', category: 'II' },
  { code: 'A42', text: 'If noted in your report, the inspector did not observe a cold water shut off at the top of your hot water heater, this isolates water from entering the tank should a repair be needed. A qualified plumber can make this change for you.', category: 'II' },
  { code: 'A43', text: 'The inspector observed a section of gas line in this area terminating at a shut off valve instead of a properly sized cap – this is a potential leak/safety concern and further review by a qualified HVAC technician is recommended.', category: 'II' },
  { code: 'A44', text: 'The home inspector did not observe a drip leg at the furnace or hot water heater (as appropriately noted), the implication is that any foreign particles that might be present in the fuel may clog the intricate components of the appliance and require unnecessary maintenance. As a result, the client is urged to bring this to the attention of his or her HVAC technician for further evaluation.', category: 'II' },
  { code: 'A45', text: 'The inspector observed this condition which is atypical to what is normally observed (based on the home inspector\'s experience and training), while the component observed is functioning as intended, amateurish/atypical repairs generally do not last as long as when a professional is called in. I recommend periodic monitoring of the noted component and contacting a qualified contractor for any other subsequent related repairs that may be called for.', category: 'II' },
  { code: 'A46', text: 'The home inspector observed the presence of suspected microbial growth in the noted area. While not qualified nor hired to inspect for this condition (based on the terms of our engagement contract), the inspector encourages the client to contact a qualified individual to determine the amount of area affected by this and based any recommendations on such professional guidance.', category: 'II' },
  { code: 'A47', text: 'The home inspector observed window(s) that appeared to have a broken seal. This reduces efficiency and distorts the view through the window. I recommend further evaluation by a qualified contractor.', category: 'II' },
  { code: 'A48', text: 'Mortar was missing or deteriorated around the flue pipe where it ties into the chimney. If left like this carbon monoxide could leak into the home creating a health risk. I recommend repair by a qualified contractor.', category: 'II' },
  { code: 'A48a', text: 'The flue pipe from the furnace/boiler/hot water heater was rusted or had holes in it. This can allow carbon monoxide to enter the home creating a health risk. Repair or replacement by a qualified contractor is recommended.', category: 'II' },
  { code: 'A49', text: 'Federal Pacific or Challenger manufactured the electric panel. These companies have had litigation against them for faulty equipment that has lead to fires. Although there were no signs of fires or charring at time of inspection, I recommend further evaluation by a qualified electrician.', category: 'III' },
  { code: 'A50', text: 'The home inspector observed a loose toilet. If left in this condition a leak is likely. I recommend further review by a qualified contractor.', category: 'III' },
  { code: 'A51', text: 'The bathroom\'s fan was discharging into the attic or soffit instead of the exterior of the home. This could allow microbial growth to form or create other types of moisture related damage. I recommend a qualified contractor evaluate and make the necessary repairs.', category: 'III' },
  { code: 'A52', text: 'The laundry tub was not secured. A leak is likely if not repaired by a qualified contractor.', category: 'III' },
  { code: 'A53', text: 'The inspector encourages that the client have a qualified HVAC technician/plumber check (and clean as appropriate), this component on a seasonal basis in order to ensure the long-term integrity of the component based on manufacturer\'s guidelines.', category: 'III' },
  { code: 'A54', text: 'The home inspector noted what appeared to be professional crack/foundation repairs. You are urged to ascertain who did the work, if there is a transferable warranty, and was all suggested work completed.', category: 'III' },
  { code: 'A55', text: 'The vegetation was growing up against or too close to the home. The vegetation can damage the home\'s exterior. It also creates a conduit for pests and moisture. The home inspector recommends review by a qualified landscaper.', category: 'III' }
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
        selectedOptions: item.options ? {} : undefined
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
      inspectionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
