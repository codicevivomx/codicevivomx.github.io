"""
paracaidas.py — Fuente de verdad del modelo «paracaídas» (lámina caída libre · El salto).

Regenerar (modelo + paracaidas.glb + paracaidas.png):
    blender -b --factory-startup -P plantilla/modelos/caida-libre/fuentes/paracaidas.py
Opción: -- --sin-exportar

Vela rectangular de 9 celdas en arco con cuerdas A/B/C, bandas y mandos con líneas de freno.
- Origen = punto de enganche: se cuelga del hueso «enganche» de la paracaidista o del tándem
  sin desplazamiento (en three.js: enganche.add(vela), alineada al cuerpo).
- Colores de las celdas en tres materiales «vela_1», «vela_2», «vela_3» (menta, blanco, coral):
  three.js los recolorea por nombre para distinguir los dos paracaídas de la escena.
- Acción «abrir» (1.5 s) con morph targets: bolsa cerrada → cuerdas estiradas con la vela plegada
  (0.5 s) → vela inflada (1.5 s). Sin la acción, la malla está inflada.
"""
import bpy, os, sys, importlib, math
from math import radians, sin, cos, pi
from mathutils import Vector

sys.dont_write_bytecode = True
try:
    AQUI = os.path.dirname(os.path.abspath(__file__))
except NameError:
    AQUI = os.getcwd()
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)
import persona
importlib.reload(persona)

SALIDA = os.path.dirname(AQUI)
NOMBRE = "paracaidas"

R = 3.4                 # radio del arco = largo de las cuerdas hasta la cara inferior (m)
PHI = radians(40)       # medio ángulo del arco → envergadura ≈ 4.4 m
CELDAS, SUB = 9, 3      # celdas y tramos por celda (para la almohadilla)
Y_BA, Y_BS = -1.15, 0.75    # borde de ataque (al frente, -Y) y borde de salida: cuerda 1.9 m
T = 0.30                # espesor máximo del perfil
# Perfil (u: 0 = borde de ataque, 1 = borde de salida; t: espesor relativo), de la salida por arriba
# hasta el frente y de vuelta por abajo. La cara entre el índice 6 y 7 es la boca de las celdas.
PERFIL = [(1.0, 0.0), (0.80, 0.32), (0.55, 0.66), (0.30, 0.92), (0.13, 1.0), (0.04, 0.88), (0.0, 0.62),
          (0.015, 0.22), (0.12, 0.06), (0.35, 0.0), (0.65, 0.0), (0.85, 0.0)]
BOCA = 6
PATRON = ["vela_3", "vela_2", "vela_1", "vela_2", "vela_1", "vela_2", "vela_1", "vela_2", "vela_3"]
SIN_PESO = lambda p: {}


def leer_args():
    exportar = globals().get("EXPORTAR", True)
    if "--" in sys.argv and "--sin-exportar" in sys.argv[sys.argv.index("--"):]:
        exportar = False
    return exportar


def punto(phi, u, t, dt=0.0):
    r = R + t * T + dt
    return Vector((r * sin(phi), Y_BA + u * (Y_BS - Y_BA), r * cos(phi)))


DESTINO = {}   # vértice → posición en el estado «lineas» (0.5 s), definida al construir cada pieza


def vd(P, reposo, haz_pos):
    v = P.v(Vector(reposo), {})
    DESTINO[v] = Vector(haz_pos)
    return v


LARGO_HAZ = 1.1


def haz(phi, u, t):
    """Vela plegada a los 0.5 s: un haz vertical largo y delgado en lo alto de las cuerdas
    (1.1 m de largo, 24 cm de ancho, 40 cm de fondo). La envergadura se pliega a lo largo del haz."""
    return Vector((0.12 * phi / PHI,
                   -0.2 + (u - 0.5) * 0.4 + t * 0.05,
                   (R + T) - abs(phi) / PHI * LARGO_HAZ + (t - 0.5) * 0.06))


def base_haz(phi, u):
    """Punta superior de las cuerdas a los 0.5 s: la base del haz (si subieran a lo largo, lo taparían)."""
    return Vector((0.10 * phi / PHI, -0.2 + (u - 0.5) * 0.3, (R + T) - LARGO_HAZ - 0.06))


def vela(P):
    n = CELDAS * SUB
    secciones = []
    for j in range(n + 1):
        phi = -PHI + 2 * PHI * j / n
        b = sin(pi * (j % SUB) / SUB)          # 0 en las costillas, 1 a media celda: almohadilla
        anillo = []
        for u, t in PERFIL:
            # Abombado arriba 3 cm (con más, el toon deja manchas de sombra en las celdas blancas).
            dt = b * (0.03 if t > 0.5 else (-0.03 if t < 0.1 else 0.015))
            anillo.append(vd(P, punto(phi, u, t, dt), haz(phi, u, t)))
        secciones.append(anillo)
    m = len(PERFIL)
    for j in range(n):
        color = PATRON[j // SUB]
        for k in range(m):
            kk = (k + 1) % m
            P.f([secciones[j][k], secciones[j][kk], secciones[j + 1][kk], secciones[j + 1][k]],
                "boca" if k == BOCA else color)
    P.f(secciones[0][::-1], PATRON[0])          # costados (estabilizadores)
    P.f(secciones[-1], PATRON[-1])


def cuerda(P, a, b, r, n, a2=None, b2=None):
    """Cuerda recta de a a b; en el estado «lineas» va de a2 a b2 (por defecto, las mismas puntas)."""
    a, b = Vector(a), Vector(b)
    a2, b2 = Vector(a2) if a2 is not None else a, Vector(b2) if b2 is not None else b

    def marco(p, q):
        d = (q - p).normalized()
        ref = persona.Z if abs(d.z) < 0.9 else persona.X
        ex = (ref - d * ref.dot(d)).normalized()
        return ex, d.cross(ex)

    (ex, ey), (ex2, ey2) = marco(a, b), marco(a2, b2)
    r0, r1 = [], []
    for i in range(n):
        ca, sa = cos(2 * pi * i / n) * r, sin(2 * pi * i / n) * r
        o, o2 = ex * ca + ey * sa, ex2 * ca + ey2 * sa
        r0.append(vd(P, a + o, a2 + o2))
        r1.append(vd(P, b + o, b2 + o2))
    persona.loft(P, [r0, r1], "cuerda")
    for ring, punta, punta2 in ((r0, a, a2), (r1, b, b2)):
        v = vd(P, punta, punta2)
        for i in range(n):
            P.f([ring[i], ring[(i + 1) % n], v], "cuerda")


def aparejo(P):
    """Cuerdas A/B/C de cada costilla a las bandas, bandas al enganche, frenos a los mandos.
    En el estado «lineas» las cuerdas van rectas de las bandas al haz."""
    for lado in (1, -1):
        base = Vector((lado * 0.085, -0.02, 0.03))               # salidas de las bandas en la mochila
        frente, atras = Vector((lado * 0.15, -0.10, 0.60)), Vector((lado * 0.15, 0.05, 0.60))
        for destino in (frente, atras):
            cuerda(P, base, destino, .013, 4)
        mando = Vector((lado * 0.30, -0.30, 0.55))               # a la altura de las manos (pose vertical)
        persona_caja(P, mando, (0.035, 0.05, 0.09))
        for c in range(CELDAS + 1):
            phi = -PHI + 2 * PHI * c / CELDAS
            if (phi > 0) != (lado > 0):
                continue
            for u, t, conf in ((0.12, 0.06, frente), (0.40, 0.0, frente), (0.70, 0.0, atras)):
                cuerda(P, punto(phi, u, t), conf, .007, 3, base_haz(phi, u))
            if c in (0, 2, 7, 9):                                 # líneas de freno desde el borde de salida
                cuerda(P, punto(phi, 1.0, 0.0), mando, .006, 3, base_haz(phi, 1.0))


def persona_caja(P, c, t):
    """Mando: cajita redondeada (8 vértices)."""
    c = Vector(c)
    hx, hy, hz = t[0] / 2, t[1] / 2, t[2] / 2
    v = [vd(P, c + Vector((sx * hx, sy * hy, sz * hz)), c + Vector((sx * hx, sy * hy, sz * hz)))
         for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        P.f([v[k] for k in q], "gris_oscuro")
    return v


def estados(ob, destinos):
    """Morph targets: «bolsa» (todo dentro de la bolsa sobre la mochila) y «lineas» (cuerdas
    estiradas, vela plegada en un haz vertical; destinos por vértice, en orden de la malla)."""
    me = ob.data
    ob.shape_key_add(name="Basis", from_mix=False)
    kb_b = ob.shape_key_add(name="bolsa", from_mix=False)
    kb_l = ob.shape_key_add(name="lineas", from_mix=False)
    cos_ = [v.co.copy() for v in me.vertices]
    mn = Vector((min(c.x for c in cos_), min(c.y for c in cos_), min(c.z for c in cos_)))
    mx = Vector((max(c.x for c in cos_), max(c.y for c in cos_), max(c.z for c in cos_)))
    tam = mx - mn
    bolsa_c, bolsa_t = Vector((0, 0.04, 0.11)), Vector((0.30, 0.18, 0.16))
    for i, c in enumerate(cos_):
        rel = Vector(((c.x - mn.x) / tam.x - .5, (c.y - mn.y) / tam.y - .5, (c.z - mn.z) / tam.z - .5))
        kb_b.data[i].co = bolsa_c + Vector((rel.x * bolsa_t.x, rel.y * bolsa_t.y, rel.z * bolsa_t.z))
        kb_l.data[i].co = destinos[i]
    return kb_b, kb_l


def accion_abrir(ob, kb_b, kb_l):
    key = ob.data.shape_keys
    ad = key.animation_data or key.animation_data_create()
    act = bpy.data.actions.get("abrir")
    if act:
        bpy.data.actions.remove(act)
    act = bpy.data.actions.new("abrir")
    ad.action = act
    for f, vb, vl in ((0, 1.0, 0.0), (12, 0.0, 1.0), (36, 0.0, 0.0)):   # 24 fps: 0 s, 0.5 s, 1.5 s
        kb_b.value, kb_l.value = vb, vl
        kb_b.keyframe_insert("value", frame=f)
        kb_l.keyframe_insert("value", frame=f)
    for fc in persona.curvas(act, ad):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    kb_b.value = kb_l.value = 0.0
    return act


def main():
    exportar = leer_args()
    sc = persona.preparar_escena("Paracaidas")
    sc.render.fps = 24
    vl = sc.view_layers[0]
    col = persona.coleccion(sc, "Paracaidas")
    P = persona.Pieza([])
    DESTINO.clear()
    vela(P)
    aparejo(P)
    destinos = [DESTINO[v] for v in P.bm.verts]   # mismo orden que los vértices de la malla
    ob = P.objeto("Paracaidas_malla", col, suave=35)
    # La tela se dibuja por las dos caras: al plegarse (bolsa, haz) parte de la vela queda de espaldas
    # y, de una sola cara, se asomaría el contorno de tinta. glTF: doubleSided en estos materiales.
    for n in ("vela_1", "vela_2", "vela_3", "boca"):
        bpy.data.materials[n].use_backface_culling = False
    kb_b, kb_l = estados(ob, destinos)
    accion_abrir(ob, kb_b, kb_l)
    raiz = bpy.data.objects.new("Paracaidas", None)
    col.objects.link(raiz)
    ob.parent = raiz

    vl.update()
    info = {"triangulos": persona.triangulos(ob, vl.depsgraph),
            "envergadura": round(2 * (R + T) * sin(PHI), 2), "alto": round(R + T, 2)}
    if exportar:
        persona.exportar_glb(sc, raiz, os.path.join(SALIDA, NOMBRE + ".glb"))
    # Secuencia de apertura lado a lado: 0 s, 0.5 s, 1 s, 1.5 s (copias de revisión: no se exportan).
    copias = []
    vista = persona.coleccion(sc, "Paracaidas_vista")
    for k, (vb, vlin) in enumerate(((1, 0), (0, 1), (0, 0.5), (0, 0))):
        m2 = ob.copy()
        m2.data = ob.data.copy()
        m2.parent = None
        m2.location = (6.0 + k * 5.0, 0, 0)
        vista.objects.link(m2)
        m2.data.shape_keys.animation_data_clear()
        m2.data.shape_keys.key_blocks["bolsa"].value = vb
        m2.data.shape_keys.key_blocks["lineas"].value = vlin
        copias.append(m2)
    if exportar:
        ob.hide_render = True
        persona.vista_previa(sc, copias, os.path.join(SALIDA, NOMBRE + ".png"))
        ob.hide_render = False
        info["exportado"] = SALIDA
    print("PARACAIDAS", info)
    return info


RESULTADO = main()
