import { invalid, metric, saturationPressure, towerWaterBalance } from './thermal-models.js?v=20261126c';
import { liquidProperties } from './thermal-fluids.js?v=20261126b';
import { climateCities } from './freecooling-climate.js?v=20261126c';

function propertiesAt(fluid, concentration, temperature) {
  return liquidProperties({ medium: fluid, strength: concentration, at: temperature }, 'at', 'at');
}

function bufferVolume(v) {
  const low = v.mean - v.band / 2;
  const high = v.mean + v.band / 2;
  const fluid = liquidProperties({ medium: v.fluid, strength: v.fraction, low, high }, 'low', 'high');
  if (fluid.error) return invalid('mean', fluid.error.message);
  const excess = Math.max(0, v.stage - v.demand);
  const fromCycle = 60000 * excess * v.minutes / (fluid.density * fluid.cp * v.band);
  const minimum = Math.max(fromCycle, v.makerMinimum);
  const extra = Math.max(0, minimum - v.existing);
  return { rows: [
    metric('Дополнительный объём буфера', extra, 'л', 1),
    metric('Минимальный активный объём контура', minimum, 'л', 1),
    metric('По времени работы компрессора', fromCycle, 'л', 1),
    metric('Минимум по паспорту чиллера', v.makerMinimum, 'л', 1),
    metric('Активный объём действующего контура', v.existing, 'л', 1),
    metric('Избыток холодопроизводительности ступени', excess, 'кВт', 1)
  ], notice: extra > 0 ? 'Указан полезный объём, который должен участвовать в циркуляции через испаритель.'
    : v.makerMinimum > 0 ? 'Заданного активного объёма хватает по обоим условиям.'
    : 'Активного объёма хватает по длительности цикла. Паспортный минимум чиллера в исходных данных не задан.' };
}

function drainback(v) {
  if (v.level > v.overflow) return invalid('level', 'Рабочий уровень уже выше кромки перелива. Проверьте отметки от дна бака.');
  const area = v.shape === 'round' ? Math.PI * (v.tankDiameter / 2) ** 2 : v.length * v.width;
  const pipe = Math.PI * (v.bore / 2000) ** 2 * v.pipeLength;
  const drain = pipe + v.towerDrain + v.otherDrain;
  const free = area * (v.overflow - v.level);
  const spilled = Math.max(0, drain - free);
  const headroom = Math.max(0, free - drain) / area;
  const main = spilled > 1e-10 ? metric('Объём воды, который уйдёт в перелив', spilled, 'м³', 3)
    : metric('Запас до перелива после остановки', headroom * 100, 'см', 1);
  const rows = [main,
    metric('Уровень воды после слива', v.overflow - headroom, 'м', 3),
    metric('Свободный объём до остановки', free, 'м³', 3),
    metric('Всего стечёт в бак', drain, 'м³', 3),
    metric('В том числе из участка трубы', pipe, 'м³', 3)
  ];
  return { rows,
  notice: spilled > 1e-10 ? 'Свободного объёма не хватает. Итоговый уровень принят по кромке свободного перелива.' : 'Результат относится к установившемуся уровню после остановки насосов.' };
}

function suction(v) {
  const { density } = propertiesAt('water', 0, v.waterTemp);
  const vapour = saturationPressure(v.waterTemp);
  if (vapour >= v.atmosphere) return invalid('waterTemp', 'При таком давлении вода в открытом баке достигает кипения. Проверьте температуру и абсолютное давление.');
  const atmosphericHead = (v.atmosphere - vapour) * 1000 / (density * 9.80665);
  const height = v.level - v.pump;
  const available = atmosphericHead + height - v.loss;
  const spare = available - v.required;
  return { rows: [
    metric('Доступный кавитационный запас NPSHₐ', available, 'м'),
    metric('Требуемый NPSHᵣ по кривой насоса', v.required, 'м'),
    metric('Превышение NPSHₐ над NPSHᵣ', spare, 'м'),
    metric('Запас сверх заданного требования', spare - v.margin, 'м'),
    metric('Уровень относительно оси насоса', height, 'м'),
    metric('Давление насыщенного пара', vapour, 'кПа абс.', 3)
  ], notice: spare >= v.margin ? 'В этой рабочей точке заданный запас обеспечен.' : 'В этой рабочей точке доступного запаса недостаточно для заданного требования.' };
}

function expansionTank(v) {
  if (v.high < v.low) return invalid('high', 'Максимальная температура должна быть не ниже минимальной.');
  if (v.charge > v.fill) return invalid('fill', 'Начальное давление жидкости у бака должно быть не ниже предзаряда.');
  if (v.limit <= v.fill) return invalid('limit', 'Конечное рабочее давление должно быть выше начального.');
  const cold = propertiesAt(v.fluid, v.fraction, v.low);
  const hot = propertiesAt(v.fluid, v.fraction, v.high);
  if (cold.error || hot.error) return invalid(cold.error ? 'low' : 'high', (cold.error || hot.error).message);
  let minimumDensity = Math.min(cold.density, hot.density);
  let maximumDensity = Math.max(cold.density, hot.density);
  // Near freezing, even a cooling circuit may expand at either end of the temperature interval.
  const samples = Math.ceil((v.high - v.low) * 4);
  for (let i = 1; i < samples; i++) {
    const { density } = propertiesAt(v.fluid, v.fraction, v.low + i * (v.high - v.low) / samples);
    minimumDensity = Math.min(minimumDensity, density);
    maximumDensity = Math.max(maximumDensity, density);
  }
  if (v.low <= 4 && v.high >= 4) maximumDensity = Math.max(maximumDensity, propertiesAt(v.fluid, v.fraction, 4).density);
  const expansion = v.system * (maximumDensity / minimumDensity - 1);
  const precharge = v.charge + 1;
  const coldPressure = v.fill + 1;
  const hotPressure = v.limit + 1;
  const acceptance = precharge * (1 / coldPressure - 1 / hotPressure);
  const initialFraction = (v.fill - v.charge) / coldPressure;
  if (v.reserve > 0 && initialFraction <= 0) return invalid('fill', 'Для начального резерва жидкости давление заполнения должно превышать предзаряд.');
  const nominal = Math.max(expansion / acceptance, initialFraction > 0 ? v.reserve / initialFraction : 0);
  return { rows: [
    metric('Минимальный номинальный объём бака', nominal, 'л', 1),
    metric('Изменение объёма теплоносителя', expansion, 'л', 2),
    metric('Расширение в заданном диапазоне', (maximumDensity / minimumDensity - 1) * 100, '%', 3),
    metric('Доля бака для компенсации расширения', acceptance * 100, '%', 1),
    metric('Начальный запас жидкости в таком баке', nominal * initialFraction, 'л', 2)
  ], notice: 'При подборе серийного бака округлите объём вверх и сверьте допустимую приёмную ёмкость мембраны с паспортом.' };
}

function glycolChange(v) {
  const initial = v.initial / 100;
  const target = v.target / 100;
  let stock = 1;
  let stockDensity = v.fluid === 'pg' ? 1036 : 1113;
  if (v.reagent === 'water') {
    stock = 0;
    stockDensity = propertiesAt('water', 0, 20).density;
  } else if (v.reagent === 'product') {
    stock = v.productFraction / 100;
    stockDensity = v.productDensity;
  }
  if (target < Math.min(initial, stock) || target > Math.max(initial, stock)) {
    return invalid('target', 'Целевая концентрация должна лежать между концентрациями исходной смеси и добавляемой жидкости.');
  }
  const before = propertiesAt(v.fluid, v.initial, 20).density;
  const after = propertiesAt(v.fluid, v.target, 20).density;
  const initialMass = v.volume * before;
  const targetMass = v.volume * after;
  const addMass = initial === target ? 0 : targetMass * (target - initial) / (stock - initial);
  const drainMass = Math.max(0, initialMass - (targetMass - addMass));
  return { rows: [
    metric('Слить исходный раствор', drainMass / before * 1000, 'л', 1),
    metric('Добавить выбранную жидкость', addMass / stockDensity * 1000, 'л', 1),
    metric('Масса добавки', addMass, 'кг', 1),
    metric('Целевая массовая доля гликоля', v.target, '%', 2),
    metric('Итоговый объём при 20 °C', v.volume, 'м³', 3)
  ], notice: initial === target ? 'В контуре уже заданная концентрация.' : 'Сначала слейте рассчитанный объём исходной однородной смеси, затем добавьте рассчитанную массу. Объёмы слива и заливки могут различаться.' };
}

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function freeCooling(v) {
  if (v.returnTemp <= v.supply) return invalid('returnTemp', 'Температура обратной линии должна быть выше температуры подачи.');
  const city = climateCities[v.city];
  if (!city) return invalid('city', 'Выберите город из списка метеостанций.');
  const span = v.returnTemp - v.supply + v.approach;
  const fullLimit = v.supply - v.approach;
  const partialLimit = v.returnTemp - span * v.minShare / 100;
  const annual = [0, 0, 0];
  let equivalent = 0;
  const tableRows = city.months.map((bins, month) => {
    const hours = [0, 0, 0];
    bins.forEach((count, index) => {
      const low = city.min + (index - 0.5) * city.step;
      const high = low + city.step;
      const fullEnd = Math.max(low, Math.min(high, fullLimit));
      const partialEnd = Math.max(fullEnd, Math.min(high, partialLimit));
      const full = count * (fullEnd - low) / city.step;
      const partial = count * (partialEnd - fullEnd) / city.step;
      hours[0] += full;
      hours[1] += partial;
      hours[2] += count - full - partial;
      const meanPartialAir = (fullEnd + partialEnd) / 2;
      equivalent += full + partial * (v.returnTemp - meanPartialAir) / span;
    });
    // Allocate the last one or two whole hours so each published month sums to its observed total.
    const whole = hours.map(value => Math.floor(Math.max(0, value)));
    const remaining = Math.round(hours.reduce((sum, value) => sum + value, 0)) - whole.reduce((sum, value) => sum + value, 0);
    const order = [0, 1, 2].sort((a, b) => (hours[b] - whole[b]) - (hours[a] - whole[a]));
    for (const index of order.slice(0, remaining)) whole[index]++;
    whole.forEach((value, index) => { annual[index] += value; });
    return [monthNames[month], ...whole];
  });
  const station = city.station.startsWith(city.name) ? city.station : city.name + ', ' + city.station;
  return { rows: [
    metric('Полный фрикулинг за год', annual[0], 'ч', 0),
    metric('Частичный фрикулинг', annual[1], 'ч', 0),
    metric('Только машинное охлаждение', annual[2], 'ч', 0),
    metric('Эквивалент часов полной холодопроизводительности драйкулера', equivalent, 'ч', 0),
    metric('Наружная температура для полного режима, до', fullLimit, '°C', 1),
    metric('Верхний порог частичного режима', partialLimit, '°C', 1)
  ], table: { caption: 'Режимы охлаждения по месяцам', columns: ['Месяц', 'Полный, ч', 'Частичный, ч', 'Только чиллер, ч'], rows: tableRows, digits: 0 },
  notice: station + '. ' + city.period + ' Шаг температуры ' + String(city.step).replace('.', ',') + ' °C. Режим работы — круглосуточный.',
  source: { url: city.source, label: 'Климатические данные выбранной станции' } };
}

function insulation(v) {
  const vapour = saturationPressure(v.air) * v.humidity / 100;
  let low = -100;
  let high = v.air;
  for (let i = 0; i < 54; i++) {
    const mid = (low + high) / 2;
    if (saturationPressure(mid) < vapour) low = mid;
    else high = mid;
  }
  const dew = v.humidity === 100 ? v.air : (low + high) / 2;
  const aim = dew + v.margin;
  const radius = v.diameter / 2000;
  const conductivity = v.material === 'custom' ? v.lambda : Number(v.material);
  let thickness = 0;
  let surface = v.pipe;
  if (aim > v.pipe) {
    if (aim >= v.air) return invalid('margin', 'Требуемая температура поверхности достигает температуры воздуха. Для холодной трубы конечной толщины с таким запасом нет. Проверьте влажность и запас.');
    const transfer = conductivity * (aim - v.pipe) / (v.alpha * (v.air - aim));
    let inner = radius;
    let outer = radius + transfer;
    for (let i = 0; i < 65; i++) {
      const middle = (inner + outer) / 2;
      if (middle * Math.log(middle / radius) < transfer) inner = middle;
      else outer = middle;
    }
    thickness = (outer - radius) * 1000;
    const installedRadius = radius + Math.ceil(thickness) / 1000;
    const ratio = v.alpha * installedRadius * Math.log(installedRadius / radius) / conductivity;
    surface = v.air - (v.air - v.pipe) / (1 + ratio);
  }
  return { rows: [
    metric('Минимальная толщина изоляции', thickness, 'мм', 2),
    metric('Толщина с округлением вверх', Math.ceil(thickness), 'мм', 0),
    metric(dew < 0 ? 'Температура точки инея' : 'Температура точки росы', dew, '°C', 2),
    metric('Требуемая температура поверхности', aim, '°C', 2),
    metric('Поверхность при округлённой толщине', surface, '°C', 2)
  ], notice: thickness === 0 ? 'При заданных параметрах поверхность трубы уже теплее расчётного порога или равна ему.' : 'Выберите ближайшую большую серийную толщину и обеспечьте непрерывность пароизоляции на стыках и опорах.' };
}

function payback(v) {
  const hours = v.days * v.hours;
  const balance = towerWaterBalance(v.circulation, v.drop, v.cycles, v.drift, v.latent);
  const oldWater = hours * v.direct;
  const newWater = hours * balance.makeup;
  const oldSewer = oldWater * v.sewerShare / 100;
  const newSewer = hours * balance.blowdown * v.blowdownShare / 100;
  const oldPower = hours * v.oldKW;
  const newPower = hours * v.newKW;
  const service = v.investment * v.service / 100 + v.chemicals;
  const before = oldWater * v.waterPrice + oldSewer * v.sewerPrice + oldPower * v.powerPrice;
  const after = newWater * v.waterPrice + newSewer * v.sewerPrice + newPower * v.powerPrice + service;
  const saving = before - after;
  const rows = [metric('Чистая экономия за сезон', saving, '₽', 0)];
  if (saving > 0) rows.push(metric('Простой срок окупаемости', v.investment / saving, 'года', 2));
  rows.push(metric('Экономия покупной воды за сезон', oldWater - newWater, 'м³', 1),
    metric('Подпитка градирни', balance.makeup, 'м³/ч', 3),
    metric('В том числе испарение', balance.evaporation, 'м³/ч', 3),
    metric('Продувка', balance.blowdown, 'м³/ч', 3),
    metric('Капельный унос', balance.drift, 'м³/ч', 3),
    metric('Время работы за сезон', hours, 'ч', 1));
  const table = { caption: 'Сравнение за один сезон', columns: ['Показатель', 'Прямоток', 'Градирня'], digits: 1,
    rows: [['Покупная вода, м³', oldWater, newWater], ['Платный сброс, м³', oldSewer, newSewer],
      ['Электроэнергия, кВт·ч', oldPower, newPower], ['Водоснабжение, ₽', oldWater * v.waterPrice, newWater * v.waterPrice],
      ['Водоотведение, ₽', oldSewer * v.sewerPrice, newSewer * v.sewerPrice],
      ['Электроэнергия, ₽', oldPower * v.powerPrice, newPower * v.powerPrice],
      ['Дополнительные обслуживание и реагенты, ₽', 0, service], ['Всего, ₽', before, after]] };
  return { rows, table, notice: saving > 0 ? 'Принят один одинаковый сезон в год. Простой срок рассчитан при постоянных тарифах и без дисконтирования.' : 'В заданном режиме положительной годовой экономии нет. Инвестиции за счёт этой экономии не окупаются.' };
}

// WEG W22 IE3, 200L, 4 poles, 400 V delta, 50 Hz. Values at stated shaft loads.
const wegPoints = { 50: [92.9, 0.63], 75: [93.6, 0.75], 100: [93.7, 0.81] };

function motorCurrents(v) {
  const sample = v.motor === 'weg';
  const power = sample ? 30 : v.power;
  const voltage = sample ? 400 : v.voltage;
  const efficiency = sample ? 93.7 : v.efficiency;
  const factor = sample ? 0.81 : v.factor;
  const fromPower = (output, eta, cos) => output * 1000 / (Math.sqrt(3) * voltage * eta / 100 * cos);
  const formulaCurrent = fromPower(power, efficiency, factor);
  const rated = sample ? 57.1 : (v.plate || formulaCurrent);
  const mode = sample ? v.wegLoad : v.customLoad;
  const load = mode === 'partial' ? v.load : Number(mode);
  let working = rated;
  if (load === 0) working = sample ? 27 : v.idle;
  else if (load < 100) {
    const [eta, cos] = sample ? wegPoints[load] : [v.workEfficiency, v.workFactor];
    working = fromPower(power * load / 100, eta, cos);
  }
  let start;
  let startLabel = 'Пусковой ток при прямом включении';
  let notice = 'Пусковой ток дан как действующее значение при неподвижном роторе. Краткий пик первого полупериода может быть выше.';
  if (v.start === 'direct') {
    start = rated * (sample ? 7.5 : v.multiple);
  } else if (v.start === 'star') {
    start = rated * (sample ? 7.5 : v.multiple) / 3;
    startLabel = 'Начальный линейный ток в звезде';
    notice = 'Для пуска Y/Δ нужны шесть выводов и рабочее соединение Δ при напряжении сети. При переключении возможен дополнительный бросок тока.';
  } else if (v.start === 'soft') {
    start = rated * v.softLimit;
    startLabel = 'Предел тока УПП по уставке';
    notice = 'Показан заданный предел на разгоне. Фактический ток и время разгона зависят от нагрузки и настроек УПП.';
  } else if (v.start === 'vfd') {
    start = rated * v.driveLimit / 100;
    startLabel = 'Предел выходного тока ПЧ на двигатель';
    notice = 'Уставка относится к току на выходе ПЧ. Входной ток сети смотрите по данным привода. Рабочий ток рассчитан для номинальной частоты и синусоидального питания.';
  }
  return { rows: [metric('Номинальный линейный ток', rated, 'А', 1),
    metric('Рабочий ток при ' + String(load).replace('.', ',') + ' % нагрузки', working, 'А', 1),
    metric(startLabel, start, 'А', sample && v.start === 'direct' ? 0 : 1), metric('Мощность на валу при этой нагрузке', power * load / 100, 'кВт', 1),
    metric('Активная мощность при номинале', power * 100 / efficiency, 'кВт', 2),
    metric('Расчётный номинальный ток по КПД и cos φ', formulaCurrent, 'А', 1)], notice };
}

export const plantCalculators = {
  'bufer-chillera': bufferVolume,
  'pereliv-baka-gradirni': drainback,
  'kavitatsionnyy-zapas-npsh': suction,
  'rasshiritelnyy-bak': expansionTank,
  'doliv-glikolya': glycolChange,
  'chasy-frikulinga': freeCooling,
  'izolyatsiya-ot-kondensata': insulation,
  'okupaemost-gradirni': payback,
  'toki-elektrodvigatelya': motorCurrents
};
