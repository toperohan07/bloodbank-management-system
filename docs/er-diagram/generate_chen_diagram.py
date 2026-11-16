"""Generates the Chen-notation ER diagram of bloodbankdb as
   chen_er_diagram.drawio (open in draw.io) and chen_er_diagram.svg.
   Run:  python3 generate_chen_diagram.py
Foreign-key columns are NOT drawn as attributes: in Chen notation they are
represented by the relationship diamonds. Underlined = primary key."""
import math
from xml.sax.saxutils import escape

W, H = 1050, 800   # grid cell size
ENT_W, ENT_H, ATT_W, ATT_H, REL_W, REL_H = 150, 60, 150, 40, 130, 76

# name: (grid col, grid row, [attributes]); first attribute is the primary key
ENTITIES = {
    "Patient":        (0, 0,   ["patient_id", "patient_name", "age", "gender", "blood_group", "contact_number", "city"]),
    "BloodRequest":   (1, 0,   ["request_id", "blood_group", "units_required", "request_date", "urgency", "request_status"]),
    "Hospital":       (2, 0,   ["hospital_id", "hospital_name", "address", "city", "contact_number", "email"]),
    "Staff":          (0, 1,   ["staff_id", "staff_name", "designation", "phone", "email"]),
    "BloodIssue":     (1, 1,   ["issue_id", "issue_date", "units_issued"]),
    "BloodInventory": (2, 1,   ["inventory_id", "blood_group", "component_type", "units_available", "collection_date", "expiry_date"]),
    "Donation":       (1, 2,   ["donation_id", "donation_date", "quantity_ml", "donation_status"]),
    "BloodBank":      (2, 2,   ["bank_id", "bank_name", "address", "city", "contact_number", "email"]),
    "Donor":          (-0.75, 2.5, ["donor_id", "donor_name", "age", "gender", "blood_group", "phone", "email", "city", "last_donation_date"]),
    "BloodTest":      (1, 3.1, ["test_id", "test_date", "hiv_result", "hepatitis_result", "malaria_result", "overall_status"]),
}

# (entity A, card A, relationship, entity B, card B, total-participation entities, optional via-points)
Y_EMP = 3.1 * H + 450 + 480
RELS = [
    ("Donor", "1", "makes", "Donation", "N", {"Donation"}, None),
    ("BloodBank", "1", "receives", "Donation", "N", {"Donation"}, None),
    ("Staff", "1", "handles", "Donation", "N", {"Donation"}, None),
    ("Donation", "1", "tested by", "BloodTest", "1", {"BloodTest"}, None),
    ("Donation", "1", "stored as", "BloodInventory", "1", {"BloodInventory"}, None),
    ("BloodBank", "1", "stores", "BloodInventory", "N", {"BloodInventory"}, None),
    ("BloodBank", "1", "employs", "Staff", "N", set(), "bottom"),
    ("Patient", "1", "raises", "BloodRequest", "N", {"BloodRequest"}, None),
    ("Hospital", "1", "places", "BloodRequest", "N", {"BloodRequest"}, None),
    ("BloodRequest", "1", "fulfilled by", "BloodIssue", "N", {"BloodIssue"}, None),
    ("BloodInventory", "1", "supplies", "BloodIssue", "N", {"BloodIssue"}, None),
    ("Staff", "1", "authorizes", "BloodIssue", "N", {"BloodIssue"}, None),
]

def center(name):
    c, r, _ = ENTITIES[name]
    return c * W + 600, r * H + 450

# ---- relationship geometry -------------------------------------------------
rels = []   # dicts: id, label, pos, ends:[(entity, card, total, waypoint-or-None)]
for i, (a, ca, label, b, cb, total, via) in enumerate(RELS):
    (ax, ay), (bx, by) = center(a), center(b)
    if via == "bottom":
        pos = ((ax + bx) / 2, Y_EMP)
        ends = [(a, ca, a in total, (ax, Y_EMP)), (b, cb, b in total, (bx, Y_EMP))]
    else:
        pos = ((ax + bx) / 2, (ay + by) / 2)
        ends = [(a, ca, a in total, None), (b, cb, b in total, None)]
    rels.append(dict(id=f"r{i}", label=label, pos=pos, ends=ends))

# ---- attribute placement (avoid the lines leaving each entity) -------------
blocked = {n: [] for n in ENTITIES}
for r in rels:
    for ent, _, _, wp in r["ends"]:
        cx, cy = center(ent)
        tx, ty = wp if wp else r["pos"]
        blocked[ent].append(math.degrees(math.atan2(ty - cy, tx - cx)))

def angdiff(a, b):
    return abs((a - b + 180) % 360 - 180)

attrs = []  # dicts: id, owner, name, pk, x, y
for name, (_, _, names) in ENTITIES.items():
    cx, cy = center(name)
    allowed = [d for d in range(360) if all(angdiff(d, b) > 17 for b in blocked[name])]
    n = len(names)
    radius = max(250, n * 175 / (len(allowed) * math.pi / 180))
    for i, an in enumerate(names):
        d = allowed[int((i + 0.5) * len(allowed) / n)]
        attrs.append(dict(id=f"a_{name}_{i}", owner=name, name=an, pk=(i == 0),
                          x=cx + radius * math.cos(math.radians(d)), y=cy + radius * math.sin(math.radians(d))))

# ---- draw.io XML -----------------------------------------------------------
cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
def vertex(cid, value, style, x, y, w, h):
    cells.append(f'<mxCell id="{cid}" value="{escape(value)}" style="{style}" vertex="1" parent="1">'
                 f'<mxGeometry x="{x - w/2:.0f}" y="{y - h/2:.0f}" width="{w}" height="{h}" as="geometry"/></mxCell>')

def edge(cid, src, dst, total, card, points=None):
    style = "endArrow=none;html=1;strokeWidth=1.5;" + ("shape=link;width=5;" if total else "")
    pts = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}"/>' for px, py in (points or []))
    arr = f'<Array as="points">{pts}</Array>' if pts else ""
    cells.append(f'<mxCell id="{cid}" style="{style}" edge="1" parent="1" source="{src}" target="{dst}">'
                 f'<mxGeometry relative="1" as="geometry">{arr}</mxGeometry></mxCell>')
    cells.append(f'<mxCell id="{cid}_c" value="{card}" style="edgeLabel;html=1;align=center;verticalAlign=middle;'
                 f'fontStyle=1;fontSize=16;fontColor=#b85450;labelBackgroundColor=default;" vertex="1" connectable="0" parent="{cid}">'
                 f'<mxGeometry x="-0.6" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>')

for name in ENTITIES:
    x, y = center(name)
    vertex(f"e_{name}", name, "rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;", x, y, ENT_W, ENT_H)
for a in attrs:
    vertex(a["id"], a["name"], "ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#fff2cc;strokeColor=#d6b656;" + ("fontStyle=4;" if a["pk"] else ""), a["x"], a["y"], ATT_W, ATT_H)
    edge(f'ae_{a["id"]}', f'e_{a["owner"]}', a["id"], False, "")
for r in rels:
    vertex(r["id"], r["label"], "rhombus;whiteSpace=wrap;html=1;fontSize=12;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2;", *r["pos"], REL_W, REL_H)
    for k, (ent, card, total, wp) in enumerate(r["ends"]):
        edge(f'{r["id"]}_{k}', f"e_{ent}", r["id"], total, card, [wp] if wp else None)

# legend
lx, ly = -900, -150
legend = [("Entity", "rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;", 150, 50),
          ("attribute", "ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#fff2cc;strokeColor=#d6b656;", 150, 40),
          ("primary_key", "ellipse;whiteSpace=wrap;html=1;fontSize=11;fontStyle=4;fillColor=#fff2cc;strokeColor=#d6b656;", 150, 40),
          ("relationship", "rhombus;whiteSpace=wrap;html=1;fontSize=11;fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=2;", 150, 70)]
for i, (t, st, w, h) in enumerate(legend):
    vertex(f"lg{i}", t, st, lx + 100, ly + i * 100, w, h)
cells.append(f'<mxCell id="lgt" value="Single line = partial participation&lt;br&gt;Double line = total participation&lt;br&gt;1 / N = cardinality&lt;br&gt;Foreign keys are shown as relationships, not attributes" '
             f'style="text;html=1;align=left;verticalAlign=top;fontSize=12;" vertex="1" parent="1"><mxGeometry x="{lx - 20}" y="{ly + 400}" width="320" height="90" as="geometry"/></mxCell>')

xml = ('<mxfile host="app.diagrams.net"><diagram name="Chen ER - bloodbankdb"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" '
       'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root>' + "".join(cells) + '</root></mxGraphModel></diagram></mxfile>')
open("chen_er_diagram.drawio", "w").write(xml)

# ---- SVG (same layout) -----------------------------------------------------
xs = [c for c in [center(n)[0] for n in ENTITIES]] + [a["x"] for a in attrs] + [lx - 60]
ys = [center(n)[1] for n in ENTITIES] + [a["y"] for a in attrs] + [Y_EMP + 100, ly - 60]
minx, maxx, miny, maxy = min(xs) - 120, max(xs) + 120, min(ys) - 80, max(ys) + 80
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx:.0f} {miny:.0f} {maxx-minx:.0f} {maxy-miny:.0f}" width="{(maxx-minx)/2:.0f}" height="{(maxy-miny)/2:.0f}" font-family="Arial, Helvetica, sans-serif">',
       f'<rect x="{minx:.0f}" y="{miny:.0f}" width="{maxx-minx:.0f}" height="{maxy-miny:.0f}" fill="white"/>']

def clip(cx, cy, tx, ty, w, h, diamond=False):
    """Point where the line from centre (cx,cy) towards (tx,ty) leaves a rect/diamond of size w x h."""
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    if diamond:
        t = 1 / (abs(dx) / (w / 2) + abs(dy) / (h / 2))
    else:
        t = min((w / 2) / abs(dx) if dx else 1e9, (h / 2) / abs(dy) if dy else 1e9)
    return cx + dx * t, cy + dy * t

def path(pts, width):
    # one <line> per segment (renders reliably in every SVG viewer, including ImageMagick)
    return "".join(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="#333" stroke-width="{width}"/>'
                   for (x1, y1), (x2, y2) in zip(pts, pts[1:]))

def line(pts, total):
    if not total:
        out.append(path(pts, 2))
        return
    for off in (-3.5, 3.5):   # two parallel lines = total participation
        shifted = []
        for i, (x, y) in enumerate(pts):
            a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
            ln = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
            shifted.append((x - (b[1] - a[1]) / ln * off, y + (b[0] - a[0]) / ln * off))
        out.append(path(shifted, 1.6))

for a in attrs:
    ox, oy = center(a["owner"])
    p = clip(ox, oy, a["x"], a["y"], ENT_W, ENT_H); q = clip(a["x"], a["y"], ox, oy, ATT_W, ATT_H)
    out.append(f'<line x1="{p[0]:.0f}" y1="{p[1]:.0f}" x2="{q[0]:.0f}" y2="{q[1]:.0f}" stroke="#333" stroke-width="1.5"/>')
for r in rels:
    rx, ry = r["pos"]
    for ent, card, total, wp in r["ends"]:
        ex, ey = center(ent)
        first = wp if wp else (rx, ry)
        p0 = clip(ex, ey, first[0], first[1], ENT_W, ENT_H)
        pts = [p0] + ([wp] if wp else []) + [clip(rx, ry, (wp or (ex, ey))[0], (wp or (ex, ey))[1], REL_W, REL_H, True)]
        line(pts, total)
        dx, dy = first[0] - ex, first[1] - ey
        ln = math.hypot(dx, dy)
        out.append(f'<text x="{p0[0] + dx/ln*42:.0f}" y="{p0[1] + dy/ln*42 + 7:.0f}" font-size="20" font-weight="bold" fill="#b85450" text-anchor="middle">{card}</text>')
for a in attrs:
    out.append(f'<ellipse cx="{a["x"]:.0f}" cy="{a["y"]:.0f}" rx="{ATT_W/2}" ry="{ATT_H/2}" fill="#fff2cc" stroke="#d6b656" stroke-width="1.5"/>'
               f'<text x="{a["x"]:.0f}" y="{a["y"]+4:.0f}" font-size="12" text-anchor="middle"{" text-decoration=\"underline\"" if a["pk"] else ""}>{escape(a["name"])}</text>')
for name in ENTITIES:
    x, y = center(name)
    out.append(f'<rect x="{x-ENT_W/2:.0f}" y="{y-ENT_H/2:.0f}" width="{ENT_W}" height="{ENT_H}" fill="#dae8fc" stroke="#6c8ebf" stroke-width="3"/>'
               f'<text x="{x:.0f}" y="{y+5:.0f}" font-size="16" font-weight="bold" text-anchor="middle">{name}</text>')
for r in rels:
    x, y = r["pos"]
    out.append(f'<polygon points="{x:.0f},{y-REL_H/2:.0f} {x+REL_W/2:.0f},{y:.0f} {x:.0f},{y+REL_H/2:.0f} {x-REL_W/2:.0f},{y:.0f}" fill="#d5e8d4" stroke="#82b366" stroke-width="2.5"/>'
               f'<text x="{x:.0f}" y="{y+4:.0f}" font-size="13" text-anchor="middle">{r["label"]}</text>')
# legend
out.append(f'<g transform="translate({lx},{ly})"><text x="0" y="-20" font-size="18" font-weight="bold">Legend</text>'
           '<rect x="0" y="0" width="120" height="44" fill="#dae8fc" stroke="#6c8ebf" stroke-width="3"/><text x="60" y="27" font-size="14" text-anchor="middle" font-weight="bold">Entity</text>'
           '<ellipse cx="60" cy="90" rx="60" ry="20" fill="#fff2cc" stroke="#d6b656"/><text x="60" y="94" font-size="12" text-anchor="middle">attribute</text>'
           '<ellipse cx="60" cy="140" rx="60" ry="20" fill="#fff2cc" stroke="#d6b656"/><text x="60" y="144" font-size="12" text-anchor="middle" text-decoration="underline">primary_key</text>'
           '<polygon points="60,175 120,210 60,245 0,210" fill="#d5e8d4" stroke="#82b366" stroke-width="2.5"/><text x="60" y="214" font-size="12" text-anchor="middle">relationship</text>'
           '<text x="0" y="285" font-size="13">Single line = partial participation</text><text x="0" y="308" font-size="13">Double line = total participation</text>'
           '<text x="0" y="331" font-size="13">1 / N = cardinality</text><text x="0" y="354" font-size="13">Foreign keys appear as relationships,</text><text x="0" y="372" font-size="13">not as attributes.</text></g>')
out.append("</svg>")
open("chen_er_diagram.svg", "w").write("".join(out))
print("ok", len(attrs), "attributes", len(rels), "relationships")
