"""
avioneta.py — Fuente de verdad del modelo «avioneta» (lámina caída libre · El salto).

Regenerar todo (modelo + avioneta.glb + avioneta.png):
    blender -b --factory-startup -P plantilla/modelos/caida-libre/fuentes/avioneta.py

Opciones (después de "--"):
    --etapa <fuselaje|ala|cola|helice|tren|puerta|detalles>   construye hasta esa etapa
    --sin-exportar                                             no escribe .glb ni .png

En vivo (MCP de Blender) se ejecuta este mismo archivo con ETAPA / EXPORTAR en el namespace.
Todo se arma en la escena «Avioneta»; no toca otras escenas.

Ejes de construcción (Blender): Z arriba, la nariz mira a -Y, el lado derecho del piloto es -X.
Al exportar con +Y arriba: la nariz queda hacia +Z de glTF y la hélice gira sobre su eje Z local.
"""
import bpy, bmesh, math, os, sys
from math import radians, sin, cos, pi, tan
from mathutils import Vector

try:
    AQUI = os.path.dirname(os.path.abspath(__file__))
except NameError:  # ejecución sin __file__
    AQUI = os.getcwd()
SALIDA = os.path.dirname(AQUI)  # plantilla/modelos/caida-libre
NOMBRE = "avioneta"
ETAPAS = ["fuselaje", "ala", "cola", "helice", "tren", "puerta", "detalles"]

PALETA = {
    "blanco": "F4F4F1", "gris": "D6D7D5", "gris_oscuro": "9FA3AA",
    "menta": "8FD3B0", "menta_oscuro": "5FAE8C", "coral": "E39A84",
    "coral_oscuro": "C77964", "azul": "6F93C9", "vidrio": "A8C4E6", "tinta": "2A2A33",
    "llanta": "3B3E4A",   # hule: más suave que la tinta para que el contorno siga leyéndose
}

# ---------------------------------------------------------------- medidas
# Fuselaje: estaciones (y, medio ancho, z abajo, z arriba, exponente de superelipse).
# ~10 m de punta de hélice a cola; ala alta de 13 m (proporción de una Cessna 182 a escala).
EST = [
    (0.00, 0.46, 0.98, 1.72, 2.4),   # 0 frente del cofre (entradas de aire)
    (0.55, 0.58, 0.84, 1.88, 2.6),   # 1 cofre
    (1.40, 0.66, 0.76, 2.00, 2.8),   # 2 parallamas / base del parabrisas
    (2.20, 0.69, 0.74, 2.46, 3.0),   # 3 techo de cabina / borde de ataque del ala / bisagra de puerta
    (3.00, 0.69, 0.74, 2.50, 3.0),   # 4 cabina
    (3.70, 0.67, 0.77, 2.49, 3.0),   # 5 fin de la puerta
    (4.60, 0.58, 0.90, 2.43, 2.8),   # 6 ventanilla trasera
    (6.50, 0.36, 1.28, 2.20, 2.5),   # 7 cono de cola
    (8.50, 0.22, 1.62, 2.10, 2.3),   # 8
    (9.60, 0.14, 1.78, 2.08, 2.3),   # 9 cola (rellenita, no aguja)
]
NS = 16  # vértices por anillo. i=0 abajo, 4 = +X, 8 = arriba, 12 = -X. Cara i va del vértice i al i+1.
FRANJA = {3, 12}                                  # franja menta justo bajo la línea media
PUERTA = {(s, i) for s in (3, 4) for i in (10, 11, 12, 13)}   # puerta derecha (-X), 2.2–3.7 m
VENTANAS = [
    [(2, i) for i in range(5, 11)],               # parabrisas envolvente
    [(3, 4), (3, 5)], [(4, 4), (4, 5)], [(5, 4), (5, 5)],   # lado izquierdo
    [(5, 10), (5, 11)],                           # derecho, detrás de la puerta
]
Z_ALA = 2.47            # cuerda del ala en la raíz (asienta 3–5 cm dentro del techo: sin rendija)
DIEDRO = radians(1.7)
EJE_HELICE = (0.0, -0.12, 1.35)
GRADO_PUERTA = 92       # puerta de salto abatida hacia arriba, bajo el ala


# ---------------------------------------------------------------- utilidades
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
    m.use_backface_culling = True   # glTF de una cara: más ligero y el interior se ve bien
    return m


class Pieza:
    """bmesh + lista de materiales por nombre."""
    def __init__(s):
        s.bm = bmesh.new()
        s.mats = []

    def mi(s, n):
        if n not in s.mats:
            s.mats.append(n)
        return s.mats.index(n)

    def v(s, co):
        return s.bm.verts.new(co)

    def f(s, vs, mat):
        cara = s.bm.faces.new(vs)
        cara.material_index = s.mi(mat)
        return cara

    def normales(s):
        bmesh.ops.recalc_face_normals(s.bm, faces=s.bm.faces[:])

    def objeto(s, nombre, col, suave=35, loc=None):
        bm = s.bm
        lim = radians(suave) if suave else 0
        for cara in bm.faces:
            cara.smooth = bool(suave)
        for e in bm.edges:
            e.smooth = bool(suave) and e.is_manifold and e.calc_face_angle(pi) < lim
        # Vidrio y tinta: caras planas con borde duro (si no, el suavizado mancha el marco).
        duros = {s.mats.index(n) for n in ("vidrio", "tinta") if n in s.mats}
        for cara in bm.faces:
            if cara.material_index in duros:
                cara.smooth = False
                for e in cara.edges:
                    e.smooth = False
        bm.normal_update()
        me = bpy.data.meshes.new(nombre)
        bm.to_mesh(me)
        bm.free()
        for n in s.mats:
            me.materials.append(material(n))
        ob = bpy.data.objects.new(nombre, me)
        col.objects.link(ob)
        if loc:
            ob.location = loc
        return ob


def bisel(ob, ancho=0.012, angulo=45):
    m = ob.modifiers.new("Bisel", "BEVEL")
    m.width = ancho
    m.segments = 1
    m.limit_method = "ANGLE"
    m.angle_limit = radians(angulo)
    return m


def anillo(hw, zb, zt, n=NS, p=2.6):
    zc, hh, e = (zb + zt) / 2, (zt - zb) / 2, 2 / p
    pts = []
    for i in range(n):
        a = 2 * pi * i / n
        sa, ca = sin(a), cos(a)
        pts.append((hw * math.copysign(abs(sa) ** e, sa), zc - hh * math.copysign(abs(ca) ** e, ca)))
    return pts


def zc_en(y):
    for (y0, _, b0, t0, _), (y1, _, b1, t1, _) in zip(EST, EST[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0)
            return ((b0 + t0) / 2) * (1 - k) + ((b1 + t1) / 2) * k
    return (EST[-1][2] + EST[-1][3]) / 2


def loft(P, loops, mat, tapas=True, mats_tramo=None):
    n = len(loops[0])
    for s in range(len(loops) - 1):
        m = mats_tramo[s] if mats_tramo else mat
        for i in range(n):
            j = (i + 1) % n
            P.f([loops[s][i], loops[s + 1][i], loops[s + 1][j], loops[s][j]], m)
    if tapas:
        P.f(loops[0][::-1], mats_tramo[0] if mats_tramo else mat)
        P.f(loops[-1], mats_tramo[-1] if mats_tramo else mat)


def tubo(P, p0, p1, rx, ry, n, mat, arriba=(0, 1, 0)):
    """Tubo de sección elíptica; rx va en la dirección 'arriba' proyectada (p. ej. el flujo de aire)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    a = Vector(arriba)
    a = a - d * a.dot(d)
    if a.length < 1e-6:
        a = Vector((1, 0, 0)) - d * d.x
    a.normalize()
    b = d.cross(a)
    r0, r1 = [], []
    for i in range(n):
        t = 2 * pi * i / n
        off = a * cos(t) * rx + b * sin(t) * ry
        r0.append(P.v(p0 + off))
        r1.append(P.v(p1 + off))
    loft(P, [r0, r1], mat)


def caja(P, c, t, mat):
    cx, cy, cz = c
    hx, hy, hz = t[0] / 2, t[1] / 2, t[2] / 2
    v = [P.v((cx + sx * hx, cy + sy * hy, cz + sz * hz))
         for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        P.f([v[k] for k in q], mat)


def rueda(P, c, r, ancho, n=14):
    """Llanta (hule #3B3E4A) con rin (gris); eje en X."""
    cx, cy, cz = c
    def ring(x, rr):
        return [P.v((x, cy + rr * cos(2 * pi * i / n), cz + rr * sin(2 * pi * i / n))) for i in range(n)]
    w = ancho / 2
    o0, o1 = ring(cx - w, r), ring(cx + w, r)
    s0, s1 = ring(cx - w, r * 0.58), ring(cx + w, r * 0.58)
    h0, h1 = ring(cx - w - 0.02, r * 0.5), ring(cx + w + 0.02, r * 0.5)
    for i in range(n):
        j = (i + 1) % n
        P.f([o0[i], o0[j], o1[j], o1[i]], "llanta")
        P.f([o0[i], s0[i], s0[j], o0[j]], "llanta")
        P.f([o1[i], o1[j], s1[j], s1[i]], "llanta")
        P.f([s0[i], h0[i], h0[j], s0[j]], "gris")
        P.f([s1[i], s1[j], h1[j], h1[i]], "gris")
    P.f(h0[::-1], "gris")
    P.f(h1, "gris")


# ---------------------------------------------------------------- piezas
def fuselaje(col, con_puerta):
    P = Pieza()
    an = [[P.v((x, y, z)) for (x, z) in anillo(hw, zb, zt, p=p)] for (y, hw, zb, zt, p) in EST]
    caras = {}
    for s in range(len(EST) - 1):
        for i in range(NS):
            if con_puerta and (s, i) in PUERTA:
                continue
            j = (i + 1) % NS
            caras[(s, i)] = P.f([an[s][i], an[s + 1][i], an[s + 1][j], an[s][j]],
                                "menta" if i in FRANJA else "blanco")
    frente = P.f(an[0][::-1], "blanco")
    P.f(an[-1], "blanco")
    P.normales()
    bm = P.bm
    # Ventanillas: inserto con marco blanco y vidrio hundido 1 cm (lee como ventana sin transparencia).
    for reg in VENTANAS:
        fs = [caras[k] for k in reg if k in caras]
        bmesh.ops.inset_region(bm, faces=fs, thickness=0.045, depth=-0.012, use_even_offset=True)
        for cara in fs:
            cara.material_index = P.mi("vidrio")
    # Entradas de aire del cofre: el frente se hunde y se pinta tinta (se ve alrededor del cono).
    bmesh.ops.inset_region(bm, faces=[frente], thickness=0.08, depth=-0.06, use_even_offset=True)
    frente.material_index = P.mi("tinta")
    if con_puerta:
        # Marco del hueco de la puerta: la orilla se extruye 5 cm hacia dentro hasta el interior.
        borde = [e for e in bm.edges if e.is_boundary]
        res = bmesh.ops.extrude_edge_only(bm, edges=borde)
        for g in res["geom"]:
            if isinstance(g, bmesh.types.BMVert):
                d = Vector((0, g.co.y, zc_en(g.co.y))) - g.co
                d.y = 0
                g.co += d.normalized() * 0.05
            elif isinstance(g, bmesh.types.BMFace):
                g.material_index = P.mi("gris")
        P.normales()
    return P.objeto("Fuselaje", col, suave=40)


def interior(col):
    """Cabina por dentro: copia del casco 5 cm hacia dentro con normales invertidas."""
    P = Pieza()
    an = []
    for (y, hw, zb, zt, p) in EST[2:7]:
        zc = (zb + zt) / 2
        ring = []
        for (x, z) in anillo(hw, zb, zt, p=p):
            d = Vector((-x, 0, zc - z)).normalized()
            ring.append(P.v((x + d.x * 0.05, y, z + d.z * 0.05)))
        an.append(ring)
    piso = {14, 15, 0, 1}
    # Mismas claves (s, i) que el casco, desplazadas 2 estaciones (el interior empieza en EST[2]).
    hueco = {(s - 2, i) for (s, i) in PUERTA}                     # sin pared donde está la puerta
    vidrios = {(s - 2, i) for reg in VENTANAS for (s, i) in reg}  # ventanillas vistas desde dentro
    for s in range(len(an) - 1):
        for i in range(NS):
            if (s, i) in hueco:
                continue
            j = (i + 1) % NS
            mat = "vidrio" if (s, i) in vidrios else ("gris" if i in piso else "gris_oscuro")
            P.f([an[s][i], an[s + 1][i], an[s + 1][j], an[s][j]], mat)
    P.f(an[0][::-1], "gris_oscuro")
    P.f(an[-1], "gris_oscuro")
    P.normales()
    bmesh.ops.reverse_faces(P.bm, faces=P.bm.faces[:])
    return P.objeto("Interior", col, suave=40)


def puerta(col):
    """Puerta de salto: el mismo trozo de casco, con grosor, abatida hacia arriba sobre su bisagra superior."""
    P = Pieza()
    grid = []
    for s in (3, 4, 5):
        y, hw, zb, zt, p = EST[s]
        pts = anillo(hw, zb, zt, p=p)
        grid.append([P.v((pts[i][0], y, pts[i][1])) for i in range(10, 15)])
    caras = {}
    for a in range(2):
        for k in range(4):
            i = 10 + k
            caras[(a, i)] = P.f([grid[a][k], grid[a + 1][k], grid[a + 1][k + 1], grid[a][k + 1]],
                                "menta" if i in FRANJA else "blanco")
    P.bm.normal_update()
    if caras[(0, 12)].normal.x > 0:          # que mire hacia fuera (-X)
        bmesh.ops.reverse_faces(P.bm, faces=P.bm.faces[:])
    vent = [caras[(a, i)] for a in range(2) for i in (10, 11)]
    bmesh.ops.inset_region(P.bm, faces=vent, thickness=0.045, depth=-0.012, use_even_offset=True)
    for cara in vent:
        cara.material_index = P.mi("vidrio")
    bisagra = (grid[0][0].co + grid[2][0].co) / 2
    for v in P.bm.verts:
        v.co -= bisagra
    ob = P.objeto("Puerta", col, suave=40, loc=bisagra)
    ob.rotation_euler = (0, radians(GRADO_PUERTA), 0)
    so = ob.modifiers.new("Grosor", "SOLIDIFY")
    so.thickness = 0.04
    so.offset = -1
    bisel(ob, 0.008, 50)
    return ob


PERFIL_ALA = [(0.0, 0.0), (0.05, 0.55), (0.25, 1.0), (0.6, 0.72), (1.0, 0.04),
              (0.6, -0.12), (0.25, -0.3), (0.05, -0.25)]      # tipo Clark Y, fondo casi plano
PERFIL_SIM = [(0.0, 0.0), (0.12, 0.5), (0.4, 0.5), (1.0, 0.0), (0.4, -0.5), (0.12, -0.5)]


def ala(col):
    P = Pieza()
    # (x, borde de ataque y, cuerda, espesor): recta por dentro y estrechada por fuera, como la Cessna.
    secs = [(-6.5, 2.40, 1.16, 0.17), (-2.6, 2.20, 1.62, 0.26), (0.0, 2.20, 1.62, 0.26),
            (2.6, 2.20, 1.62, 0.26), (6.5, 2.40, 1.16, 0.17)]
    loops = []
    for x, le, c, t in secs:
        z0 = Z_ALA + abs(x) * tan(DIEDRO)
        loops.append([P.v((x, le + u * c, z0 + w * t)) for (u, w) in PERFIL_ALA])
    loft(P, loops, "blanco")
    P.normales()
    ob = P.objeto("Ala", col, suave=30)
    bisel(ob, 0.012, 45)
    return ob


def montantes(col):
    P = Pieza()
    for sx in (1, -1):
        tubo(P, (0.56 * sx, 3.10, 1.00), (2.60 * sx, 2.62, 2.55), 0.055, 0.022, 6, "gris")
    P.normales()
    return P.objeto("Montantes", col, suave=50)


def cola(col):
    P = Pieza()
    # Estabilizador horizontal
    secs = [(-1.85, 8.72, 0.66, 0.05), (0.0, 8.35, 1.20, 0.08), (1.85, 8.72, 0.66, 0.05)]
    loft(P, [[P.v((x, le + u * c, 1.96 + w * t)) for (u, w) in PERFIL_SIM] for x, le, c, t in secs], "blanco")
    # Deriva con aleta dorsal; la punta va en menta (repite la franja).
    secs = [(1.95, 7.55, 2.05, 0.10), (2.90, 8.70, 0.90, 0.07), (3.30, 8.95, 0.62, 0.05)]
    loft(P, [[P.v((w * t, le + u * c, z)) for (u, w) in PERFIL_SIM] for z, le, c, t in secs], None,
         mats_tramo=["blanco", "menta"])
    P.normales()
    ob = P.objeto("Cola", col, suave=30)
    bisel(ob, 0.01, 45)
    return ob


def helice(col):
    """Objeto aparte con origen en el eje: en three.js gira con rotation.z."""
    P = Pieza()
    n = 10
    perfil = [(0.12, 0.22), (-0.03, 0.20), (-0.18, 0.13), (-0.28, 0.05)]   # (y relativo, radio)
    rings = [[P.v((r * cos(2 * pi * i / n), y, r * sin(2 * pi * i / n))) for i in range(n)] for y, r in perfil]
    loft(P, rings, "menta_oscuro", tapas=False)
    P.f(rings[0][::-1], "menta_oscuro")
    punta = P.v((0, -0.32, 0))
    for i in range(n):
        P.f([rings[-1][i], punta, rings[-1][(i + 1) % n]], "menta_oscuro")
    perfil_pala = [(-0.5, 0.0), (-0.3, 0.45), (0.1, 0.5), (0.5, 0.0), (0.1, -0.12), (-0.3, -0.12)]
    secs = [(0.10, 0.09, 42), (0.35, 0.15, 28), (0.70, 0.13, 18), (0.86, 0.11, 15), (0.97, 0.06, 12)]
    for sg in (1, -1):
        loops = []
        for r, c, tw in secs:
            f = radians(tw)
            ring = []
            for u, w in perfil_pala:
                uu, ww = u * c, w * c * 0.2
                cc = uu * cos(f) - ww * sin(f)
                tt = uu * sin(f) + ww * cos(f)
                ring.append(P.v((sg * cc, -tt, sg * r)))
            loops.append(ring)
        loft(P, loops, None, mats_tramo=["gris_oscuro", "gris_oscuro", "gris_oscuro", "coral"])
    P.normales()
    return P.objeto("Helice", col, suave=45, loc=EJE_HELICE)


def tren(col):
    P = Pieza()
    for sx in (1, -1):   # tren principal de ballesta
        tubo(P, (0.42 * sx, 3.75, 0.86), (1.26 * sx, 3.75, 0.33), 0.07, 0.025, 6, "gris")
        rueda(P, (1.36 * sx, 3.75, 0.33), 0.33, 0.20)
    tubo(P, (0, 0.62, 0.92), (0, 0.55, 0.46), 0.04, 0.04, 6, "gris")          # tren de nariz
    tubo(P, (-0.09, 0.55, 0.46), (0.09, 0.55, 0.46), 0.025, 0.025, 6, "gris")
    for sx in (1, -1):
        tubo(P, (0.09 * sx, 0.55, 0.46), (0.09 * sx, 0.52, 0.24), 0.022, 0.022, 6, "gris")
    rueda(P, (0, 0.52, 0.24), 0.24, 0.13)
    P.normales()
    return P.objeto("Tren", col, suave=50)


def estribo(col):
    """Estribo de salto bajo la puerta, apoyado en el montante derecho: aquí se para la paracaidista."""
    P = Pieza()
    caja(P, (-0.98, 3.00, 0.92), (0.34, 0.26, 0.035), "gris_oscuro")
    tubo(P, (-0.56, 3.00, 0.98), (-0.85, 3.00, 0.92), 0.02, 0.02, 6, "gris_oscuro")
    tubo(P, (-0.98, 3.00, 0.94), (-0.98, 2.99, 1.355), 0.018, 0.018, 6, "gris_oscuro")
    P.normales()
    ob = P.objeto("Estribo", col, suave=50)
    bisel(ob, 0.006, 50)
    return ob


def asiento(col):
    P = Pieza()
    caja(P, (0.28, 2.60, 0.87), (0.30, 0.30, 0.10), "gris_oscuro")
    caja(P, (0.28, 2.60, 0.98), (0.42, 0.45, 0.12), "azul")
    caja(P, (0.28, 2.86, 1.32), (0.42, 0.08, 0.62), "azul")
    P.normales()
    return P.objeto("Asiento", col, suave=None)


# ---------------------------------------------------------------- ensamblado
def unir(objs, nombre, col, vl):
    """Une las piezas fijas en una malla (menos llamadas de dibujo en celular)."""
    vl.update()
    dg = vl.depsgraph
    mats, bm = [], bmesh.new()
    for o in objs:
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        tmp = bmesh.new()
        tmp.from_mesh(me)
        tmp.transform(o.matrix_world)
        remap = []
        for m in me.materials:
            if m.name not in mats:
                mats.append(m.name)
            remap.append(mats.index(m.name))
        for cara in tmp.faces:
            cara.material_index = remap[cara.material_index]
        me2 = bpy.data.meshes.new("_tmp")
        tmp.to_mesh(me2)
        tmp.free()
        oe.to_mesh_clear()
        bm.from_mesh(me2)
        bpy.data.meshes.remove(me2)
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    for n in mats:
        me.materials.append(bpy.data.materials[n])
    ob = bpy.data.objects.new(nombre, me)
    col.objects.link(ob)
    return ob


def centro_masa(ob):
    me = ob.data
    me.calc_loop_triangles()
    vol, c = 0.0, Vector()
    for t in me.loop_triangles:
        a, b, d = (me.vertices[k].co for k in t.vertices)
        v = a.dot(b.cross(d)) / 6
        vol += v
        c += v * (a + b + d) / 4
    return c / vol


def triangulos(ob, dg):
    me = ob.evaluated_get(dg).to_mesh()
    n = sum(len(p.vertices) - 2 for p in me.polygons)
    ob.evaluated_get(dg).to_mesh_clear()
    return n


def preparar_escena():
    """Escena «Avioneta» y activa. El exportador glTF debe correr en la escena activa:
    con temp_override(scene=...) Blender 5.2 se cae al evaluar el depsgraph."""
    if bpy.app.background:
        # blender -b --factory-startup: la escena de fábrica es desechable; se vacía y se renombra.
        sc = bpy.context.scene
        for o in list(sc.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        sc.name = "Avioneta"
    else:
        sc = bpy.data.scenes.get("Avioneta") or bpy.data.scenes.new("Avioneta")
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    if bpy.context.window is not None and bpy.context.window.scene != sc:
        bpy.context.window.scene = sc
    return sc


def coleccion(sc, nombre):
    col = bpy.data.collections.get(nombre)
    if col is None:
        col = bpy.data.collections.new(nombre)
    if col.name not in sc.collection.children:
        sc.collection.children.link(col)
    for o in list(col.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for d in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for x in list(d):
            if x.users == 0:
                d.remove(x)
    return col


def exportar_glb(sc, raiz, ruta):
    vl = sc.view_layers[0]
    for o in sc.objects:
        o.select_set(False, view_layer=vl)
    for o in [raiz] + list(raiz.children_recursive):
        o.select_set(True, view_layer=vl)
    if bpy.context.scene != sc:
        raise RuntimeError("La escena «Avioneta» debe estar activa para exportar.")
    bpy.ops.export_scene.gltf(
        filepath=ruta, export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_animations=True, export_cameras=False,
        export_lights=False, export_extras=False)


def vista_previa(sc, col_modelo, ruta):
    """PNG isométrico con Workbench: colores planos de la paleta + contorno, fondo claro."""
    col = coleccion(sc, "Avioneta_vista")
    vl = sc.view_layers[0]
    vl.update()
    dg = vl.depsgraph
    cam = bpy.data.objects.new("CamaraVista", bpy.data.cameras.new("CamaraVista"))
    col.objects.link(cam)
    cam.data.type = "ORTHO"
    # Isométrica desde abajo (-35.26°), frente-derecha: desde arriba el ala tapa la puerta.
    cam.rotation_euler = (radians(180 - 54.7356), 0, radians(-45))
    vl.update()
    fwd = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
    der = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
    arr = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
    pts = []
    for o in col_modelo.all_objects:
        if o.type == "MESH":
            me = o.evaluated_get(dg).to_mesh()
            pts += [o.matrix_world @ v.co for v in me.vertices]
            o.evaluated_get(dg).to_mesh_clear()
    cen = sum(pts, Vector()) / len(pts)
    xs = [(p - cen).dot(der) for p in pts]
    ys = [(p - cen).dot(arr) for p in pts]
    cen = cen + der * (max(xs) + min(xs)) / 2 + arr * (max(ys) + min(ys)) / 2
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = 1200, 860, 100
    asp = r.resolution_x / r.resolution_y
    cam.data.ortho_scale = max(max(xs) - min(xs), (max(ys) - min(ys)) * asp) * 1.12
    cam.location = cen - fwd * 40
    cam.data.clip_end = 100
    sc.camera = cam
    try:
        r.engine = "BLENDER_WORKBENCH"
    except TypeError as e:
        print("motor:", e)
    sh = sc.display.shading
    sh.light = "FLAT"      # colores exactos de la paleta; la forma la dan cavidad y contorno
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


def leer_args():
    etapa = globals().get("ETAPA") or ETAPAS[-1]
    exportar = globals().get("EXPORTAR", True)
    if "--" in sys.argv:
        a = sys.argv[sys.argv.index("--") + 1:]
        if "--etapa" in a:
            etapa = a[a.index("--etapa") + 1]
        if "--sin-exportar" in a:
            exportar = False
    return etapa, exportar


def main():
    etapa, exportar = leer_args()
    n = ETAPAS.index(etapa)
    sc = preparar_escena()
    vl = sc.view_layers[0]
    col = coleccion(sc, "Avioneta")
    fijas = [fuselaje(col, con_puerta=n >= ETAPAS.index("puerta"))]
    moviles = []
    if n >= 1:
        fijas += [ala(col), montantes(col)]
    if n >= 2:
        fijas.append(cola(col))
    if n >= 3:
        moviles.append(helice(col))
    if n >= 4:
        fijas.append(tren(col))
    if n >= 5:
        moviles += [puerta(col), interior(col)]
    if n >= 6:
        fijas += [estribo(col), asiento(col)]
    vl.update()
    info = {"etapa": etapa}
    if n == len(ETAPAS) - 1:
        cuerpo = unir(fijas, "Cuerpo", col, vl)
        cg = centro_masa(cuerpo)
        cg.x = 0.0                                   # simétrica en X
        raiz = bpy.data.objects.new("Avioneta", None)
        col.objects.link(raiz)
        for o in [cuerpo] + moviles:
            o.parent = raiz
            o.location -= cg
        vl.update()
        dg = vl.depsgraph
        tri = {o.name: triangulos(o, dg) for o in [cuerpo] + moviles}
        info.update(triangulos=tri, total=sum(tri.values()),
                    centro_masa=[round(c, 3) for c in cg], suelo_z=round(-cg.z, 3))
        if exportar:
            os.makedirs(SALIDA, exist_ok=True)
            exportar_glb(sc, raiz, os.path.join(SALIDA, NOMBRE + ".glb"))
            vista_previa(sc, col, os.path.join(SALIDA, NOMBRE + ".png"))
            info["exportado"] = SALIDA
    else:
        vl.update()
        dg = vl.depsgraph
        info["triangulos"] = sum(triangulos(o, dg) for o in fijas + moviles)
    print("AVIONETA", info)
    return info


RESULTADO = main()
