"""Generate the drawings and the matching, accessible parts lists in tipovye-skhemy.html."""
from collections import defaultdict
from dataclasses import dataclass
from html import escape
import re

from cooling_diagrams import (ROOT, BLUE, RED, TEAL, GREY, INK, L, R, W, REV, CATALOG,
    Sheet, tower, process_source, pump_train, exchanger, buffer, loads, path, arrow, valve_mark)


@dataclass(frozen=True)
class Variant:
    slug: str
    heading: str
    source: str
    mode: str
    customers: int
    caption: str
    alt: str


VARIANTS = [
    Variant("chiller-direct", "Один потребитель", "Ч", "direct", 1,
            "Насос подаёт от чиллера воду при +7 °C. После потребителя вода возвращается в испаритель при +12 °C. Реле протока контролирует циркуляцию.",
            "Один закрытый контур. Чиллер, насос, потребитель, мембранный бак и узел подпитки по давлению."),
    Variant("chiller-three-loads", "Три одинаковых потребителя", "Ч", "direct", 3,
            "Три одинаковые ветви подключены параллельно. На подаче каждой ветви стоит запорный кран, на возврате — балансировочный клапан с функцией отсечения.",
            "Чиллер +7/+12 °C и один насос питают три параллельные ветви. Каждую ветвь можно настроить и отключить."),
    Variant("chiller-buffer-two-loads", "Буферная ёмкость и два потребителя", "Ч", "open-buffer", 2,
            "Первый насос подаёт воду от чиллера в открытую ёмкость. Второй обслуживает две параллельные ветви. Подпитка срабатывает по уровню. При минимальном уровне воды проверяют подпор у обоих насосов с учётом потерь на всасывании.",
            "Чиллер +7/+12 °C, два насоса и две ветви. У открытой ёмкости есть поплавковая подпитка, свободный перелив и нижний дренаж."),
    Variant("chiller-buffer-two-loads-closed", "Буферная ёмкость и два потребителя", "Ч", "closed-buffer", 2,
            "Закрытая четырёхпатрубковая ёмкость связывает насосные контуры общим объёмом воды. Вверху показаны воздухоотводчик и предохранительный клапан, внизу — дренаж. Подпитка работает по давлению.",
            "Чиллер +7/+12 °C, закрытая буферная ёмкость, два насоса и две ветви. Расширительный бак подключён к общей системе."),
    Variant("chiller-heat-exchanger", "Теплообменник и один потребитель", "Ч", "hx", 1,
            "На стороне чиллера график +7/+12 °C. У потребителя температуры определяют подбором теплообменника. У каждого контура свой насос, расширительный бак и узел подпитки.",
            "Два закрытых контура. На всех четырёх патрубках теплообменника видны отдельная отсечная арматура и сервисные штуцеры."),
    Variant("tower-direct", "Прямое подключение потребителя", "ГР", "direct", 1,
            "Вода возвращается в градирню при +35 °C. Из поддона насос подаёт её потребителю при +25 °C. Поплавковый клапан поддерживает уровень воды.",
            "Открытая градирня, встроенный поддон и один насос. Показаны подпитка, перелив, дренаж и отдельная продувка."),
    Variant("tower-remote-sump", "Выносной бак перед насосом", "ГР", "remote", 1,
            "Охлаждённая вода стекает из градирни самотёком в выносной бак. Насос забирает из него воду при +25 °C. Нагретая до +35 °C вода поступает на орошение.",
            "У выносного бака отдельные линии подпитки, перелива и дренажа. Вода из поддона свободно стекает в бак."),
    Variant("tower-heat-exchanger", "Теплообменник и один потребитель", "ГР", "hx", 1,
            "Градирня охлаждает воду с +35 до +25 °C. Насос второго, закрытого контура подаёт воду потребителю. Теплообменник можно отсечь и промыть с обеих сторон.",
            "Открытый контур градирни и закрытый контур потребителя. Четыре отсечных крана теплообменника, два насоса и один мембранный бак."),
    Variant("drycooler-heat-exchanger", "Драйкулер с теплообменником", "ДК", "hx", 1,
            "В драйкулер поступает теплоноситель при +45 °C, на выходе — +35 °C. Теплообменник разделяет наружный и внутренний контуры. Состав теплоносителя и температуры у потребителя определяют для объекта.",
            "Драйкулер +45/+35 °C, два закрытых контура с отдельными насосами и мембранными баками. На четырёх патрубках теплообменника показаны отсечные краны.")
]

SOURCES={"Ч":"Чиллер","ГР":"Градирня","ДК":"Драйкулер"}


def render_scheme(v):
    is_buffer = v.mode.endswith("buffer")
    opened = v.mode=="open-buffer"
    divided = is_buffer or v.mode=="hx"
    closed = v.source!="ГР" and not opened
    title = v.heading if v.source=="ДК" else SOURCES[v.source]+" — "+v.heading.lower()
    if is_buffer:
        title += " · "+("открытая ёмкость" if opened else "закрытая ёмкость")
    s=Sheet(v.slug,title,v.alt)
    cold,warm,top = tower(s,v.mode=="remote") if v.source=="ГР" else process_source(s,v.source,closed)
    s.zone="Насосный узел Н-1"
    pump_train(s,top,"Контур источника" if divided else "Контур потребителя",
               closed=closed and not is_buffer,blowdown=v.source=="ГР",flow_switch=v.source=="Ч")
    if divided:
        s.zone="Буферная ёмкость" if is_buffer else "Пластинчатый теплообменник ТО-1"
        base=top+233
        p_c,p_w,s_c,s_w,next_top=buffer(s,base,opened) if is_buffer else exchanger(s,base)
        s.pipe(f"M{L} {cold} V{p_c}",BLUE)
        s.pipe(f"M{R} {warm} V{p_w}",RED)
        s.zone="Насосный узел Н-2"
        pump_train(s,next_top,"Контур потребителей",closed=not opened)
        cold,warm,top=s_c,s_w,next_top
    s.zone="Потребители и трубопроводы"
    ys=[top+241+i*63 for i in range(v.customers)]
    s.pipe(f"M{L} {cold} V{ys[-1]}",BLUE)
    s.pipe(f"M{R} {warm} V{ys[-1]}",RED)
    loads(s,ys,True)
    s.save()
    return s


def parts_list(s):
    groups=defaultdict(lambda: defaultdict(list))
    for p in s.parts:
        groups[p.zone][(p.mark.rsplit("-",1)[0],p.role)].append(p)
    sections=[]
    for zone,by_type in groups.items():
        rows=[f'<tr class="spec-zone"><th colspan="3" scope="rowgroup">{escape(zone)}</th></tr>']
        for (kind,name),parts in by_type.items():
            marks=[p.mark for p in parts]
            positions=", ".join(f'<span>{escape(mark)}</span>' for mark in marks)
            if len(parts)>1 and zone.startswith("Пластинчатый") and kind in ("ЗА","ШП","TI"):
                where={"ЗА":"Отдельная отсечка на каждом из четырёх патрубков",
                       "ШП":"У четырёх патрубков между аппаратом и его отсечной арматурой",
                       "TI":"Температура на входе и выходе каждой среды"}[kind]
            else:
                where=" / ".join(dict.fromkeys(p.place for p in parts))
            rows.append(f'<tr data-positions="{escape(" ".join(marks))}"><td class="spec-positions">{positions}</td>'
                        f'<td><strong>{escape(name)}</strong><small>{escape(where)}</small></td>'
                        f'<td class="spec-qty">{len(parts)}&nbsp;{CATALOG[kind][1]}</td></tr>')
        sections.append("<tbody>"+"\n".join(rows)+"</tbody>")
    notes=[]
    if s.count["РБ"]:
        notes.extend(["Расширительный бак подключён отдельной ветвью на всасывании. Его сервисный клапан в работе зафиксирован открытым. Воздухоотводчики подключены к верхним точкам. Сброс предохранительного клапана выводят в безопасное место.",
                      "На водяном контуре узел подпитки предусматривает регулирование давления и защиту источника воды от обратного потока. Для гликоля используют подпитку готовой смесью."])
    if s.count["ПЛ"]:
        notes.append("Перелив отводит воду самотёком через свободный выпуск. Дренаж открывают для опорожнения.")
    if s.slug=="chiller-buffer-two-loads":
        notes.append("Подпор на всасывании обоих насосов проверяют при минимальном рабочем уровне в ёмкости. Для Н-1 в расчёт включают потери в испарителе и в трубопроводе от ёмкости.")
    if s.slug=="chiller-three-loads":
        notes.append("При отключении отдельных ветвей проверяют минимальный расход через испаритель по паспорту чиллера. При необходимости предусматривают регулируемый перепуск.")
    notes.append("Ду, расходы, напоры насосов, объёмы баков и уставки подбирают для объекта. Число воздухоотводчиков и дренажей уточняют по отметкам трубопроводов.")
    return ('<div class="spec-body"><table class="spec-table"><caption class="sr-only">Состав схемы — '+escape(s.title)
            +'</caption><thead><tr><th scope="col">Позиции</th><th scope="col">Наименование и место установки</th>'
            +'<th scope="col">Кол-во</th></tr></thead>'+"\n".join(sections)
            +'</table><div class="spec-notes">'+"".join('<p>'+escape(n)+'</p>' for n in notes)+'</div></div>')


def plate(v,s):
    uri=f"/assets/schemes/{s.slug}.svg?v={REV}"
    zoom='<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="5.6"/><path d="M12 12l5 5M5 8h6M8 5v6"/></svg>'
    return (f'<a class="scheme-plate" href="{uri}" aria-label="Увеличить чертёж. {escape(s.title)}">'
            f'<span class="plate-view">{zoom} Увеличить</span><img src="{uri}" width="{W}" height="{s.height}" alt="{escape(v.alt)}"></a>')


def spec_details(v,s,context,level):
    return (f'<details class="scheme-spec" data-context="{escape(context)}"><summary><h{level}>{escape(v.heading)}</h{level}>'
            '<span class="spec-action">Спецификация <span aria-hidden="true">▤</span></span></summary>'+parts_list(s)+'</details>')


def card(v,s,alternate=None,single=False):
    if not alternate:
        return ('<article class="scheme-card">'+spec_details(v,s,SOURCES[v.source],2 if single else 3)
                +f'<figure>{plate(v,s)}<figcaption>{escape(v.caption)}</figcaption></figure></article>')
    av,other=alternate
    return ('<article class="scheme-card scheme-buffer" data-buffer-card><fieldset class="buffer-choice" hidden><legend>Исполнение ёмкости</legend>'
            '<label><input type="radio" name="buffer-type" value="open" checked>Открытая</label>'
            '<label><input type="radio" name="buffer-type" value="closed">Закрытая</label></fieldset>'
            +''.join(f'<div class="buffer-pane" data-variant="{key}">'+spec_details(ver,sh,"Чиллер · "+variant,3)
                     +f'<p class="buffer-fallback">{variant}</p><figure>{plate(ver,sh)}<figcaption>{escape(ver.caption)}</figcaption></figure></div>'
                     for key,variant,ver,sh in [("open","Открытая ёмкость",v,s),("closed","Закрытая ёмкость",av,other)])
            +'</article>')


def key_item(icon,name):
    return '<li><svg width="34" height="20" aria-hidden="true" viewBox="0 0 34 20">'+icon+'</svg>'+name+'</li>'


def main_content():
    items={v.slug:(v,render_scheme(v)) for v in VARIANTS}
    groups=[]
    for anchor,heading,code in (("chillery","Схемы с чиллером","Ч"),("gradirni","Схемы с градирней","ГР")):
        cards=[]
        for v,s in items.values():
            if v.source!=code or v.mode=="closed-buffer":
                continue
            alternate=items["chiller-buffer-two-loads-closed"] if v.mode=="open-buffer" else None
            cards.append(card(v,s,alternate))
        groups.append(f'<section class="scheme-family" id="{anchor}" aria-labelledby="{anchor}-title">'
                      f'<h2 id="{anchor}-title">{heading}</h2><div class="scheme-gallery">'+"\n".join(cards)+'</div></section>')
    keys=[key_item(path("M1 10 H32",color,weight)+arrow(at,10,direction,color),name)
          for name,color,direction,at,weight in [("Подача",BLUE,"right",25,3),("Возврат",RED,"left",9,3),
                ("Подпитка",TEAL,"right",25,2),("Отвод и дренаж",GREY,"right",25,1.7)]]
    keys.append(key_item(path("M1 10 H32",INK,1.5)+valve_mark(17,10),"Запорная арматура"))
    key='<aside class="scheme-key" aria-label="Условные обозначения"><ul>'+''.join(keys)+'</ul><p>Буквы и номера связывают элементы чертежа со строками спецификации. Температуры подписаны на стороне источника охлаждения.</p></aside>'
    v,s=items["drycooler-heat-exchanger"]
    groups.append('<section class="scheme-family scheme-extra" id="drycooler" aria-label="Драйкулер">'+card(v,s,single=True)+'</section>')
    dialog=('<dialog class="scheme-dialog" aria-labelledby="scheme-dialog-heading" aria-describedby="scheme-dialog-context"><div class="dialog-head"><div>'
            '<p class="dialog-context" id="scheme-dialog-context"></p><h2 id="scheme-dialog-heading">Спецификация</h2></div>'
            '<button type="button" class="dialog-close" autofocus aria-label="Закрыть спецификацию">Закрыть</button></div>'
            '<div class="dialog-content"></div></dialog>')
    return '<div class="eng-content"><div class="wrap">\n'+key+"\n"+"\n".join(groups)+"\n"+dialog+'\n</div></div>'


def update_page():
    file=ROOT/"tipovye-skhemy.html"
    page=file.read_text(encoding="utf-8")
    description='Схемы обвязки чиллеров, градирен и драйкулеров с позициями оборудования, арматуры и КИП. Для каждой схемы доступна спецификация.'
    page=re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*(">)',lambda m:m[1]+description+m[2],page)
    lead='Схемы обвязки насосов, ёмкостей и теплообменников. Нажмите на название схемы, чтобы открыть спецификацию оборудования, арматуры и приборов.'
    page=re.sub(r'(<p class="lead">).*?(</p>)',lambda m:m[1]+lead+m[2],page,count=1)
    css=f'<link rel="stylesheet" href="/assets/css/typical-schemes.css?v={REV}">'
    js=f'<script defer src="/assets/js/typical-schemes.js?v={REV}"></script>'
    page=re.sub(r'<link rel="stylesheet" href="/assets/css/typical-schemes\.css[^"]*">',css,page,count=1)
    page=re.sub(r'\n<script defer src="/assets/js/typical-schemes\.js[^"]*"></script>',"",page)
    page=page.replace(css,css+'\n'+js,1)
    start=page.index('<div class="eng-content">',page.index('<main'))
    end=page.index('</main>',start)
    file.write_text(page[:start]+main_content()+page[end:],encoding="utf-8",newline="\n")


if __name__=="__main__":
    update_page()
