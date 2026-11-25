"""
persona.py — Piezas compartidas para las personas de la lámina caída libre (paracaidista, tándem).

Persona estilizada de ~1.73 m (con casco), una sola malla pesada a un esqueleto simple.
Ejes de construcción (Blender): Z arriba, mira hacia -Y, su izquierda es +X.
Al exportar con +Y arriba mira hacia +Z de glTF.

Esqueleto (pose de reposo en T):
  cadera (raíz, en el centro de masa) > columna > pecho > cuello > cabeza
  pecho > enganche   (no deforma: punto donde se cuelga el paracaídas, sobre la mochila entre los hombros)
  pecho > brazo_* > antebrazo_* > mano_*      cadera > muslo_* > pierna_* > pie_*     (* = izq | der)
Poses: acciones «parada», «arco» y «vertical» (cada una en su pista NLA → una animación glTF por pose).
"""
import bpy, bmesh, math
from math import radians, sin, cos, pi
from mathutils import Vector, Quaternion

PALETA = {
    "blanco": "F4F4F1", "gris": "D6D7D5", "gris_oscuro": "9FA3AA",
    "menta": "8FD3B0", "menta_oscuro": "5FAE8C", "coral": "E39A84",
    "coral_oscuro": "C77964", "azul": "6F93C9", "vidrio": "A8C4E6", "tinta": "2A2A33",
    "llanta": "3B3E4A", "traje_alumna": "E3B95A",
    # Paracaídas: las celdas usan tres materiales propios para poder recolorearlas desde three.js.
    "vela_1": "8FD3B0", "vela_2": "F4F4F1", "vela_3": "E39A84", "cuerda": "3B3E4A", "boca": "9FA3AA",
    # Detalle (sin contorno en la lámina: el nombre empieza con costura_, hebilla, reloj_ o slider_borde).
    "costura_coral": "B86A55", "costura_menta": "4F9A7A", "costura_traje_alumna": "B88E35",
    "costura_guante": "6E727C", "costura_vela": "8A8E98", "hebilla": "C9CED6",
    "reloj_negro": "16171C", "reloj_bisel": "3FA581", "reloj_lcd": "C9DCC2", "slider_borde": "9FA3AA",
}
DOS_CARAS = ("costura_", "reloj_")   # tiras abiertas: se ven por las dos caras
Z0 = 0.95          # altura de la cadera = centro de masa aproximado (≈55 % de la estatura)
DXH = 0.02         # hombros 2 cm más afuera (pecho más ancho)
GT, GB, GP, GC = 1.10, 1.22, 1.20, 1.18  # grosor: tronco, brazos, piernas, casco (más forma que un maniquí)
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
LADOS = ((1, "izq"), (-1, "der"))


# ---------------------------------------------------------------- materiales
def lineal(h):
    out = []
    for k in (0, 2, 4):
        c = int(h[k:k + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def material(nombre):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    col = (*lineal(PALETA[nombre]), 1.0)
    if m.node_tree is None:
        try:
            m.use_nodes = True
        except Exception:
            pass
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) \
            or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = col
    m.roughness = 1.0
    m.metallic = 0.0
    m.use_backface_culling = not nombre.startswith(DOS_CARAS)
    return m


# ---------------------------------------------------------------- malla con pesos
def huesos_def():
    g = ["cadera", "columna", "pecho", "cuello", "cabeza"]
    for _, l in LADOS:
        g += [f"{b}_{l}" for b in ("brazo", "antebrazo", "mano", "muslo", "pierna", "pie")]
    return g


class Pieza:
    """bmesh + materiales por nombre + pesos de esqueleto por vértice."""
    def __init__(s, grupos):
        s.bm = bmesh.new()
        s.dl = s.bm.verts.layers.deform.verify()
        s.mats, s.grupos = [], list(grupos)
        s.prefijo = ""          # se antepone a los huesos de los pesos (p. ej. "alu_" en el tándem)

    def mi(s, n):
        if n not in s.mats:
            s.mats.append(n)
        return s.mats.index(n)

    def v(s, co, pesos):
        vert = s.bm.verts.new(co)
        for g, w in pesos.items():
            if w > 1e-4:
                vert[s.dl][s.grupos.index(s.prefijo + g)] = w
        return vert

    def f(s, vs, mat):
        cara = s.bm.faces.new(vs)
        cara.material_index = s.mi(mat)
        return cara

    def objeto(s, nombre, col, suave=50):
        bm = s.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        lim = radians(suave)
        for cara in bm.faces:
            cara.smooth = True
        for e in bm.edges:
            e.smooth = e.is_manifold and e.calc_face_angle(pi) < lim
        duros = {s.mats.index(n) for n in ("vidrio",) if n in s.mats}
        for cara in bm.faces:
            if cara.material_index in duros:
                cara.smooth = False
        me = bpy.data.meshes.new(nombre)
        bm.to_mesh(me)
        bm.free()
        for n in s.mats:
            me.materials.append(material(n))
        ob = bpy.data.objects.new(nombre, me)
        col.objects.link(ob)
        for g in s.grupos:
            ob.vertex_groups.new(name=g)
        return ob


def mezcla(a, b, t):
    return {k: a.get(k, 0) * (1 - t) + b.get(k, 0) * t for k in set(a) | set(b)}


def peso_torso(z):
    """Pesos del tronco según la altura: la cintura y el pecho se mezclan para doblar suave."""
    nodos = [(0.93, {"cadera": 1}), (1.03, {"cadera": .5, "columna": .5}), (1.15, {"columna": 1}),
             (1.27, {"columna": .5, "pecho": .5}), (1.37, {"pecho": 1})]
    if z <= nodos[0][0]:
        return nodos[0][1]
    for (z0, p0), (z1, p1) in zip(nodos, nodos[1:]):
        if z <= z1:
            return mezcla(p0, p1, (z - z0) / (z1 - z0))
    return nodos[-1][1]


def anillo(P, c, ex, ey, rx, ry, n, pesos, p=2.0):
    c, e, out = Vector(c), 2 / p, []
    for i in range(n):
        a = 2 * pi * i / n
        ca, sa = cos(a), sin(a)
        out.append(P.v(c + ex * (math.copysign(abs(ca) ** e, ca) * rx) + ey * (math.copysign(abs(sa) ** e, sa) * ry),
                       pesos))
    return out


def loft(P, rings, mats, punta0=None, punta1=None, cerrado=False):
    """Une anillos; punta = (posición, pesos, material) cierra el extremo en abanico."""
    n = len(rings[0])
    tramos = len(rings) if cerrado else len(rings) - 1
    for s in range(tramos):
        r0, r1 = rings[s], rings[(s + 1) % len(rings)]
        m = mats if isinstance(mats, str) else mats[s]
        for i in range(n):
            j = (i + 1) % n
            P.f([r0[i], r0[j], r1[j], r1[i]], m)
    for punta, ring in ((punta0, rings[0]), (punta1, rings[-1])):
        if punta:
            co, pesos, m = punta
            v = P.v(Vector(co), pesos)
            for i in range(n):
                P.f([ring[i], ring[(i + 1) % n], v], m)


def tubo(P, pts, r, n, mat, pesos_fn, ref=Z):
    """Correa o tubo por una polilínea; ref fija la orientación de los anillos (sin torceduras)."""
    pts = [Vector(p) for p in pts]
    rings = []
    for k, p in enumerate(pts):
        d = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        ex = (ref - d * ref.dot(d)).normalized()
        rings.append(anillo(P, p, ex, d.cross(ex), r, r, n, pesos_fn(p)))
    loft(P, rings, mat, (pts[0], pesos_fn(pts[0]), mat), (pts[-1], pesos_fn(pts[-1]), mat))


def aro(P, c, rx, ry, r, m, n, mat, pesos):
    """Aro horizontal (perneras del arnés)."""
    c = Vector(c)
    rings = []
    for k in range(m):
        a = 2 * pi * k / m
        d = Vector((cos(a) * rx, sin(a) * ry, 0))
        rings.append(anillo(P, c + d, d.normalized(), Z, r, r, n, pesos))
    loft(P, rings, mat, cerrado=True)


# ---------------------------------------------------------------- detalle (pocos triángulos)
def cuad(P, pts, mat, pesos):
    P.f([P.v(Vector(p), pesos) for p in pts], mat)


def banda(P, c, eje, ex, ey, rx, ry, n, ancho, mat, pesos, p=2.4, sale=0.004):
    """Costura: tira de 'ancho' alrededor de un anillo superelíptico, 'sale' por fuera de la tela."""
    c, eje = Vector(c), Vector(eje)
    r0 = anillo(P, c - eje * ancho / 2, ex, ey, rx + sale, ry + sale, n, pesos, p)
    r1 = anillo(P, c + eje * ancho / 2, ex, ey, rx + sale, ry + sale, n, pesos, p)
    for i in range(n):
        j = (i + 1) % n
        P.f([r0[i], r0[j], r1[j], r1[i]], mat)


def cajita(P, c, t, mat, pesos):
    c = Vector(c)
    hx, hy, hz = t[0] / 2, t[1] / 2, t[2] / 2
    v = [P.v(c + Vector((sx * hx, sy * hy, sz * hz)), pesos) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        P.f([v[k] for k in q], mat)


def detalle(P, V, traje, s_reloj=1):
    """Costuras del traje, hebillas del arnés, dedos insinuados y altímetro de muñeca (el de la mesa)."""
    cos_ = "costura_" + traje
    # Tronco: cintura y canesú, y costuras laterales.
    for z, rx, ry in ((1.05, .140, .100), (1.37, .215, .125)):
        banda(P, V(0, 0, z), Z, X, Y, rx * GT, ry * GT, 16, .012, cos_, peso_torso(z))
    T = [(0.86, .155), (0.93, .165), (1.05, .140), (1.15, .148), (1.27, .195), (1.37, .215), (1.44, .200)]
    for s, _ in LADOS:
        for (z0, r0), (z1, r1) in zip(T, T[1:]):
            x0, x1 = s * (r0 * GT + .004), s * (r1 * GT + .004)
            P.f([P.v(V(x0, -.006, z0), peso_torso(z0)), P.v(V(x0, .006, z0), peso_torso(z0)),
                 P.v(V(x1, .006, z1), peso_torso(z1)), P.v(V(x1, -.006, z1), peso_torso(z1))], cos_)
    for s, l in LADOS:
        b, a, mu, pn = f"brazo_{l}", f"antebrazo_{l}", f"muslo_{l}", f"pierna_{l}"
        banda(P, V(s * (0.45 + DXH), 0, 1.42), X, Y, Z, .053 * GB, .053 * GB, 10, .012, cos_, {b: .5, a: .5})   # codo
        banda(P, V(s * 0.10, 0, 0.49), Z, X, Y, .066 * GP, .071 * GP, 10, .012, cos_, {mu: .5, pn: .5})          # rodilla
        # Hebillas: perneras y ajustes de los tirantes.
        cajita(P, V(s * 0.10, -.136, 0.84), (.045, .014, .032), "hebilla", {"cadera": .3, mu: .7})
        cajita(P, V(s * 0.12, -.162, 1.38), (.034, .012, .040), "hebilla", peso_torso(1.38))
        # Guante: tres ranuras sobre el dorso = dedos insinuados.
        m = f"mano_{l}"
        for dy in (-.016, 0.0, .016):
            x0, x1 = s * (0.765 + DXH), s * (0.825 + DXH)
            cuad(P, [V(x0, dy - .0016, 1.4525), V(x1, dy - .0016, 1.4525), V(x1, dy + .0016, 1.4525), V(x0, dy + .0016, 1.4525)],
                 "costura_guante", {m: 1})
    cajita(P, V(0, -.172, 1.30), (.062, .014, .044), "hebilla", peso_torso(1.30))                  # pechera
    # Altímetro de muñeca (izquierda): correa, caja negra, bisel menta y pantalla LCD, como en la mesa.
    s, l = s_reloj, ("izq" if s_reloj > 0 else "der")
    a, xr = f"antebrazo_{l}", s_reloj * (0.62 + DXH)
    banda(P, V(xr, 0, 1.42), X, Y, Z, .044 * GB, .044 * GB, 8, .026, "reloj_negro", {a: 1}, p=2.0, sale=.003)
    zr = 1.42 + .044 * GB + .003
    cajita(P, V(xr, 0, zr + .009), (.050, .042, .018), "reloj_negro", {a: 1})
    cuad(P, [V(xr - .022, -.019, zr + .0185), V(xr + .022, -.019, zr + .0185), V(xr + .022, .019, zr + .0185), V(xr - .022, .019, zr + .0185)], "reloj_bisel", {a: 1})
    cuad(P, [V(xr - .016, -.013, zr + .0195), V(xr + .016, -.013, zr + .0195), V(xr + .016, .013, zr + .0195), V(xr - .016, .013, zr + .0195)], "reloj_lcd", {a: 1})


# ---------------------------------------------------------------- cuerpo
def cuerpo(P, traje, acento, mochila="azul", casco="blanco", arnes="gris_oscuro", dy=0.0, dz=0.0, mochila_escala=1.0):
    """Arma una persona en P. dy/dz la desplazan (para el tándem)."""
    o = Vector((0, dy, dz))

    def V(x, y, z):
        return o + Vector((x, y, z))

    # Tronco en V (menos tubular): cadera, cintura estrecha, pecho y hombros anchos y cuadrados;
    # arriba un collarín corto en tono de acento.
    T = [(0.84, .150, .105), (0.93, .165, .115), (1.05, .140, .100), (1.15, .148, .106),
         (1.27, .195, .125), (1.37, .215, .125), (1.44, .200, .110), (1.49, .110, .080)]
    rings = [anillo(P, V(0, 0, z), X, Y, rx * GT, ry * GT, 16, peso_torso(z), p=2.4) for z, rx, ry in T]
    rings.append(anillo(P, V(0, 0, 1.505), X, Y, .082, .077, 16, {"pecho": .5, "cuello": .5}))
    rings.append(anillo(P, V(0, 0, 1.545), X, Y, .072, .068, 16, {"cuello": 1}))
    loft(P, rings, [traje] * (len(rings) - 3) + [acento, acento],
         (V(0, 0, 0.80), {"cadera": 1}, traje), (V(0, 0, 1.56), {"cuello": 1}, acento))

    for s, l in LADOS:
        b, a, m = f"brazo_{l}", f"antebrazo_{l}", f"mano_{l}"
        B = [(0.10, .060, {"pecho": 1}), (0.17, .068, {"pecho": .4, b: .6}), (0.26, .066, {b: 1}),
             (0.38, .058, {b: 1}), (0.45, .053, {b: .5, a: .5}), (0.52, .050, {a: 1}),
             (0.64, .044, {a: 1}), (0.69, .040, {a: .5, m: .5})]
        rings = [anillo(P, V(s * (x + DXH), 0, 1.42), Y, Z, r * GB, r * GB, 10, w) for x, r, w in B]
        loft(P, rings, [traje] * 6 + [acento],
             (V(s * (0.06 + DXH), 0, 1.42), {"pecho": 1}, traje), (V(s * (0.70 + DXH), 0, 1.42), {m: 1}, acento))
        # Guante tipo manopla + pulgar
        G = [(0.695, .042, .026), (0.73, .048, .030), (0.79, .046, .026), (0.815, .030, .018)]
        rings = [anillo(P, V(s * (x + DXH), -0.005, 1.42), Y, Z, ry * 1.15, rz * 1.15, 10, {m: 1}, p=2.6)
                 for x, ry, rz in G]
        loft(P, rings, "gris_oscuro", (V(s * (0.69 + DXH), -0.005, 1.42), {m: 1}, "gris_oscuro"),
             (V(s * (0.83 + DXH), -0.005, 1.42), {m: 1}, "gris_oscuro"))
        tubo(P, [V(s * (0.715 + DXH), -0.035, 1.425), V(s * (0.75 + DXH), -0.062, 1.425)], .015, 6, "gris_oscuro",
             lambda p, m=m: {m: 1})

        mu, pn, pe = f"muslo_{l}", f"pierna_{l}", f"pie_{l}"
        L = [(0.98, .085, .090, {"cadera": 1}), (0.88, .095, .100, {"cadera": .4, mu: .6}),
             (0.75, .090, .095, {mu: 1}), (0.58, .075, .080, {mu: 1}), (0.49, .066, .071, {mu: .5, pn: .5}),
             (0.40, .062, .068, {pn: 1}), (0.22, .052, .056, {pn: 1}), (0.13, .048, .052, {pn: .5, pe: .5})]
        rings = [anillo(P, V(s * 0.10, 0, z), X, Y, rx * GP, ry * GP, 10, w) for z, rx, ry, w in L]
        loft(P, rings, [traje] * 6 + [acento],
             (V(s * 0.10, 0, 1.0), {"cadera": 1}, traje), (V(s * 0.10, 0, 0.10), {pe: 1}, acento))
        # Bota
        S = [(0.06, .045, .040, .060), (0.0, .055, .050, .060), (-0.10, .052, .040, .050), (-0.16, .036, .026, .040)]
        rings = [anillo(P, V(s * 0.10, y, zc), X, Z, rx * 1.12, rz * 1.12, 10, {pe: 1}, p=2.4) for y, rx, rz, zc in S]
        loft(P, rings, "gris_oscuro",
             (V(s * 0.10, 0.09, 0.06), {pe: 1}, "gris_oscuro"), (V(s * 0.10, -0.19, 0.04), {pe: 1}, "gris_oscuro"))
        # Pernera del arnés
        aro(P, V(s * 0.10, 0, 0.84), .102 * GP, .107 * GP, .016, 12, 6, arnes, {"cadera": .3, mu: .7})

    # Casco cerrado (sin cara) + goggles de dos lentes con puente
    hc, R = V(0, -0.005, 1.63), (0.140 * GC, 0.150 * GC, 0.145 * GC)
    rings = []
    for la in (-60, -35, -10, 15, 40, 65):
        k = cos(radians(la))
        rings.append(anillo(P, hc + Vector((0, 0, sin(radians(la)) * R[2])), X, Y, R[0] * k, R[1] * k, 14, {"cabeza": 1}))
    loft(P, rings, casco, (hc + Vector((0, 0, -0.10)), {"cabeza": 1}, casco), (hc + Vector((0, 0, R[2])), {"cabeza": 1}, casco))
    n, zc, banda = 24, 1.615, []
    for i in range(n):
        a = 2 * pi * i / n
        d = Vector((sin(a), -cos(a), 0))
        rh = 1 / math.sqrt((d.x / R[0]) ** 2 + (d.y / R[1]) ** 2)
        ang = abs(math.atan2(sin(a), cos(a)))
        lente = radians(8) < ang < radians(62)
        h, off = (.036, .020) if lente else (.016, .007)
        c = Vector((hc.x, hc.y, o.z + zc))
        pts = [c + d * (rh - .012) - Z * h, c + d * (rh + off) - Z * h, c + d * (rh + off) + Z * h, c + d * (rh - .012) + Z * h]
        banda.append(([P.v(p, {"cabeza": 1}) for p in pts], lente))
    for i in range(n):
        (r0, l0), (r1, l1) = banda[i], banda[(i + 1) % n]
        for k in range(4):
            kk = (k + 1) % 4
            P.f([r0[k], r1[k], r1[kk], r0[kk]], "vidrio" if (k == 1 and l0 and l1) else "gris_oscuro")

    def pt(p):
        return peso_torso(p.z - o.z) if p.z - o.z > 0.93 else {"cadera": 1}

    # Arnés: tirantes por los hombros, pechera y salidas de las bandas sobre la mochila
    for s, _ in LADOS:
        tubo(P, [V(s * .11, .15, 1.45), V(s * .13, .0, 1.52), V(s * .11, -.152, 1.40),
                 V(s * .085, -.125, 1.10), V(s * .10, -.135, .92)], .017, 6, arnes, pt, ref=X)
    tubo(P, [V(-.13, -.155, 1.30), V(.13, -.155, 1.30)], .015, 6, arnes, pt)

    if mochila:
        k = mochila_escala      # tándem: mochila más grande (lleva dos velas)
        M = [(1.00, .13, .050), (1.04, .155, .068), (1.38, .165, .070), (1.46, .145, .058)]
        rings = [anillo(P, V(0, 0.138 + ry * k, z), X, Y, rx * min(k, 1.1), ry * k, 12, peso_torso(z), p=3.2)
                 for z, rx, ry in M]
        loft(P, rings, mochila, (V(0, .138 + .047 * k, 0.99), peso_torso(0.99), mochila),
             (V(0, .138 + .057 * k, 1.47), {"pecho": 1}, mochila))
        for s, _ in LADOS:   # salidas de las bandas (aquí se unen las bandas del paracaídas)
            tubo(P, [V(s * .085, .195, 1.45), V(s * .085, .195, 1.50)], .02, 6, arnes, lambda p: {"pecho": 1})
    detalle(P, V, traje)


# ---------------------------------------------------------------- esqueleto
def huesos(dy=0.0, dz=0.0, prefijo="", padre_raiz=None, enganche=True):
    """Lista (nombre, cabeza, cola, padre). padre_raiz cuelga la cadera de otro hueso (alumna → instructor)."""
    lista = _huesos(dy, dz, prefijo)
    if not enganche:
        lista = [h for h in lista if not h[0].endswith("enganche")]
    if padre_raiz:
        lista = [(n, h, t, padre_raiz if p is None else p) for n, h, t, p in lista]
    return lista


def _huesos(dy=0.0, dz=0.0, prefijo=""):
    o = Vector((0, dy, dz))
    H = [("cadera", (0, 0, Z0), (0, 0, 1.08), None), ("columna", (0, 0, 1.08), (0, 0, 1.30), "cadera"),
         ("pecho", (0, 0, 1.30), (0, 0, 1.47), "columna"), ("cuello", (0, 0, 1.47), (0, 0, 1.55), "pecho"),
         ("cabeza", (0, 0, 1.55), (0, 0, 1.78), "cuello"), ("enganche", (0, .215, 1.47), (0, .215, 1.57), "pecho")]
    for s, l in LADOS:
        H += [(f"brazo_{l}", (s * (.19 + DXH), 0, 1.42), (s * (.45 + DXH), 0, 1.42), "pecho"),
              (f"antebrazo_{l}", (s * (.45 + DXH), 0, 1.42), (s * (.69 + DXH), 0, 1.42), f"brazo_{l}"),
              (f"mano_{l}", (s * (.69 + DXH), 0, 1.42), (s * (.80 + DXH), 0, 1.42), f"antebrazo_{l}"),
              (f"muslo_{l}", (s * .10, 0, .90), (s * .10, 0, .49), "cadera"),
              (f"pierna_{l}", (s * .10, 0, .49), (s * .10, 0, .09), f"muslo_{l}"),
              (f"pie_{l}", (s * .10, 0, .09), (s * .10, -.15, .04), f"pierna_{l}")]
    return [(prefijo + n, o + Vector(h), o + Vector(t), (prefijo + p) if p else None) for n, h, t, p in H]


def crear_esqueleto(col, nombre, lista):
    ad = bpy.data.armatures.new(nombre)
    ob = bpy.data.objects.new(nombre, ad)
    col.objects.link(ob)
    vl = bpy.context.view_layer
    vl.update()
    for o in vl.objects:
        if o is not None:          # tras borrar objetos puede quedar una referencia vacía
            o.select_set(False)
    vl.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for n, h, t, p in lista:
        eb = ad.edit_bones.new(n)
        eb.head, eb.tail, eb.roll = h, t, 0.0
        if p:
            eb.parent = ad.edit_bones[p]
    bpy.ops.object.mode_set(mode="OBJECT")
    for b in ad.bones:
        b.use_deform = not (b.name.endswith("enganche") or b.name == "centro")
    ad.display_type = "STICK"
    return ob


# ---------------------------------------------------------------- poses
def brazo(s, levantar=0, adelante=0):
    """Desde la T: levantar = hacia la cabeza, adelante = hacia el pecho (grados)."""
    return [("Y", -s * levantar), ("Z", -s * adelante)]


PARADA = {"columna": 22, "pecho": 10, "cuello": -20, "cabeza": -12, "muslo": -60, "rodilla": 95, "pie": -35, "abre": 8,
          "brazo_der": (-0.10, -0.75, -0.55), "antebrazo_der": (-0.05, -0.78, 0.62)}


def poses():
    """Por hueso: giros ("X"|"Y"|"Z", grados) en ejes del cuerpo y relativos al padre, o ("dir", vector):
    hacia dónde apunta el hueso, en ejes del pecho (brazos) o de la cadera (piernas).
    s=+1 izquierda, -1 derecha. El cuerpo mira a -Y; +Z arriba."""
    P = {}
    # Parada (tomas de la puerta): agachada en el estribo, bajo el ala, lista para saltar. Cadera y
    # rodillas muy flexionadas y tronco inclinado al frente (el casco libra el ala); la mano derecha
    # sujeta el montante y la izquierda la pechera. v = 0.
    p = {"columna": [("X", PARADA["columna"])], "pecho": [("X", PARADA["pecho"])],
         "cuello": [("X", PARADA["cuello"])], "cabeza": [("X", PARADA["cabeza"])],
         "brazo_der": [("dir", PARADA["brazo_der"])], "antebrazo_der": [("dir", PARADA["antebrazo_der"])],
         "brazo_izq": [("dir", (0.35, -0.45, -0.82))], "antebrazo_izq": [("dir", (-0.95, -0.15, 0.27))]}
    for s, l in LADOS:
        p[f"muslo_{l}"] = [("Y", -s * PARADA["abre"]), ("X", PARADA["muslo"])]
        p[f"pierna_{l}"] = [("X", PARADA["rodilla"])]
        p[f"pie_{l}"] = [("X", PARADA["pie"])]
    P["parada"] = p
    # Arco (tomas 3-4 y pausa): boca abajo, espalda arqueada, brazos en «cactus» simétricos
    # (brazo a los lados, codo a ~90°, antebrazo al frente a la altura de la cabeza), piernas atrás.
    p = {"cadera": [("X", 90)], "columna": [("X", -12)], "pecho": [("X", -10)],
         "cuello": [("X", -20)], "cabeza": [("X", -20)]}
    for s, l in LADOS:
        p[f"brazo_{l}"] = brazo(s, levantar=10, adelante=10)
        p[f"antebrazo_{l}"] = [("Y", -s * 80)]
        p[f"muslo_{l}"] = [("Y", -s * 10), ("X", 15)]
        p[f"pierna_{l}"] = [("X", 55)]
        p[f"pie_{l}"] = [("X", 30)]
    P["arco"] = p
    # Vertical (toma 5): suspendida del paracaídas. Las dos manos arriba en los mandos,
    # piernas juntas y casi rectas, colgando.
    p = {"columna": [("X", 3)], "cuello": [("X", -8)], "cabeza": [("X", -10)]}
    for s, l in LADOS:
        p[f"brazo_{l}"] = brazo(s, levantar=75, adelante=10)
        p[f"antebrazo_{l}"] = [("Y", -s * 20)]
        p[f"muslo_{l}"] = [("Y", s * 2), ("X", -8)]
        p[f"pierna_{l}"] = [("X", 10)]
        p[f"pie_{l}"] = [("X", 35)]
    P["vertical"] = p
    return P


EJES = {"X": X, "Y": Y, "Z": Z}
REFERENCIA = {"pecho", "cadera"}   # marcos para ("dir", ...)


def aplicar_pose(arm, giros, prefijo="", otros=()):
    """Pone la pose en los huesos con ese prefijo ("" = sin prefijo; otros = prefijos que se saltan)."""
    delta = {}                                  # giro de cada hueso en ejes del cuerpo (padres primero)
    for pb in arm.pose.bones:
        if prefijo and not pb.name.startswith(prefijo):
            continue
        if not prefijo and any(pb.name.startswith(o) for o in otros):
            continue
        pb.rotation_mode = "QUATERNION"
        nombre = pb.name[len(prefijo):]
        q = Quaternion()
        for eje, g in giros.get(nombre, []):
            if eje == "dir":
                # Giros de los ancestros hasta el marco de referencia (pecho o cadera).
                cadena, p = [], pb.parent
                while p is not None and p.name[len(prefijo):] not in REFERENCIA:
                    cadena.append(p.name)
                    p = p.parent
                acc = Quaternion()
                for n in reversed(cadena):
                    acc = acc @ delta[n]
                d0 = (pb.bone.tail_local - pb.bone.head_local).normalized()
                q = d0.rotation_difference(acc.inverted() @ Vector(g).normalized())
            else:
                q = Quaternion(EJES[eje], radians(g)) @ q
        delta[pb.name] = q
        M = pb.bone.matrix_local.to_quaternion()
        pb.rotation_quaternion = M.inverted() @ q @ M   # giro en ejes del cuerpo → espacio local del hueso


def curvas(act, ad):
    """F-curves de una acción (Blender 4.4+ guarda las curvas por «slot»)."""
    try:
        from bpy_extras import anim_utils
        cb = anim_utils.action_get_channelbag_for_slot(act, ad.action_slot)
        if cb is not None:
            return list(cb.fcurves)
    except Exception:
        pass
    return list(getattr(act, "fcurves", []))


def crear_acciones(arm, juego):
    """juego = {nombre: giros} o {nombre: [(prefijo, giros), ...]} (tándem: instructor y alumna)."""
    """Una acción por pose (2 claves iguales) en su propia pista NLA."""
    ad = arm.animation_data or arm.animation_data_create()
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    for nombre, giros in juego.items():
        act = bpy.data.actions.get(nombre)
        if act:
            bpy.data.actions.remove(act)
        act = bpy.data.actions.new(nombre)
        ad.action = act
        pares = giros if isinstance(giros, list) else [("", giros)]
        otros = tuple(pr for pr, _ in pares if pr)
        for pr, g in pares:
            aplicar_pose(arm, g, pr, otros)
        for pb in arm.pose.bones:
            for f in (0, 24):   # el clip empieza en 0 s
                pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
        for fc in curvas(act, ad):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
        tr = ad.nla_tracks.new()
        tr.name = nombre
        tr.strips.new(nombre, 1, act)
        ad.action = None
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)


# ---------------------------------------------------------------- escena, exportación, vista previa
def preparar_escena(nombre):
    """Escena propia y activa. El exportador glTF debe correr en la escena activa (sin temp_override)."""
    if bpy.app.background:
        sc = bpy.context.scene
        for o in list(sc.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        sc.name = nombre
    else:
        sc = bpy.data.scenes.get(nombre) or bpy.data.scenes.new(nombre)
        if bpy.context.window.scene != sc:
            bpy.context.window.scene = sc
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    return sc


def coleccion(sc, nombre):
    col = bpy.data.collections.get(nombre) or bpy.data.collections.new(nombre)
    if col.name not in sc.collection.children:
        sc.collection.children.link(col)
    for o in list(col.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for d in (bpy.data.meshes, bpy.data.armatures, bpy.data.cameras):
        for x in list(d):
            if x.users == 0:
                d.remove(x)
    return col


def triangulos(ob, dg):
    oe = ob.evaluated_get(dg)
    me = oe.to_mesh()
    n = sum(len(p.vertices) - 2 for p in me.polygons)
    oe.to_mesh_clear()
    return n


def exportar_glb(sc, raiz, ruta):
    vl = sc.view_layers[0]
    if bpy.context.scene != sc:
        raise RuntimeError(f"La escena «{sc.name}» debe estar activa para exportar.")
    for o in sc.objects:
        o.select_set(False, view_layer=vl)
    for o in [raiz] + list(raiz.children_recursive):
        o.select_set(True, view_layer=vl)
    bpy.ops.export_scene.gltf(
        filepath=ruta, export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_animations=True, export_animation_mode="ACTIONS",
        # Sin muestreo: solo los canales con claves (rotación) → sin posición ni escala, ~90 KB.
        export_force_sampling=False,
        export_cameras=False, export_lights=False, export_extras=False)


def vista_previa(sc, objetos, ruta, elev=54.7356, res=(1200, 860)):
    """PNG isométrico (Workbench: paleta plana + cavidad + contorno, fondo claro) de los objetos dados."""
    col = coleccion(sc, sc.name + "_camara")
    vl = sc.view_layers[0]
    cam = bpy.data.objects.new("CamaraVista", bpy.data.cameras.new("CamaraVista"))
    col.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.rotation_euler = (radians(elev), 0, radians(-45))    # desde el frente-derecha
    vl.update()
    dg = vl.depsgraph
    fwd = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
    der = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
    arr = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
    pts = []
    for o in objetos:
        if o.type == "MESH" and not o.hide_render:
            oe = o.evaluated_get(dg)
            me = oe.to_mesh()
            pts += [oe.matrix_world @ v.co for v in me.vertices]
            oe.to_mesh_clear()
    cen = sum(pts, Vector()) / len(pts)
    xs = [(p - cen).dot(der) for p in pts]
    ys = [(p - cen).dot(arr) for p in pts]
    cen = cen + der * (max(xs) + min(xs)) / 2 + arr * (max(ys) + min(ys)) / 2
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = res[0], res[1], 100
    cam.data.ortho_scale = max(max(xs) - min(xs), (max(ys) - min(ys)) * res[0] / res[1]) * 1.12
    cam.location = cen - fwd * 40
    cam.data.clip_end = 100
    sc.camera = cam
    try:
        r.engine = "BLENDER_WORKBENCH"
    except TypeError as e:
        print("motor:", e)
    sh = sc.display.shading
    sh.light = "FLAT"
    sh.color_type = "MATERIAL"
    sh.show_object_outline = True
    sh.object_outline_color = lineal(PALETA["tinta"])
    sh.show_cavity = True
    sh.cavity_type = "BOTH"
    sh.show_specular_highlight = False
    if sc.world is None:
        sc.world = bpy.data.worlds.new("Fondo")
    sc.world.color = lineal(PALETA["blanco"])
    r.film_transparent = False
    try:
        sc.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.compression = 100
    r.filepath = ruta
    bpy.ops.render.render(write_still=True, scene=sc.name)
    return col
