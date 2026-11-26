"""
instrumentos.py — Cuerpos pre-renderizados de los instrumentos de la mesa (lámina caída libre).

Regenerar (plantilla/modelos/mesa/*.webp):
    blender -b --factory-startup -P plantilla/modelos/mesa/fuentes/instrumentos.py
Opción: -- --solo crono|velo|alti|altia|registrador

Misma técnica que la lámpara (mesa.py): Cycles + contorno Freestyle, fondo transparente, metal con reflejos
de una caja de luz. Cada render ocupa EXACTAMENTE el viewBox del SVG del instrumento (1 unidad = 1 cm), así
que en la página va como <image> en (0, 0) y encima se dibujan agujas, números y LCD animados.
Sin agujas ni números aquí: solo cuerpo, bisel, cristal vacío y carátula lisa.
"""
import bpy, bmesh, os, sys, tempfile
from math import radians, sin, cos, pi
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(AQUI, "mesa.py"), encoding="utf8").read().replace("\nmain()\n", "\n")
G = {"__file__": os.path.join(AQUI, "mesa.py"), "__name__": "mesa_lib"}
exec(compile(src, "mesa.py", "exec"), G)
material, caja_bm, cilindro, tubo, preparar, renderiza, a_webp, px = (G[k] for k in
    ("material", "caja_bm", "cilindro", "tubo", "preparar", "renderiza", "a_webp", "px"))
G["PALETA"].update({"esfera": "F7F5EF", "caratula": "17181D", "caucho": "24262D", "lcd": "C9DCC2",
                    "lcd_marco": "0A0B0D", "azul_aparato": "3D6FCB", "rojo": "D9694F", "negro": "1A1B20"})
SALIDA = os.path.dirname(AQUI)
ESCALA = 3                                                  # render a 3× del viewBox (nítido en pantallas densas)


def luces(sc, col):
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.35, 0.37, 0.42, 1); bg.inputs["Strength"].default_value = 1.5
    sc.objects["Sol"].data.energy = 2.0
    caja = bpy.data.objects.new("Softbox", bpy.data.lights.new("Softbox", "AREA")); col.objects.link(caja)
    caja.data.energy = 60; caja.data.size = 1.2; caja.location = (-0.6, 0.6, 2.2)
    caja.rotation_euler = (radians(-22), radians(-18), 0)
    sc.render.line_thickness = 1.0


def cam(col, w, h):
    G["camara"](col, px(w / 2, h / 2, 0), w * .01, h * .01)


def biselar(ob, ancho, seg=4):
    m = ob.modifiers.new("Bisel", "BEVEL"); m.width = ancho; m.segments = seg; m.limit_method = "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def toro(c, mayor, menor, mat, col, nombre):
    bpy.ops.mesh.primitive_torus_add(major_radius=mayor, minor_radius=menor, major_segments=96, minor_segments=16, location=c)
    ob = bpy.context.active_object; ob.name = nombre
    for cc in ob.users_collection: cc.objects.unlink(ob)
    col.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob


def moleteado(c, r, alto, mat, col, nombre, n=56):
    """Corona moleteada: cilindro de canto estriado (eje en y de la imagen)."""
    bm = bmesh.new()
    a0, a1 = [], []
    for i in range(n):
        ang = 2 * pi * i / n; rr = r if i % 2 else r * 0.88
        a0.append(bm.verts.new((rr * cos(ang), -alto / 2, rr * sin(ang))))
        a1.append(bm.verts.new((rr * cos(ang), alto / 2, rr * sin(ang))))
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((a0[i], a0[j], a1[j], a1[i]))
    bm.faces.new(a0[::-1]); bm.faces.new(a1)
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); ob.location = c; col.objects.link(ob); ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------- cronómetro (viewBox 160 × 190, esfera en 80, 106)
def crono(col):
    met, metO = material("cromo", .22, .95), material("cromo_oscuro", .3, .9)
    esf = material("esfera", .5)
    biselar(cilindro(px(80, 106, .07), .77, .14, met, col, "Caja", 96), .03)
    toro(px(80, 106, .15), .70, .025, metO, col, "Bisel")
    cilindro(px(80, 106, .15), .675, .012, esf, col, "Esfera", 96)
    for ang in (-40, 40):                                    # pulsadores laterales
        x, y = 80 + 82 * sin(radians(ang)), 106 - 82 * cos(radians(ang))
        p = biselar(cilindro(px(x, y, .08), .06, .14, met, col, "Pulsador", 32), .01)
        p.rotation_euler = (radians(90), 0, radians(-ang)); p.location = px(x, y, .08)
    corona = [biselar(cilindro(px(80, 28, .08), .1, .14, met, col, "Tallo", 32), .01),
              moleteado(px(80, 15, .08), .2, .13, met, col, "Corona"),
              toro(px(80, 5, .08), .085, .022, met, col, "Argolla")]
    corona[0].rotation_euler = (radians(90), 0, 0)
    cam(col, 160, 190)
    return corona


# ---------------------------------------------------------------- velocímetro (160 × 190, esfera en 80, 98)
def velo(col):
    carc, met = material("negro", .4), material("cromo", .22, .95)
    biselar(cilindro(px(80, 98, .08), .78, .16, carc, col, "Caja", 96), .04)
    toro(px(80, 98, .17), .705, .035, met, col, "AroCromo")
    cilindro(px(80, 98, .165), .66, .01, material("caratula", .55), col, "Caratula", 96)
    for i, a in enumerate((-.78 * 2.4, .78 * 2.4, 3.14)):    # tornillos del bisel
        x, y = 80 + 74 * sin(a), 98 - 74 * cos(a)
        biselar(cilindro(px(x, y, .18), .032, .04, met, col, "Tornillo", 24), .006)
        caja_bm(px(x, y, .205), (.045, .008, .01), material("tinta", .5), col, "Ranura").rotation_euler = (0, 0, .4 + i)
    cam(col, 160, 190)


# ---------------------------------------------------------------- altímetro digital de muñeca (160 × 200)
def alti(col):
    carc, menta, met = material("negro", .4), material("menta", .35), material("cromo", .25, .9)
    cau = material("caucho", .8)
    for y in (25, 175):                                      # correa arriba y abajo
        biselar(caja_bm(px(80, y, .03), (.54, .52, .06), cau, col, "Correa", 0), .05)
    biselar(caja_bm(px(80, 98, .1), (1.2, 1.28, .2), carc, col, "Caja", 0), .30, 6)
    biselar(caja_bm(px(80, 98, .2), (1.1, 1.18, .02), menta, col, "Bisel", 0), .26, 6)
    biselar(caja_bm(px(80, 98, .21), (1.0, 1.08, .02), carc, col, "Marco", 0), .22, 6)
    caja_bm(px(80, 88, .225), (.92, .76, .012), material("lcd_marco", .5), col, "MarcoLCD", 0)
    caja_bm(px(80, 88, .232), (.86, .70, .004), material("lcd", .35), col, "LCD", 0)
    for x in (16, 144):
        for y in (66, 124):
            biselar(caja_bm(px(x, y, .1), (.09, .18, .1), met, col, "Boton", 0), .02)
    cam(col, 160, 200)


# ---------------------------------------------------------------- altímetro analógico de paracaidista (160 × 160)
def altia(col):
    cau, met, carc = material("caucho", .8), material("cromo", .22, .95), material("negro", .45)
    biselar(caja_bm(px(80, 80, .03), (1.6, .44, .05), cau, col, "Elastico", 0), .03)
    for x in (12, 148):                                      # costuras menta del elástico
        caja_bm(px(x, 80, .058), (.02, .4, .004), material("menta", .4), col, "Costura", 0)
    biselar(cilindro(px(80, 80, .1), .70, .16, carc, col, "Caja", 96), .04)
    toro(px(80, 80, .19), .63, .03, met, col, "Bisel")
    cilindro(px(80, 80, .185), .58, .01, material("esfera", .5), col, "Esfera", 96)
    p = biselar(cilindro(px(151, 80, .1), .05, .1, met, col, "Perilla", 32), .01)
    p.rotation_euler = (0, radians(90), 0)
    cam(col, 160, 160)


# ---------------------------------------------------------------- registrador de cinta (140 × 90; la cinta sale en 132, 50)
def registrador(col):
    azul, met, neg = material("azul_aparato", .45), material("cromo", .25, .9), material("negro", .5)
    biselar(caja_bm(px(70, 50, .09), (1.2, .62, .18), azul, col, "Base", 0), .04)
    cilindro(px(55, 50, .19), .15, .02, neg, col, "DiscoCarbon", 64)
    cilindro(px(55, 50, .205), .03, .02, met, col, "Eje", 24)
    biselar(caja_bm(px(104, 40, .25), (.22, .2, .14), material("coral", .4), col, "Bobina", 0), .02)
    tubo([Vector(px(100, 42, .30)), Vector(px(62, 50, .23))], .012, met, col, "Brazo")
    cilindro(px(60, 50, .23), .018, .03, met, col, "Punta", 16)
    for x, m in ((24, "rojo"), (24, "negro")):
        pass
    biselar(cilindro(px(24, 34, .22), .05, .08, material("rojo", .4), col, "BorneRojo", 24), .01)
    biselar(cilindro(px(24, 66, .22), .05, .08, neg, col, "BorneNegro", 24), .01)
    for y in (43, 57):                                       # guía de la cinta
        biselar(cilindro(px(124, y, .22), .025, .08, met, col, "Guia", 16), .005)
    caja_bm(px(118, 50, .19), (.24, .1, .01), material("esfera", .6), col, "CintaDentro", 0)
    cam(col, 140, 90)


PIEZAS = {"crono": (crono, 160, 190), "velo": (velo, 160, 190), "alti": (alti, 160, 200),
          "altia": (altia, 160, 160), "registrador": (registrador, 140, 90)}


def main():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    solo = a[a.index("--solo") + 1] if "--solo" in a else None
    info, tmp = {}, tempfile.gettempdir()
    for nombre, (fn, w, h) in PIEZAS.items():
        if solo and solo != nombre:
            continue
        sc, col = preparar(nombre); luces(sc, col)
        aparte = fn(col)
        if aparte:                                           # cronómetro: la corona va en su propia capa (se hunde)
            for o in aparte: o.hide_render = True
        png = os.path.join(tmp, f"inst-{nombre}.png")
        renderiza(sc, w * ESCALA, h * ESCALA, png)
        info[nombre] = a_webp(png, os.path.join(SALIDA, f"inst-{nombre}.webp"), 80)
        if aparte:
            for o in col.objects:
                if o.type == "MESH": o.hide_render = o not in aparte
            png = os.path.join(tmp, f"inst-{nombre}-corona.png")
            renderiza(sc, w * ESCALA, h * ESCALA, png)
            info[nombre + "-corona"] = a_webp(png, os.path.join(SALIDA, f"inst-{nombre}-corona.webp"), 80)
    print("INSTRUMENTOS", info)


main()
