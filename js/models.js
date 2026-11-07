/* Марки й моделі → клас 3D-авто, на прикладі якого показуємо скло.
   gti — легкове (хетчбек, седан, універсал), sclass — бізнес-клас,
   jeep — позашляховик, кросовер, пікап, crafter — бус, мінівен, фургон, вантажне.
   Щоб додати модель — допишіть її в рядок потрібного класу через кому. */
const DATA = [
  ['Volkswagen', 'vw фольксваген фольц', {
    gti: 'Golf, Passat, Jetta, Polo, Bora, Arteon, Scirocco, Beetle, ID.3, Up',
    jeep: 'Tiguan, Touareg, T-Roc, T-Cross, Taigo, ID.4, ID.6, Amarok, Atlas',
    crafter: 'Crafter, Transporter T4, Transporter T5, Transporter T6, Caravelle, Multivan, Caddy, Sharan, Touran, LT, ID.Buzz' }],
  ['Skoda', 'шкода škoda', { gti: 'Octavia, Fabia, Rapid, Superb, Scala, Felicia, Roomster', jeep: 'Kodiaq, Karoq, Kamiq, Yeti, Enyaq' }],
  ['Renault', 'рено', { gti: 'Megane, Logan, Sandero, Clio, Fluence, Laguna, Symbol, Talisman, Zoe, Scenic', jeep: 'Duster, Captur, Koleos, Arkana, Kadjar', crafter: 'Trafic, Master, Kangoo, Dokker' }],
  ['Dacia', 'дачія дачия', { gti: 'Logan, Sandero, Spring', jeep: 'Duster', crafter: 'Dokker, Lodgy' }],
  ['Toyota', 'тойота', { gti: 'Corolla, Auris, Avensis, Yaris, Prius, C-HR', sclass: 'Camry, Crown', jeep: 'RAV4, Land Cruiser Prado, Land Cruiser 200, Land Cruiser 300, Highlander, Hilux, Fortuner, 4Runner, Sequoia', crafter: 'Hiace, Proace, Sienna, Alphard' }],
  ['Lexus', 'лексус', { sclass: 'ES, GS, LS, IS', jeep: 'RX, NX, LX, GX, UX' }],
  ['Hyundai', 'хюндай хендай хендэ хундай хьюндай', { gti: 'Elantra, Accent, i30, i20, i40, Sonata, Getz, Ioniq, Solaris', jeep: 'Tucson, Santa Fe, Creta, Kona, ix35, Palisade', crafter: 'H-1, Staria, H350' }],
  ['Kia', 'кіа киа', { gti: 'Ceed, Rio, Cerato, Optima, K5, Forte, Picanto, Stinger', jeep: 'Sportage, Sorento, Niro, Seltos, Soul, EV6, Mohave', crafter: 'Carnival, Carens' }],
  ['Ford', 'форд', { gti: 'Focus, Fiesta, Mondeo, Fusion, C-Max, Mustang', jeep: 'Kuga, Explorer, Edge, EcoSport, Ranger, Escape', crafter: 'Transit, Transit Custom, Transit Connect, Tourneo, Galaxy, S-Max' }],
  ['Opel', 'опель', { gti: 'Astra, Vectra, Insignia, Corsa, Zafira, Meriva', jeep: 'Mokka, Grandland, Crossland, Frontera, Antara', crafter: 'Vivaro, Movano, Combo' }],
  ['Mazda', 'мазда', { gti: '3, 6, 2, 5, 323, 626', jeep: 'CX-5, CX-30, CX-3, CX-7, CX-9, CX-60, BT-50' }],
  ['Honda', 'хонда', { gti: 'Civic, Accord, Jazz, Insight', jeep: 'CR-V, HR-V, Pilot', crafter: 'Odyssey' }],
  ['Nissan', 'ніссан ниссан', { gti: 'Leaf, Almera, Note, Micra, Primera, Sentra, Tiida', sclass: 'Teana, Maxima', jeep: 'X-Trail, Qashqai, Juke, Patrol, Navara, Pathfinder, Murano', crafter: 'Primastar, NV200, NV400, Interstar' }],
  ['Mitsubishi', 'мітсубісі мицубиси міцубісі', { gti: 'Lancer, Colt, Galant', jeep: 'Pajero, Pajero Sport, Outlander, L200, ASX, Eclipse Cross', crafter: 'L300, Grandis' }],
  ['Subaru', 'субару', { gti: 'Impreza, Legacy', jeep: 'Forester, Outback, XV, Crosstrek, Tribeca' }],
  ['Suzuki', 'сузукі сузуки', { gti: 'Swift, SX4, Baleno', jeep: 'Vitara, Grand Vitara, Jimny, S-Cross' }],
  ['Peugeot', 'пежо', { gti: '308, 301, 208, 207, 206, 407, 508', jeep: '3008, 2008, 5008', crafter: 'Boxer, Expert, Partner, Traveller, Rifter' }],
  ['Citroen', 'сітроен ситроен citroën', { gti: 'C4, C3, C-Elysee, C5, C4 Picasso', jeep: 'C5 Aircross, C3 Aircross', crafter: 'Jumper, Jumpy, Berlingo, SpaceTourer' }],
  ['Fiat', 'фіат фиат', { gti: 'Tipo, Punto, Linea, 500, Bravo', crafter: 'Ducato, Doblo, Scudo, Fiorino, Talento' }],
  ['Chevrolet', 'шевроле шевролет', { gti: 'Aveo, Lacetti, Cruze, Volt, Bolt, Malibu, Lanos', jeep: 'Niva, Captiva, Tahoe, Trax, Equinox' }],
  ['Daewoo', 'деу дэу део', { gti: 'Lanos, Sens, Matiz, Nexia, Nubira, Gentra' }],
  ['ЗАЗ', 'zaz заз запорожець', { gti: 'Lanos, Sens, Vida, Forza, Таврія' }],
  ['Lada', 'лада ваз жигулі жигули', { gti: '2107, 2106, 2109, 2110, Priora, Granta, Kalina, Vesta', jeep: 'Niva, Niva Travel' }],
  ['Seat', 'сеат', { gti: 'Leon, Ibiza, Toledo', jeep: 'Ateca, Arona, Tarraco', crafter: 'Alhambra' }],
  ['Mercedes-Benz', 'мерседес мерс mercedes benz', {
    gti: 'A-клас, B-клас, C-клас, CLA',
    sclass: 'S-клас, E-клас, CLS, Maybach, EQS, EQE',
    jeep: 'G-клас, GLE, GLC, GLS, GLA, GLB, ML, GL',
    crafter: 'Sprinter, Vito, V-клас, Viano, Citan' }],
  ['BMW', 'бмв бімер бэха', { gti: '1 Series, 3 Series, 4 Series, 2 Series, i3', sclass: '5 Series, 7 Series, 6 Series, 8 Series, i5, i7', jeep: 'X1, X3, X5, X6, X7, X4, iX' }],
  ['Audi', 'ауді ауди', { gti: 'A3, A4, A1, A5, TT', sclass: 'A6, A8, A7, e-tron GT', jeep: 'Q3, Q5, Q7, Q8, Q2, e-tron' }],
  ['Volvo', 'вольво', { gti: 'S60, V40, V60, S40', sclass: 'S80, S90', jeep: 'XC60, XC90, XC40, XC70' }],
  ['Porsche', 'порше порш', { sclass: 'Panamera, Taycan, 911', jeep: 'Cayenne, Macan' }],
  ['Land Rover', 'ленд ровер ленд-ровер рендж range rover', { jeep: 'Range Rover, Range Rover Sport, Range Rover Evoque, Range Rover Velar, Discovery, Discovery Sport, Defender, Freelander' }],
  ['Jeep', 'джип', { jeep: 'Wrangler, Grand Cherokee, Cherokee, Compass, Renegade, Gladiator' }],
  ['Tesla', 'тесла', { gti: 'Model 3', sclass: 'Model S', jeep: 'Model Y, Model X, Cybertruck' }],
  ['Infiniti', 'інфініті инфинити', { sclass: 'Q50, Q70, M', jeep: 'QX50, QX60, QX70, QX80, FX' }],
  ['Genesis', 'генезис', { sclass: 'G80, G90, G70', jeep: 'GV70, GV80' }],
  ['Jaguar', 'ягуар', { sclass: 'XF, XJ, XE', jeep: 'F-Pace, E-Pace, I-Pace' }],
  ['Chrysler', 'крайслер', { sclass: '300C', crafter: 'Pacifica, Voyager, Town & Country' }],
  ['Dodge', 'додж', { gti: 'Charger, Challenger', jeep: 'Durango, Journey, RAM', crafter: 'Grand Caravan' }],
  ['Cadillac', 'кадилак кадиллак', { sclass: 'CT6, CTS', jeep: 'Escalade, XT5' }],
  ['Iveco', 'івеко ивеко', { crafter: 'Daily, Stralis, Eurocargo, S-Way' }],
  ['MAN', 'ман', { crafter: 'TGX, TGS, TGL, TGE' }],
  ['DAF', 'даф', { crafter: 'XF, CF, LF' }],
  ['Scania', 'сканія скания', { crafter: 'R, S, G, P' }],
  ['Volvo Trucks', 'вольво фура', { crafter: 'FH, FM, FL' }],
  ['Mercedes-Benz Trucks', 'мерседес фура', { crafter: 'Actros, Atego, Arocs' }],
  ['Renault Trucks', 'рено фура', { crafter: 'T, Magnum, Premium' }],
  ['XCMG', 'хсмг', { crafter: 'бетононасос, автокран' }],
  ['Geely', 'джилі джили', { gti: 'Emgrand, CK', jeep: 'Coolray, Atlas, Tugella, Monjaro' }],
  ['Chery', 'чері чери', { gti: 'Amulet, Arrizo, Tiggo 2', jeep: 'Tiggo 4, Tiggo 7, Tiggo 8' }],
  ['BYD', 'бід бід', { gti: 'Seal, Dolphin, Qin, Han', jeep: 'Song Plus, Atto 3, Tang, Yuan Plus', crafter: 'D1' }],
  ['Haval', 'хавал', { jeep: 'H6, Jolion, H9, Dargo' }],
  ['Great Wall', 'грейт вол', { jeep: 'Hover, Wingle' }],
  ['Mini', 'міні мини', { gti: 'Cooper, Clubman', jeep: 'Countryman' }],
  ['Alfa Romeo', 'альфа ромео', { gti: 'Giulia, Giulietta, 159', jeep: 'Stelvio' }],
  ['Smart', 'смарт', { gti: 'ForTwo, ForFour' }],
  ['УАЗ', 'uaz уаз', { jeep: 'Patriot, Hunter', crafter: 'Буханка' }],
  ['ГАЗ', 'gaz газ', { crafter: 'Газель, Соболь' }],
  ['Богдан', 'bogdan богдан', { crafter: 'автобус А092' }],
];

/* кирилиця → латиниця і «спрощення», щоб «октавія», «тігуан», «хюндай» теж знаходились */
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', є: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ь: '', ъ: '', ы: 'i', э: 'e', ю: 'iu', я: 'ia', "'": '', '’': '' };
export function norm(s) {
  return String(s).toLowerCase().replace(/[\s\S]/g, c => TR[c] ?? c)
    .replace(/[šś]/g, 's').replace(/ë/g, 'e').replace(/ck/g, 'k').replace(/[cq]/g, 'k').replace(/ph/g, 'f').replace(/w/g, 'v').replace(/[yj]/g, 'i').replace(/x/g, 'ks')
    .replace(/ou/g, 'u').replace(/[^a-z0-9а-я\s]/g, ' ').replace(/([a-z])\1+/g, '$1').replace(/\s+/g, ' ').trim();
}

export const MODELS = [];
for (const [brand, aka, cls] of DATA) for (const k in cls) for (const m of cls[k].split(',')) {
  const model = m.trim(); if (!model) continue;
  MODELS.push({ k, brand, model, name: `${brand} ${model}`, key: norm(`${brand} ${model} ${aka}`) });
}

function close(a, b) { // відстань Левенштейна ≤ 1 для слів від 4 літер
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}

export function findModels(q, limit = 6) {
  // «х5», «сх-5» набрані кирилицею — це латинські X і C
  q = String(q).split(/\s+/).map(w => /\d/.test(w) ? w.replace(/[хХ]/g, 'x').replace(/[сС]/g, 'c') : w).join(' ');
  const t = norm(q).split(' ').filter(Boolean); if (t.join('').length < 2) return [];
  const out = [];
  for (const m of MODELS) {
    const words = m.key.split(' ');
    let score = 0, ok = true;
    for (const w of t) {
      if (m.key.includes(w)) { score += words.some(x => x.startsWith(w)) ? 3 : 1; continue; }
      if (w.length >= 4 && words.some(x => close(x.slice(0, w.length + 1), w) || close(x, w))) { score += 1; continue; }
      ok = false; break;
    }
    if (ok) out.push([score + (norm(m.model).startsWith(t[0]) ? 2 : 0), m]);
  }
  return out.sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length).slice(0, limit).map(x => x[1]);
}
