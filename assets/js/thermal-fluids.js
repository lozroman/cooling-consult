// Liquid properties. Temperature in °C, density in kg/m³, and heat capacity in kJ/(kg·K).
// Water: values sampled from IAPWS SR6-08(2011) at 0.1 MPa.
const water = [
  [0, 999.842, 4.21932],
  [4, 999.974, 4.20737],
  [5, 999.966, 4.20492],
  [10, 999.702, 4.19514],
  [15, 999.102, 4.18855],
  [20, 998.207, 4.18419],
  [25, 997.047, 4.18145],
  [30, 995.649, 4.1799],
  [35, 994.033, 4.17927],
  [40, 992.216, 4.17936],
  [45, 990.212, 4.18004],
  [50, 988.035, 4.18123],
  [55, 985.693, 4.18286],
  [60, 983.195, 4.1849],
  [65, 980.55, 4.18732],
  [70, 977.764, 4.19012],
  [75, 974.842, 4.1933],
  [80, 971.79, 4.19686],
  [85, 968.611, 4.20083],
  [90, 965.309, 4.20523],
  [95, 961.887, 4.21012],
  [100, 958.348, 4.21557]
];

// Eastman Therminol 66 technical bulletin, liquid properties. Bulk temperature limit: 345 °C.
const therminol66 = [
  [-3, 1023, 1.49],
  [0, 1021, 1.49],
  [10, 1015, 1.53],
  [20, 1008, 1.56],
  [30, 1002, 1.6],
  [40, 995, 1.63],
  [50, 989, 1.66],
  [60, 982, 1.7],
  [80, 969, 1.77],
  [100, 955, 1.84],
  [120, 941, 1.91],
  [140, 928, 1.98],
  [160, 914, 2.05],
  [180, 899, 2.12],
  [200, 885, 2.19],
  [220, 870, 2.27],
  [240, 856, 2.34],
  [260, 840, 2.42],
  [280, 825, 2.49],
  [300, 809, 2.57],
  [320, 792, 2.65],
  [340, 775, 2.73],
  [350, 766, 2.77]
];

// Melinder (IIR, 2010), MEG and MPG coefficient sets published in CoolProp 6.6.0.
// Rows are powers of temperature; columns are powers of glycol mass fraction.
const glycols = {
  eg: {
    baseK: 304.878,
    baseFraction: 0.308462,
    freezing: [257.9, -80.8, -133.4, -72.93, 100.6, 11.4],
    density: [
      [1034, 131.1, 0.749, -106.2, -96.23, 489.1],
      [-0.4781, -0.6876, 0.7855, 1.229, -7.211],
      [-0.002692, 0.004805, -0.003995, -0.01153],
      [0.000004725, 0.00000169, 0.00004982]
    ],
    capacity: [
      [3737, -1799, -993.3, 2610, 1537, -16180],
      [2.93, 10.46, 3.516, -1.189, -42.72],
      [-0.004675, -0.04147, 0.05109, -0.1643],
      [-0.00001389, 0.00001847, -0.0007138]
    ]
  },
  pg: {
    baseK: 305.8583,
    baseFraction: 0.307031,
    freezing: [259.9, -66.31, -109.4, -228.3, -340.9, 146.5],
    density: [
      [1018, 76.04, -24.98, -155, -113.1, 234.2],
      [-0.5406, -0.945, 0.27, 2.829, -2.221],
      [-0.002666, 0.005541, -0.004018, -0.007175],
      [0.00001347, -0.00001343, 0.00003376]
    ],
    capacity: [
      [3882, -1304, -1598, 353.9, 5000, -4959],
      [2.699, 5.07, 0.9534, 31.02, -71.35],
      [-0.001659, -0.004752, 0.1167, -0.295],
      [-0.00001032, 0.0001522, -0.000487]
    ]
  }
};

// Reference density, its measurement temperature and the volume-expansion coefficient (1/K).
// Fuels: Veeder-Root EMR3. Turbine oil: LUKOIL Tp-22S grade 2. Hydraulic oil: Mobil DTE 25 Ultra.
const petroleum = {
  gasoline:   { density: 737,   temperature: 15,   expansion: 0.00126 },
  diesel:     { density: 849,   temperature: 15,   expansion: 0.00081 },
  kerosene:   { density: 820,   temperature: 15,   expansion: 0.00090 },
  turbine:    { density: 870,   temperature: 20,   expansion: 0.00085 },
  hydraulic:  { density: 866.7, temperature: 15.6, expansion: 0.00085 }
};

function polynomial(coefficients, x) {
  return coefficients.reduceRight((total, coefficient) => total * x + coefficient, 0);
}

function interpolate(table, temperature) {
  const upperIndex = table.findIndex(point => point[0] >= temperature);
  const [t2, rho2, cp2] = table[upperIndex];
  if (t2 === temperature) return { density: rho2, cp: cp2 };
  const [t1, rho1, cp1] = table[upperIndex - 1];
  const fraction = (temperature - t1) / (t2 - t1);
  return { density: rho1 + fraction * (rho2 - rho1), cp: cp1 + fraction * (cp2 - cp1) };
}

function petroleumProperties(reference, temperature) {
  // Veeder-Root EMR3, V15/Vt = 1 + alpha * (15 - t). Keep mass constant.
  const density15 = reference.density / (1 + reference.expansion * (15 - reference.temperature));
  const densityAt = t => density15 * (1 + reference.expansion * (15 - t));
  const sixtyFahrenheit = (60 - 32) / 1.8;
  const specificGravity = densityAt(sixtyFahrenheit) / 999.016;
  // Cragoe, NBS MP 97, eq. 5, expressed in kJ/(kg·K).
  const cp = 4.1868 * (0.388 + 0.00045 * (32 + 1.8 * temperature)) / Math.sqrt(specificGravity);
  return { density: densityAt(temperature), cp };
}

export function liquidProperties(values, first, second) {
  const { medium = 'custom', density, cp } = values;
  const inlet = values[first];
  const outlet = values[second];
  if (!Number.isFinite(inlet) || !Number.isFinite(outlet)) {
    return { error: { field: Number.isFinite(inlet) ? second : first, message: 'Введите обе рабочие температуры жидкости.' } };
  }
  const temperature = (inlet + outlet) / 2;

  if (medium === 'custom') {
    if (!(Number.isFinite(density) && density > 0)) return { error: { field: 'density', message: 'Введите положительную плотность среды по паспорту.' } };
    if (!(Number.isFinite(cp) && cp > 0)) return { error: { field: 'cp', message: 'Введите положительную удельную теплоёмкость среды по паспорту.' } };
    return { density, cp, temperature };
  }

  const glycol = Object.hasOwn(glycols, medium) ? glycols[medium] : undefined;
  const oil = Object.hasOwn(petroleum, medium) ? petroleum[medium] : undefined;
  const isWater = medium === 'water' || medium === 'distillate';
  if (!isWater && !glycol && !oil && medium !== 'therminol') {
    return { error: { field: 'medium', message: 'Выберите рабочую среду.' } };
  }

  let minimum = 0;
  let maximum = 100;
  let fraction = 0;
  let concentrationOffset = 0;
  if (glycol) {
    const concentration = values.strength === 'other' ? values.concentration : Number(values.strength);
    if (!Number.isFinite(concentration) || concentration < 0 || concentration > 60) {
      return { error: { field: values.strength === 'other' ? 'concentration' : 'strength', message: 'Введите массовую концентрацию гликоля от 0 до 60 %.' } };
    }
    fraction = concentration / 100;
    concentrationOffset = fraction - glycol.baseFraction;
    if (fraction > 0) minimum = Math.min(0, polynomial(glycol.freezing, concentrationOffset) - 273.15);
  } else if (medium === 'therminol') {
    minimum = -3;
    maximum = 345;
  } else if (oil) {
    // The supported interval is common to the heat-capacity and density corrections.
    maximum = 70;
  }

  const lowField = inlet < outlet ? first : second;
  const highField = inlet > outlet ? first : second;
  const degrees = t => t.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' °C';
  if (values[lowField] < minimum) {
    const message = glycol || isWater
      ? 'При заданной температуре среда может кристаллизоваться. Начало кристаллизации — около ' + degrees(minimum) + '.'
      : 'Нижняя граница справочных данных для выбранной среды ' + degrees(minimum) + '. Для другого диапазона введите свойства по паспорту.';
    return { error: { field: lowField, message } };
  }
  if (values[highField] > maximum) {
    return { error: { field: highField, message: 'Верхняя граница справочных данных для выбранной среды ' + degrees(maximum) + '. Для другого диапазона введите свойства по паспорту.' } };
  }

  if (isWater || (glycol && fraction === 0)) {
    return { ...interpolate(water, temperature), temperature, freezing: glycol ? 0 : undefined };
  }
  if (glycol) {
    const offsetK = temperature + 273.15 - glycol.baseK;
    const evaluate = matrix => polynomial(matrix.map(row => polynomial(row, concentrationOffset)), offsetK);
    return { density: evaluate(glycol.density), cp: evaluate(glycol.capacity) / 1000, temperature, freezing: minimum };
  }
  if (oil) return { ...petroleumProperties(oil, temperature), temperature };
  return { ...interpolate(therminol66, temperature), temperature };
}
