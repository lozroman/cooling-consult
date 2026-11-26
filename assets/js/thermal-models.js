// SI units inside formulas: kW, kJ, kg, m and s. The inputs use the units printed in each form.
const waterDensity = 1000;
const waterHeatCapacity = 4.186;
const gravity = 9.80665;
const evaporationHeat = 2450;
const kWPerGcalHour = 1163;
const kWPerRefrigerationTon = 3.516852842;

function metric(label, value, unit, digits = 2) {
  return { label, value, unit, digits };
}

function invalid(field, message) {
  return { error: { field, message } };
}

function heatLoad(flow, deltaT, density, heatCapacity) {
  return density * heatCapacity * flow * deltaT / 3600;
}

function velocity(flow, diameterMm) {
  const area = Math.PI * (diameterMm / 1000) ** 2 / 4;
  return flow / (3600 * area);
}

// ASHRAE Fundamentals, chapter 1. Saturation pressure over ice or liquid, in kPa.
function saturationPressure(temperature) {
  const k = temperature + 273.15;
  const logPa = temperature <= 0.01
    ? -5674.5359 / k + 6.3925247 - 0.009677843 * k + 6.2215701e-7 * k ** 2
      + 2.0747825e-9 * k ** 3 - 9.484024e-13 * k ** 4 + 4.1635019 * Math.log(k)
    : -5800.2206 / k + 1.3914993 - 0.048640239 * k + 4.1764768e-5 * k ** 2
      - 1.4452093e-8 * k ** 3 + 6.5459673 * Math.log(k);
  return Math.exp(logPa) / 1000;
}

function humidityRatio(vapourPressure, airPressure) {
  return 0.621945 * vapourPressure / (airPressure - vapourPressure);
}

function wetBulbTemperature(dry, pressure, targetHumidity) {
  let lower = -100;
  let upper = dry;
  for (let iteration = 0; iteration < 45; iteration++) {
    const wet = (lower + upper) / 2;
    const saturated = humidityRatio(saturationPressure(wet), pressure);
    const sensible = 1.006 * (dry - wet);
    const humidity = wet >= 0
      ? ((2501 - 2.326 * wet) * saturated - sensible) / (2501 + 1.86 * dry - 4.186 * wet)
      : ((2830 - 0.24 * wet) * saturated - sensible) / (2830 + 1.86 * dry - 2.1 * wet);
    if (humidity > targetHumidity) upper = wet;
    else lower = wet;
  }
  return (lower + upper) / 2;
}

function frictionFactor(reynolds, relativeRoughness) {
  if (reynolds <= 2300) return 64 / reynolds;

  // Solve Colebrook using 1/sqrt(lambda). Bridge the transition to the turbulent limit at 4000.
  const turbulentRe = Math.max(reynolds, 4000);
  let inverseRoot = 6;
  for (let step = 0; step < 18; step++) {
    inverseRoot = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 * inverseRoot / turbulentRe);
  }
  const turbulent = 1 / inverseRoot ** 2;
  if (reynolds >= 4000) return turbulent;
  const fraction = (reynolds - 2300) / 1700;
  return (1 - fraction) * 64 / 2300 + fraction * turbulent;
}

const powerUnits = {
  kw: { label: 'кВт', factor: 1 },
  mw: { label: 'МВт', factor: 1000 },
  kcal: { label: 'ккал/ч', factor: 0.001163 },
  gcal: { label: 'Гкал/ч', factor: kWPerGcalHour },
  tr: { label: 'TR', factor: kWPerRefrigerationTon }
};

export const calculators = {
  'teplovaya-moshchnost'({ flow, inlet, outlet, density, cp }) {
    const difference = Math.abs(inlet - outlet);
    const power = heatLoad(flow, difference, density, cp);
    return { rows: [
      metric('Тепловая мощность', power, 'кВт', 1),
      metric('Перепад температур', difference, '°C'),
      metric('Мощность в Гкал/ч', power / kWPerGcalHour, 'Гкал/ч', 3),
      metric('Массовый расход', flow * density / 3600, 'кг/с')
    ] };
  },

  'rashod-teplonositelya'({ power, supply, returnTemp, density, cp }) {
    const difference = Math.abs(supply - returnTemp);
    if (difference === 0) return invalid('returnTemp', 'Для расчёта расхода задайте разные температуры подачи и обратной линии.');
    const flow = power * 3600 / (density * cp * difference);
    return { rows: [
      metric('Объёмный расход', flow, 'м³/ч'),
      metric('Расход в литрах в секунду', flow / 3.6, 'л/с'),
      metric('Массовый расход', flow * density / 3600, 'кг/с'),
      metric('Перепад температур', difference, '°C')
    ] };
  },

  'vremya-nagreva'({ volume, start, end, power }) {
    const energy = volume * waterDensity * waterHeatCapacity * Math.abs(end - start) / 3600;
    const hours = energy / power;
    return { rows: [
      metric(end < start ? 'Время охлаждения' : 'Время нагрева', hours, 'ч'),
      metric('Время в минутах', hours * 60, 'мин', 1),
      metric('Количество теплоты', energy, 'кВт·ч', 1)
    ] };
  },

  'smeshenie-vody'({ flow1, temp1, flow2, temp2 }) {
    const total = flow1 + flow2;
    if (total === 0) return invalid('flow1', 'Задайте расход хотя бы одного из двух потоков.');
    return { rows: [
      metric('Температура смеси', (flow1 * temp1 + flow2 * temp2) / total, '°C', 1),
      metric('Суммарный расход', total, 'м³/ч'),
      metric('Доля первого потока', flow1 / total * 100, '%', 1)
    ] };
  },

  'mokryy-termometr'({ dry, rh, pressure }) {
    const vapour = saturationPressure(dry) * rh / 100;
    const humidity = humidityRatio(vapour, pressure);
    const wet = rh === 100 ? dry : wetBulbTemperature(dry, pressure, humidity);
    return { rows: [
      metric('Температура мокрого термометра', wet, '°C', 1),
      metric('Разность сухого и мокрого термометров', dry - wet, '°C', 1),
      metric('Влагосодержание воздуха', humidity * 1000, 'г/кг сух. воздуха', 1)
    ] };
  },

  'rezhim-gradirni'({ hot, cold, wet }) {
    if (hot <= cold) return invalid('hot', 'При охлаждении входящая в градирню вода должна быть теплее выходящей.');
    if (cold <= wet) return invalid('cold', 'Для конечной испарительной градирни температура воды на выходе должна быть выше температуры мокрого термометра.');
    const range = hot - cold;
    return { rows: [
      metric('Приближение к мокрому термометру', cold - wet, '°C', 1),
      metric('Перепад воды в градирне', range, '°C', 1),
      metric('Температурная эффективность', 100 * range / (hot - wet), '%', 1)
    ] };
  },

  'podpitka-gradirni'({ flow, hot, cold, cycles, driftPercent, latentPercent }) {
    if (hot < cold) return invalid('cold', 'При охлаждении температура воды на выходе не может быть выше температуры воды на входе.');
    const evaporation = flow * waterHeatCapacity * (hot - cold) * latentPercent / (100 * evaporationHeat);
    const drift = flow * driftPercent / 100;
    const targetLiquidLoss = evaporation / (cycles - 1);
    const blowdown = Math.max(0, targetLiquidLoss - drift);
    const makeup = evaporation + drift + blowdown;
    const rows = [
      metric('Расход подпиточной воды', makeup, 'м³/ч', 3),
      metric('Испарение', evaporation, 'м³/ч', 3),
      metric('Продувка', blowdown, 'м³/ч', 3),
      metric('Капельный унос', drift, 'м³/ч', 3),
      metric('Подпитка за 24 часа', makeup * 24, 'м³', 2)
    ];
    const excessiveDrift = drift > targetLiquidLoss + 1e-12;
    if (excessiveDrift) rows.push(metric('Достижимый коэффициент упаривания', 1 + evaporation / drift, '', 2));
    return {
      rows,
      shares: [evaporation, blowdown, drift],
      notice: excessiveDrift ? 'Капельный унос уже выводит больше солей, чем требуется для заданного коэффициента. Расчётная продувка равна нулю.' : ''
    };
  },

  'diametr-truby'({ flow, speed }) {
    const area = flow / (3600 * speed);
    return { rows: [
      metric('Внутренний диаметр', Math.sqrt(4 * area / Math.PI) * 1000, 'мм', 1),
      metric('Площадь проходного сечения', area * 10000, 'см²', 1),
      metric('Расход в литрах в секунду', flow / 3.6, 'л/с')
    ] };
  },

  'skorost-v-trube'({ flow, diameter }) {
    return { rows: [
      metric('Средняя скорость воды', velocity(flow, diameter), 'м/с'),
      metric('Площадь проходного сечения', Math.PI * (diameter / 10) ** 2 / 4, 'см²', 1),
      metric('Расход в литрах в секунду', flow / 3.6, 'л/с')
    ] };
  },

  'poteri-davleniya'({ flow, diameter, length, roughness, zeta, viscosity, density }) {
    if (roughness / diameter > 0.05) return invalid('roughness', 'Шероховатость должна составлять не более 5 % внутреннего диаметра для выбранной модели.');
    const speed = velocity(flow, diameter);
    const diameterM = diameter / 1000;
    const reynolds = speed * diameterM / (viscosity * 1e-6);
    const factor = reynolds > 0 ? frictionFactor(reynolds, roughness / diameter) : 0;
    const dynamicKpa = density * speed ** 2 / 2000;
    const straight = factor * length / diameterM * dynamicKpa;
    const local = zeta * dynamicKpa;
    return { rows: [
      metric('Потери давления', straight + local, 'кПа'),
      metric('По длине трубы', straight, 'кПа'),
      metric('В местных сопротивлениях', local, 'кПа'),
      metric('Потеря напора', (straight + local) * 1000 / (density * gravity), 'м'),
      metric('Число Рейнольдса', reynolds, '', 0)
    ], notice: reynolds > 2300 && reynolds < 4000 ? 'Переходный режим. Коэффициент трения оценён интерполяцией между ламинарным и турбулентным режимами.' : '' };
  },

  'napor-i-moshchnost-nasosa'({ flow, loss, elevation, vesselPressure, efficiency, density }) {
    const balance = elevation + (loss + vesselPressure) * 1000 / (density * gravity);
    const head = Math.max(0, balance);
    const hydraulic = density * gravity * (flow / 3600) * head / 1000;
    return { rows: [
      metric('Требуемый напор насоса', head, 'м'),
      metric('Перепад давления на насосе', head * density * gravity / 1000, 'кПа'),
      metric('Гидравлическая мощность', hydraulic, 'кВт'),
      metric('Мощность из сети', hydraulic * 100 / efficiency, 'кВт')
    ], notice: balance < 0 ? 'При заданном расходе доступный перепад покрывает сопротивление контура. Требуемый дополнительный напор принят равным нулю.' : '' };
  },

  'chiller-i-kondensator'({ cooling, cop }) {
    const compressor = cooling / cop;
    return { rows: [
      metric('Тепло на конденсаторе', cooling + compressor, 'кВт', 1),
      metric('Потребление компрессора', compressor, 'кВт', 1),
      metric('Холодопроизводительность', cooling, 'кВт', 1)
    ] };
  },

  'zatraty-na-resursy'({ electric, load, water, powerPrice, waterPrice, hours, days }) {
    const runHours = hours * days;
    const electricity = electric * load / 100 * runHours;
    const volume = water * runHours;
    const powerCost = electricity * powerPrice;
    const waterCost = volume * waterPrice;
    return { rows: [
      metric('Затраты за период', powerCost + waterCost, '₽', 2),
      metric('Стоимость электроэнергии', powerCost, '₽', 2),
      metric('Стоимость воды', waterCost, '₽', 2),
      metric('Потребление электроэнергии', electricity, 'кВт·ч', 1),
      metric('Объём воды', volume, 'м³', 1),
      metric('Время работы', runHours, 'ч', 1)
    ], shares: [powerCost, waterCost] };
  },

  'perevod-moshchnosti'({ value, unit }) {
    const source = powerUnits[unit];
    if (!source) return invalid('unit', 'Выберите исходную единицу мощности.');
    const kW = value * source.factor;
    const rows = Object.values(powerUnits).filter(entry => entry !== source).map(entry =>
      metric('Мощность в ' + entry.label, kW / entry.factor, entry.label, 5));
    return { rows };
  }
};
