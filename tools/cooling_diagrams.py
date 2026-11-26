"""Regenerate the static drawings and their matched parts lists for the engineering centre."""
from collections import defaultdict
from dataclasses import dataclass
from html import escape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BLUE, RED, INK, GREY, TEAL = "#244bb8", "#a84c2d", "#172533", "#536675", "#137568"
PALE, WHITE = "#eaf1fb", "#fff"
W, L, R = 760, 108, 654
REV = "20261126p2"
MONO = "Consolas, 'Liberation Mono', monospace"


def path(d, color=INK, width=2, fill="none", extra=""):
    return f'<path d="{d}" stroke="{color}" stroke-width="{width}" fill="{fill}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'


def rect(x, y, w, h, fill=WHITE, stroke=INK, rx=2, width=1.8):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def circle(x, y, r, fill=WHITE, stroke=INK, width=1.7):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def label(x, y, value, size=16, color=INK, align="start", weight=450, mono=False):
    font = f' font-family="{MONO}"' if mono else ""
    return f'<text x="{x}" y="{y}" text-anchor="{align}" font-size="{size}" fill="{color}" font-weight="{weight}"{font}>{escape(value)}</text>'


def tag(x, y, value, align="start"):
    return label(x, y, value, 14, INK, align, 650, True)


def arrow(x, y, direction, color):
    return (f'<path transform="translate({x} {y}) rotate({dict(right=0,down=90,left=180,up=270)[direction]})" '
            f'd="M-5 -4.5 L4 0 L-5 4.5 Z" fill="{color}"/>')


def joint(x, y, color):
    return circle(x, y, 3.3, color, color, 0)


def valve_mark(x, y, vertical=False):
    return (f'<g transform="translate({x} {y}) rotate({90 if vertical else 0})">'
            + path("M-8 -5.5 L0 0 L-8 5.5 Z M8 -5.5 L0 0 L8 5.5 Z", INK, 1.7, WHITE) + "</g>")


def discharge(x, y):
    return (arrow(x, y-5, "down", GREY)
            + path(f"M{x-7} {y+2} h14 m-11 3 h8", GREY, 1.3))


CATALOG = {
    "Ч": ("Чиллер", "шт."), "ГР": ("Открытая вентиляторная градирня", "шт."),
    "ДК": ("Драйкулер", "шт."), "Н": ("Циркуляционный насос", "шт."),
    "ТО": ("Пластинчатый теплообменник", "шт."), "П": ("Потребитель холода", "шт."),
    "ЕО": ("Открытая ёмкость", "шт."), "ЕЗ": ("Закрытая буферная ёмкость", "шт."),
    "ЗА": ("Запорный кран или дисковый затвор", "шт."),
    "БК": ("Ручной балансировочный клапан с функцией отсечения и фиксацией настройки", "шт."),
    "Ф": ("Сетчатый фильтр", "шт."), "КО": ("Обратный клапан", "шт."),
    "РБ": ("Мембранный расширительный бак", "шт."),
    "КС": ("Сервисный клапан расширительного бака со сливом и фиксацией открытого положения", "компл."),
    "ВО": ("Автоматический воздухоотводчик", "шт."),
    "ПК": ("Пружинный предохранительный клапан", "шт."),
    "УП": ("Узел заполнения и подпитки закрытого контура", "компл."),
    "КУ": ("Поплавковый клапан подпитки", "шт."), "ПЛ": ("Переливной патрубок с отводом", "компл."),
    "КД": ("Дренажный кран с отводом", "компл."), "КПР": ("Кран продувки оборотной воды", "шт."),
    "ШП": ("Сервисный штуцер с краном и заглушкой", "компл."),
    "TI": ("Местный термометр", "шт."), "PI": ("Манометр с приборным краном", "компл."),
    "FS": ("Реле протока", "шт."),
}


@dataclass(frozen=True)
class Part:
    mark: str
    zone: str
    role: str
    place: str


class Sheet:
    def __init__(self, slug, title, alt):
        self.slug, self.title, self.alt = slug, title, alt
        self.pipes, self.art, self.parts = [], [], []
        self.count = defaultdict(int)
        self.zone = "Источник"
        self.height = 0

    def part(self, kind, role, place, draw):
        self.count[kind] += 1
        mark = f"{kind}-{self.count[kind]}"
        self.parts.append(Part(mark, self.zone, role or CATALOG[kind][0], place))
        self.art.append(f'<g data-pos="{mark}" data-type="{kind}"><title>{escape(mark+" · "+(role or CATALOG[kind][0])+" · "+place)}</title>{draw(mark)}</g>')
        return mark

    def pipe(self, d, color=BLUE, width=3, dash=None):
        self.pipes.append(path(d, color, width, extra=f'stroke-dasharray="{dash}"' if dash else ""))

    def stop(self, x, y, place, vertical=False, position=None, kind="ЗА"):
        tx, ty, anchor = position or ((x+18, y+5, "start") if vertical else (x, y+23, "middle"))
        def draw(mark):
            shape = valve_mark(x, y, vertical)
            if kind == "БК":
                shape += path(f"M{x} {y} l5 -10 h8", INK, 1.6)
            return shape + tag(tx, ty, mark, anchor)
        return self.part(kind, "", place, draw)

    def vent(self, x, y, place, side=1):
        self.pipe(f"M{x} {y} v-21", GREY, 1.8)
        self.art.append(joint(x, y, GREY))
        def draw(mark):
            return (rect(x-6, y-36, 12, 15, rx=3, width=1.6)
                    + path(f"M{x-3} {y-36} v-5 h7", GREY, 1.5)
                    + tag(x+side*12, y-25, mark, "start" if side==1 else "end"))
        self.part("ВО", "", place, draw)

    def relief(self, x, y, place):
        self.pipe(f"M{x} {y} v-37", GREY, 1.8)
        self.art.append(joint(x, y, GREY))
        def draw(mark):
            return (path(f"M{x-6} {y-18} l6 -9 6 9 Z", INK, 1.6, WHITE)
                    + path(f"M{x-6} {y-29} h12 m-6 0 v-3 l-5 -2 10 -3 -10 -3 10 -3", INK, 1.4)
                    + path(f"M{x+5} {y-24} h17 v12", GREY, 1.6)
                    + arrow(x+22, y-10, "down", GREY)
                    + tag(x+12, y-33, mark))
        self.part("ПК", "", place, draw)

    def drain(self, x, y, place, name="", length=53):
        self.pipe(f"M{x} {y} v{length-5}", GREY, 1.8)
        def draw(mark):
            return (valve_mark(x, y+21, True) + discharge(x, y+length)
                    + tag(x+14, y+25, mark) + (label(x+14, y+43, name, 13, GREY) if name else ""))
        self.part("КД", "", place, draw)

    def thermometer(self, x, y, place, degrees=None, above=True, side="left"):
        sign = -1 if above else 1
        cy = y + sign*24
        self.pipe(f"M{x} {y} V{cy}", GREY, 1.6)
        def draw(mark):
            tx = x-13 if side == "left" else x+13
            result = (circle(x, cy, 8.5) + label(x, cy+3.7, "T", 10, INK, "middle", 650)
                      + tag(tx, cy+4, mark, "end" if side == "left" else "start"))
            if degrees:
                result += label(x, cy+(-17 if above else 25), degrees, 19,
                                BLUE if "подач" in place.lower() else RED, "middle", 700)
            return result
        self.part("TI", "", place, draw)

    def pressure(self, y, place):
        x = 48
        self.pipe(f"M{L} {y} H{x+9}", GREY, 1.6)
        self.art.append(joint(L,y,BLUE))
        def draw(mark):
            return (circle(x, y, 10) + path(f"M{x-3} {y+4} l6 -8", INK, 1.3)
                    + valve_mark(77, y) + tag(x, y-15, mark, "middle"))
        self.part("PI", "", place, draw)

    def save(self):
        folder = ROOT / "assets" / "schemes"
        folder.mkdir(parents=True, exist_ok=True)
        content = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {self.height}" role="img" aria-labelledby="t d">\n'
                   f'<title id="t">{escape(self.title)}</title><desc id="d">{escape(self.alt)}</desc>\n'
                   + rect(0, 0, W, self.height, WHITE, "none", 0, 0)
                   + '\n<g font-family="Inter, Arial, sans-serif" fill="#172533">\n'
                   + "\n".join(self.pipes + self.art) + "\n</g></svg>\n")
        (folder / (self.slug+".svg")).write_text(content, encoding="utf-8", newline="\n")


def process_source(s, kind, closed):
    y, x1, x2 = 90, 262, 488
    name = {"Ч": "Чиллер", "ДК": "Драйкулер"}[kind]
    def draw(mark):
        return (rect(x1, y-25, x2-x1, 50) + tag(281, y-2, mark)
                + label(375, y+11, name, 21, INK, "middle", 650))
    s.part(kind, "", "Источник охлаждения", draw)
    s.pipe(f"M{x1} {y} H{L}", BLUE)
    s.pipe(f"M{x2} {y} H{R}", RED)
    s.stop(225, y, "Холодный патрубок источника")
    s.stop(531, y, "Тёплый патрубок источника")
    cold, warm = ("+7 °C", "+12 °C") if kind == "Ч" else ("+35 °C", "+45 °C")
    s.thermometer(167, y, "Подача от источника", cold)
    s.thermometer(592, y, "Возврат к источнику", warm, side="right")
    s.art += [arrow(193, y, "left", BLUE), arrow(560, y, "left", RED)]
    if closed:
        s.vent(R, y, "Верхняя точка обратной линии у источника")
    return y, y, 146


def basin_fittings(s, x1, x2, top, bottom, level_y, place):
    # The float actuates the valve. The make-up outlet ends above the water level.
    fy = top+9
    s.pipe(f"M{x1-119} {fy} H{x1+39} V{level_y-12}", TEAL, 2)
    s.art += [label(x1-121, fy-12, "Подпитка", 14, TEAL), arrow(x1-106, fy, "right", TEAL)]
    s.stop(x1-72, fy, "Ввод подпитки · "+place, position=(x1-73,fy+21,"middle"))
    def float_draw(mark):
        return (valve_mark(x1+18, fy)
                + path(f"M{x1+18} {fy-4} L{x1+68} {level_y-4}", GREY, 1.5, extra='stroke-dasharray="3 2"')
                + circle(x1+73, level_y-3, 5.3, WHITE, GREY)
                + arrow(x1+39, level_y-12, "down", TEAL)
                + tag(x1+3, fy+25, mark))
    s.part("КУ", "", "Подпитка по уровню · "+place, float_draw)
    oy = level_y-9
    s.pipe(f"M{x2} {oy} H{x2+72} v10", GREY, 1.9)
    s.part("ПЛ", "", "Свободный перелив выше рабочего уровня · "+place,
           lambda mark: discharge(x2+72, oy+12)+tag(x2+13, oy-7, mark)+label(x2+85, oy+5, "Перелив", 13, GREY))
    s.drain(x2-38, bottom, "Нижний патрубок · "+place, "Дренаж")
    # Draw the two make-up pipe segments above the vessel/background as well.
    s.art += [path(f"M{x1-1} {fy} H{x1+7} M{x1+27} {fy} H{x1+39} V{level_y-14}", TEAL, 2)]


def open_tank(s, top, bottom, level_y, purpose, external=False):
    x1,x2=264,487
    shape=(path(f"M{x1} {top} V{bottom} H{x2} V{top}", INK, 2.2)
           + rect(x1+1.5, level_y, x2-x1-3, bottom-level_y-1, PALE, "none", 0, 0)
           + path(f"M{x1+3} {level_y} H{x2-3}", BLUE, 1.3, extra='stroke-dasharray="7 3"'))
    def draw(mark):
        return shape+tag(x1+10,bottom-12,mark)+label((x1+x2)/2+18, bottom-12, purpose, 16, INK, "middle", 600)
    if external:
        s.part("ЕО", "Выносной открытый бак" if purpose=="Выносной бак" else "Открытая буферная ёмкость", "Сбор и раздача воды", draw)
    else:
        s.art.append(shape+label(375,bottom-10,"Сборный поддон",15,INK,"middle",550))
    basin_fittings(s,x1,x2,top,bottom,level_y,purpose)


def tower(s, remote):
    x1,x2=264,487
    def tower_symbol(mark):
        return (path("M280 86 L294 31 H457 L471 86 Z",INK,2,WHITE)
                + path("M300 24 H450 M323 17 Q342 11 371 20 Q390 10 423 17",GREY,1.6)
                + tag(302,53,mark)+label(376,77,"Градирня",20,INK,"middle",650))
    s.part("ГР", "", "Испарительное охлаждение оборотной воды", tower_symbol)
    wy=68
    s.pipe(f"M467 {wy} H{R}",RED)
    s.stop(531,wy,"Вход нагретой воды на орошение")
    s.thermometer(591,wy,"Возврат на градирню","+35 °C",side="right")
    s.art.append(arrow(558,wy,"left",RED))
    if remote:
        s.art += [path("M275 90 V113 L314 129 H432 L476 113 V90",INK,2.1)]
        s.pipe("M346 129 V200",BLUE)
        s.art += [arrow(346,169,"down",BLUE),label(361,164,"Самотёк",15,BLUE)]
        open_tank(s,188,274,232,"Выносной бак",True)
        s.art += [path("M346 187 V218",BLUE,2.5),arrow(346,214,"down",BLUE)]
        cy = 256
        ptop = 333
    else:
        open_tank(s,97,176,144,"Поддон градирни")
        cy = 159
        ptop = 235
    s.pipe(f"M264 {cy} H{L}",BLUE)
    s.stop(222,cy,"Выход холодной воды из бака" if remote else "Выход холодной воды из поддона")
    s.thermometer(166,cy,"Подача оборотной воды","+25 °C",above=False)
    s.art.append(arrow(192,cy,"left",BLUE))
    return cy,wy,ptop

def pressurisation(s, y, circuit):
    """An unrestricted header feeds the relief and make-up connections upstream of the vessel service valve."""
    s.pipe(f"M{L} {y} H398 V{y+84} H457 V{y+70}", BLUE, 2.1)
    for x in (L, 203, 261):
        s.art.append(joint(x,y,BLUE))
    s.relief(203,y,"Закрытый контур · "+circuit+"; отбор с коллектора перед сервисной отсечкой")
    sx=333
    def service(mark):
        return (valve_mark(sx,y)+path(f"M{sx} {y} v-9 h10",INK,1.4)
                +rect(sx+7,y-13,6,6,rx=1,width=1.3)+tag(sx,y-19,mark,"middle")
                +path(f"M398 {y+84} v25",GREY,1.5)+valve_mark(398,y+96,True)
                +path(f"M392 {y+110} h12",GREY,1.4)+label(410,y+105,"Слив "+mark,12,GREY))
    s.part("КС","","Обслуживание РБ · "+circuit,service)
    def vessel(mark):
        return (rect(436,y+14,42,56,rx=19,width=2)
                +path(f"M437 {y+43} q20 -13 39 0",INK,1.6)
                +tag(490,y+42,mark)+label(490,y+60,"Расширительный",13,GREY)+label(490,y+75,"бак",13,GREY))
    s.part("РБ","","Присоединение к всасывающей линии · "+circuit,vessel)
    my=y+104
    s.pipe(f"M350 {my} H261 V{y}",TEAL,1.9)
    def fill(mark):
        return (rect(278,my-12,55,24,rx=2,width=1.6)
                +tag(305.5,my+4.5,mark,"middle")+arrow(343,my,"left",TEAL)
                +label(294,my+31,"Подпитка",13,TEAL,"middle"))
    s.part("УП","","Подача подготовленного теплоносителя по давлению · "+circuit,fill)


def pump_train(s, top, circuit, closed=False, blowdown=False, flow_switch=False):
    y=top
    if closed:
        pressurisation(s,y+41,circuit)
    s.stop(L,y+54,"Всасывание насоса · "+circuit,True,(L+17,y+58,"start"))
    def strainer(mark):
        fy=y+78
        return (path(f"M{L-6} {fy-8} L{L+5} {fy-8} L{L+5} {fy+2} "
                     f"L{L+15} {fy+12} l-6 6 -12 -13 h-3 Z",INK,1.6,WHITE)
                +path(f"M{L+4} {fy+1} l7 9 m-9 -5 5 -4",GREY,1.1)+tag(L+23,fy+5,mark))
    s.part("Ф","","На всасывании · "+circuit,strainer)
    py=y+120
    def pump(mark):
        return (circle(L,py,16,WHITE,BLUE,2.2)
                +path(f"M{L-9} {py-6} h18 l-9 17 Z",BLUE,1.4,BLUE)
                +tag(L+24,py+5,mark)+label(L+69,py+5,"Насос",15))
    s.part("Н","",circuit,pump)
    for yy, place in [(y+99, "Всасывание"),(y+144,"Нагнетание")]:
        s.pressure(yy,place+" насоса · "+circuit)
    chk=y+163
    def check(mark):
        return (rect(L-8,chk-8,16,16,width=1.5)
                +path(f"M{L-7} {chk-5} l13 9 m-14 -10 h14",INK,1.6)
                +arrow(L+17,chk,"down",BLUE)+tag(L+29,chk+5,mark))
    s.part("КО","","Нагнетание насоса · "+circuit,check)
    s.stop(L,y+194,"Нагнетание насоса · "+circuit,True,(L+17,y+199,"start"))
    if blowdown:
        yy=y+181
        s.pipe(f"M{L} {yy} H291 v19",GREY,1.8)
        s.art.append(joint(L,yy,BLUE))
        s.part("КПР","","Ответвление от напорной линии к сбросу оборотной воды",
               lambda mark: valve_mark(214,yy)+tag(214,yy-10,mark,"middle")+discharge(291,yy+23)
               +label(305,yy+10,"Продувка",14,GREY))
    s.art.append(arrow(R,y+102,"up",RED))
    if flow_switch:
        yy=y+143
        s.pipe(f"M{R} {yy} H{R+22}",GREY,1.6)
        s.part("FS","","Контроль протока через испаритель, сигнал разрешения работы чиллера",
               lambda mark: rect(R+20,yy-11,24,22,rx=2,width=1.5)
               +label(R+32,yy+4,"FS",10,INK,"middle",650,True)+tag(R+48,yy+5,mark))
    return y+194


def exchanger(s, top):
    a,b=top+53,top+121
    x1,x2=265,487
    def draw(mark):
        return (rect(x1,top+25,x2-x1,125,width=2)
                +path(f"M{x1+6} {top+89} H{x2-6}",GREY,1.1,extra='stroke-dasharray="3 3"')
                +path(f"M{x1+15} {a+10} l9 -20 m-3 20 l9 -20 m-3 20 l9 -20",GREY,1.6)
                +tag(x1+54,a+5,mark)+label(376,top+79,"Теплообменник",17,INK,"middle",600)
                +label(375,top+114,"Сторона потребителя",13,GREY,"middle")
                +arrow(391,a,"right",RED)+arrow(376,b+11,"left",BLUE))
    s.part("ТО","","Первичная и вторичная среды разделены пластинами",draw)
    for port,(px,yy,side,cold,high) in enumerate([
            (x1,a,"Вход холодной воды первичного контура",True,True),
            (x2,a,"Выход нагретой воды первичного контура",False,True),
            (x1,b,"Выход охлаждённой воды вторичного контура",True,False),
            (x2,b,"Вход нагретой воды вторичного контура",False,False)],1):
        left = px==x1
        xstop, xs, thermo_x = (200,239,154) if left else (552,514,602)
        rail, tone=(L,BLUE) if left else (R,RED)
        s.pipe(f"M{rail} {yy} H{px}",tone)
        s.stop(xstop,yy,f"ТО-1 · патрубок {port}. {side}",position=(xstop,yy+(22 if high else -13),"middle"))
        s.thermometer(thermo_x,yy,"ТО-1 · "+side,above=high,side="right" if left else "left")
        sign=-1 if high else 1
        s.pipe(f"M{xs} {yy} v{sign*28}",GREY,1.5)
        s.art.append(joint(xs,yy,tone))
        s.part("ШП","","ТО-1 · патрубок "+str(port)+", со стороны аппарата до отсечки",
               lambda mark, x=xs, y=yy, di=sign: valve_mark(x,y+di*14,True)
               +path(f"M{x-6} {y+di*28} h12",GREY,1.4)
               +tag(x, y+di*(34 if di<0 else 43),mark,"middle"))
        s.art.append(arrow((221 if left else 535),yy,("right" if high else "left"),tone))
    # The upper end of the secondary return is a separate high point.
    s.vent(R,b,"Верхняя точка возврата вторичного контура")
    return a,a,b,b,top+181


def buffer(s, top, opened):
    x1,x2=263,488
    a_l,a_r,b_l,b_r=top+103,top+76,top+143,top+115
    bottom=top+162
    if opened:
        # All four process ports are submerged. Overflow remains above operating level.
        open_tank(s,top+14,bottom,top+59,"Буферная ёмкость",True)
    else:
        def draw(mark):
            return (rect(x1,top+31,x2-x1,bottom-(top+31),rx=16,width=2)
                    +tag(x1+13,top+86,mark)+label(377,top+108,"Буферная ёмкость",18,INK,"middle",600)
                    +label(377,top+129,"Закрытая",14,GREY,"middle"))
        s.part("ЕЗ","","Четыре патрубка, общий объём воды",draw)
        s.vent(319,top+31,"Верхний патрубок закрытой буферной ёмкости")
        s.relief(409,top+31,"Прямое присоединение к закрытой ёмкости до её отсечной арматуры")
        s.drain(x2-38,bottom,"Нижний патрубок закрытой буферной ёмкости","Дренаж")
    for x, yy, rail, col, desc, direction in [
            (x1,a_l,L,BLUE,"Вход от чиллера","right"),(x2,a_r,R,RED,"Выход к чиллеру","right"),
            (x1,b_l,L,BLUE,"Выход к потребителям","left"),(x2,b_r,R,RED,"Возврат от потребителей","left")]:
        s.pipe(f"M{rail} {yy} H{x}",col)
        vx=220 if x==x1 else 538
        s.stop(vx,yy,"Буферная ёмкость · "+desc,position=(vx,yy+21,"middle"))
        s.art.append(arrow(180 if x==x1 else 584,yy,direction,col))
    return a_l,a_r,b_l,b_r,top+225


def loads(s, ys, closed):
    several=len(ys)>1
    for index,yy in enumerate(ys,1):
        s.pipe(f"M{L} {yy} H269",BLUE)
        s.pipe(f"M485 {yy} H{R}",RED)
        if index<len(ys):
            s.art.extend([joint(L,yy,BLUE),joint(R,yy,RED)])
        name="Потребитель"+(f" {index}" if several else "")
        s.part("П","",name,lambda mark, y=yy, name=name:
               rect(269,y-17,216,34)+tag(280,y+5,mark)+label(393,y+5,name,16,INK,"middle",600))
        s.stop(223,yy,"Подача · "+name)
        s.stop(539,yy,"Возврат · "+name,kind="БК" if several else "ЗА")
        s.art+= [arrow(180,yy,"right",BLUE),arrow(566,yy,"right",RED)]
    if closed:
        s.art.append(joint(592,ys[-1],RED))
        s.drain(592,ys[-1],"Нижняя точка распределительного контура","Слив контура")
    s.height=ys[-1]+(73 if closed else 43)
