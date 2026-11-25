"""
mesa.py — Fuente de verdad de los objetos pre-renderizados de la mesa del taller (lámina caída libre).

Regenerar (lampara.webp + estuche.webp en plantilla/modelos/mesa/):
    blender -b --factory-startup -P plantilla/modelos/mesa/fuentes/mesa.py
Opciones (después de "--"):  --solo lampara | --solo estuche   ·   --calidad 80

Vista cenital (la mesa de la lámina es recta), luz de estudio arriba a la izquierda, sombra suave sobre
fondo transparente (piso «shadow catcher»), contorno de tinta con Freestyle. Render al doble de la
resolución con la que se muestra (pantallas densas).

ESTUCHE: medidas en píxeles CSS del estuche a 1× (560 × 440); 1 px = 0.01 m de Blender. El CSS de la
lámina coloca cada instrumento SVG sobre su hueco con estas mismas medidas (HUECOS).
"""
import bpy, bmesh, math, os, sys, tempfile
from math import radians, sin, cos, pi
from mathutils import Vector

try:
    AQUI = os.path.dirname(os.path.abspath(__file__))
except NameError:
    AQUI = os.getcwd()
SALIDA = os.path.dirname(AQUI)

PALETA = {   # ya con la paleta viva de la lámina (OKLCH): estos renders no pasan por paleta.js
    "carcasa": "2B2D35", "carcasa_borde": "3A3D47", "espuma": "434856", "espuma_fondo": "565B69",
    "menta": "3FBF8C", "menta_oscuro": "2E9A6F", "coral": "F0644A", "coral_oscuro": "C8492F",
    "cromo": "C9CED6", "cromo_oscuro": "8E94A0", "tinta": "22212B", "crema": "FFF4D6", "foco": "FFF8E0",
}
W, H = 560, 440                     # estuche a 1× (px CSS)
# Huecos (centro x, centro y, forma): cronómetro, velocímetro, altímetro, regla y lápiz.
HUECOS = {
    "crono": ("circulo", 114, 214, 76), "crono_corona": ("caja", 114, 128, 34, 26),
    "velo": ("circulo", 286, 214, 78),
    "alti": ("caja", 458, 208, 106, 118), "alti_correa_a": ("caja", 458, 130, 60, 46), "alti_correa_b": ("caja", 458, 286, 60, 46),
    "regla": ("caja", 280, 352, 492, 30), "lapiz": ("caja", 280, 394, 300, 22),
}


def lineal(h):
    out = []
    for k in (0, 2, 4):
        c = int(h[k:k + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def material(nombre, rugosidad=0.6, metal=0.0, emision=0.0):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col = (*lineal(PALETA[nombre]), 1)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rugosidad
    b.inputs["Metallic"].default_value = metal
    if emision:
        b.inputs["Emission Color"].default_value = col
        b.inputs["Emission Strength"].default_value = emision
    return m


def px(x, y, z=0.0):
    return Vector((x * 0.01, -y * 0.01, z))


def caja_bm(c, t, mat, col, nombre, bisel=0.0, seg=3, suave=True):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * t[0], v.co.y * t[1], v.co.z * t[2]))
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); ob.location = c; col.objects.link(ob)
    ob.data.materials.append(mat)
    if bisel:
        m = ob.modifiers.new("Bisel", "BEVEL"); m.width = bisel; m.segments = seg; m.limit_method = "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = suave
    return ob


def cilindro(c, r, alto, mat, col, nombre, n=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=alto, location=c)
    ob = bpy.context.active_object; ob.name = nombre
    for cc in ob.users_collection:
        cc.objects.unlink(ob)
    col.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def restar(ob, cortes):
    for k in cortes:
        m = ob.modifiers.new("Hueco", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = k; m.solver = "EXACT"
        k.hide_render = True; k.display_type = "WIRE"
    # La resta deja una cara n-gonal enorme con los huecos «dentro»; sin triangular, Cycles la tapa en negro.
    ob.modifiers.new("Triangular", "TRIANGULATE").ngon_method = "CLIP"


def tubo(puntos, r, mat, col, nombre, n=10):
    """Tubo por una polilínea (resortes, varillas, cable)."""
    cu = bpy.data.curves.new(nombre, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 3
    sp = cu.splines.new("POLY"); sp.points.add(len(puntos) - 1)
    for p, q in zip(sp.points, puntos):
        p.co = (q.x, q.y, q.z, 1)
    ob = bpy.data.objects.new(nombre, cu); col.objects.link(ob); ob.data.materials.append(mat)
    return ob


def resorte(a, b, r, vueltas, alambre, mat, col, nombre):
    a, b = Vector(a), Vector(b)
    d = (b - a); L = d.length; d.normalize()
    ex = d.cross(Vector((0, 0, 1)));  ex = ex.normalized() if ex.length > 1e-4 else Vector((1, 0, 0))
    ey = d.cross(ex)
    pts = []
    for k in range(vueltas * 16 + 1):
        t = k / (vueltas * 16)
        ang = 2 * pi * vueltas * t
        pts.append(a + d * (L * t) + ex * (r * cos(ang)) + ey * (r * sin(ang)))
    return tubo(pts, alambre, mat, col, nombre, 6)


# ---------------------------------------------------------------- escena, luz y render
def preparar(nombre):
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sc.name = nombre
    col = bpy.data.collections.new(nombre); sc.collection.children.link(col)
    r = sc.render
    try:
        r.engine = "CYCLES"
    except TypeError as e:
        print("motor:", e)
    sc.cycles.samples = 64; sc.cycles.use_denoising = True
    sc.cycles.device = "CPU"
    r.film_transparent = True
    try:
        sc.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    sc.world = sc.world or bpy.data.worlds.new("Mundo")
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.82, 0.84, 0.88, 1); bg.inputs["Strength"].default_value = 0.55
    # Luz de estudio arriba a la izquierda: sombras suaves hacia abajo a la derecha (como en la lámina).
    sol = bpy.data.objects.new("Sol", bpy.data.lights.new("Sol", "SUN")); col.objects.link(sol)
    sol.data.energy = 3.2; sol.data.angle = radians(14)
    sol.rotation_euler = (radians(24), radians(-18), radians(-40))   # alto: sombras cortas, hacia abajo a la derecha
    # Contorno de tinta (Freestyle), 2 px a 2× = 1 px CSS.
    r.use_freestyle = True; r.line_thickness_mode = "ABSOLUTE"; r.line_thickness = 1.3
    ls = sc.view_layers[0].freestyle_settings.linesets[0]
    ls.linestyle.color = lineal(PALETA["tinta"])
    ls.select_by_visibility = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    return sc, col


def piso_sombra(col, c, t):
    ob = caja_bm(c, (t[0], t[1], 0.01), material("crema"), col, "Piso")
    ob.is_shadow_catcher = True
    return ob


def camara(col, centro, ancho_m, alto_m, inclinacion=0.0):
    cam = bpy.data.objects.new("Camara", bpy.data.cameras.new("Camara")); col.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = max(ancho_m, alto_m)
    cam.location = Vector(centro) + Vector((0, -10 * sin(radians(inclinacion)), 10 * cos(radians(inclinacion))))
    cam.rotation_euler = (radians(inclinacion), 0, 0)
    cam.data.clip_end = 40
    bpy.context.scene.camera = cam
    return cam


def renderiza(sc, ancho_px, alto_px, ruta_png):
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = ancho_px, alto_px, 100
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"
    r.filepath = ruta_png
    bpy.ops.render.render(write_still=True)


def a_webp(ruta_png, ruta_webp, calidad):
    img = bpy.data.images.load(ruta_png)
    sc = bpy.context.scene
    sc.render.image_settings.file_format = "WEBP"; sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = calidad
    img.save_render(ruta_webp, scene=sc)
    return os.path.getsize(ruta_webp)


# ---------------------------------------------------------------- estuche
def estuche(col):
    m_carc, m_borde = material("carcasa", .45), material("carcasa_borde", .5)
    m_esp, m_fondo = material("espuma", .95), material("espuma_fondo", .95)
    m_menta, m_cromo = material("menta", .4), material("cromo", .25, .8)
    x0, y0, x1, y1 = 14, 34, 546, 426
    cx, cy, w, h = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0), (y1 - y0)
    carc = caja_bm(px(cx, cy, 0.22), (w * .01, h * .01, 0.44), m_carc, col, "Carcasa", bisel=0.07, seg=4)
    hueco = caja_bm(px(cx, cy, 0.40), ((w - 18) * .01, (h - 18) * .01, 0.5), m_borde, col, "HuecoCarcasa", bisel=0.03)
    restar(carc, [hueco])
    for p in carc.data.polygons:
        p.use_smooth = False                                         # carcasa vacía: paredes con grosor visible
    esp = caja_bm(px(cx, cy, 0.25), ((w - 20) * .01, (h - 20) * .01, 0.24), m_esp, col, "Espuma", bisel=0.015, seg=2, suave=False)
    cortes = []
    for nombre, hh in HUECOS.items():
        if hh[0] == "circulo":
            _, x, y, r = hh
            cortes.append(cilindro(px(x, y, 0.33), r * .01, 0.3, m_fondo, col, "c_" + nombre, 64))
        else:
            _, x, y, a, b = hh
            k = caja_bm(px(x, y, 0.33), (a * .01, b * .01, 0.3), m_fondo, col, "c_" + nombre, bisel=0.06 if nombre.startswith("alti") else 0.02)
            cortes.append(k)
    restar(esp, cortes)
    # (el fondo de cada hueco es la misma espuma; una placa aparte quedaba coplanar con él y lo dejaba negro)
    # bisagras (arriba: la tapa va abatida hacia atrás) y broches menta (abajo)
    for x in (110, 280, 450):
        cilindro(px(x, y0 - 2, 0.40), 0.05, 0.9, m_cromo, col, "Bisagra").rotation_euler = (0, radians(90), 0)
        caja_bm(px(x, y0 + 4, 0.44), (1.0, 0.1, 0.02), m_cromo, col, "Placa")
    for x in (150, 410):
        caja_bm(px(x, y1 - 2, 0.30), (0.6, 0.14, 0.22), m_menta, col, "Broche", bisel=0.03)
        caja_bm(px(x, y1 - 10, 0.43), (0.36, 0.1, 0.04), m_cromo, col, "Pestillo", bisel=0.01)
    hornear([carc, esp])
    piso_sombra(col, px(W / 2, H / 2, 0.0), (W * .01 + 2, H * .01 + 2))
    camara(col, px(W / 2, H / 2, 0.0), W * .01, H * .01)
    return carc


def hornear(objetos):
    """Aplica las restas (malla definitiva) y borra los cortadores: así no queda nada oculto en el render."""
    dg = bpy.context.evaluated_depsgraph_get()
    cortes = set()
    for ob in objetos:
        cortes |= {m.object for m in ob.modifiers if m.type == "BOOLEAN"}
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear(); ob.data = me
        for p in me.polygons:
            p.use_smooth = False
    for k in cortes:
        bpy.data.objects.remove(k, do_unlink=True)


# ---------------------------------------------------------------- lámpara articulada
def lampara(col):
    m_cor, m_corO = material("coral", .35), material("coral_oscuro", .4)
    m_cromo, m_tinta = material("cromo", .3, .35), material("tinta", .5)
    m_crema, m_foco = material("crema", .6), material("foco", .3, 0, 6.0)
    m_res = material("cromo_oscuro", .35, .2)                     # resortes: acero claro, no espejo oscuro
    # base con peso
    cilindro((0.55, -1.55, 0.06), 0.42, 0.12, m_cor, col, "Base", 64)
    cilindro((0.55, -1.55, 0.14), 0.30, 0.06, m_corO, col, "BaseTapa", 64)
    cilindro((0.55, -1.55, 0.22), 0.07, 0.16, m_tinta, col, "Pivote")
    A, B, Cb = Vector((0.55, -1.55, 0.3)), Vector((1.35, -0.95, 1.55)), Vector((2.35, -0.35, 1.25))
    # brazo inferior: dos varillas + resorte
    for off in (Vector((0.04, 0.05, 0)), Vector((-0.04, -0.05, 0))):
        tubo([A + off, B + off], 0.028, m_cor, col, "Varilla")
    resorte(A + Vector((0.12, -0.06, 0.08)), B + Vector((0.04, -0.12, -0.12)), 0.035, 14, 0.008, m_res, col, "Resorte1")
    # codo: bisagra con perilla
    cilindro(B, 0.075, 0.18, m_tinta, col, "Codo").rotation_euler = (radians(90), 0, radians(35))
    cilindro(B + Vector((0.07, -0.1, 0)), 0.045, 0.06, m_cromo, col, "Perilla").rotation_euler = (radians(90), 0, radians(35))
    # brazo superior + resorte
    for off in (Vector((0.03, 0.04, 0)), Vector((-0.03, -0.04, 0))):
        tubo([B + off, Cb + off], 0.025, m_cor, col, "Varilla2")
    resorte(B + Vector((0.1, -0.08, 0.05)), Cb + Vector((-0.12, -0.08, 0.04)), 0.03, 12, 0.007, m_res, col, "Resorte2")
    cilindro(Cb, 0.065, 0.16, m_tinta, col, "Cabeza").rotation_euler = (radians(90), 0, radians(30))
    # pantalla cónica: la boca mira hacia abajo y al frente (hacia la mesa y un poco a la cámara: se ve la bombilla)
    boca = Vector((0.35, -0.9, -0.18)).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.40, radius2=0.11, depth=0.52, end_fill_type="NOTHING",
                                    location=Cb + boca * 0.30)
    pant = bpy.context.active_object; pant.name = "Pantalla"
    for cc in pant.users_collection:
        cc.objects.unlink(pant)
    col.objects.link(pant)
    pant.rotation_mode = "QUATERNION"; pant.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(boca)
    so = pant.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.02; so.material_offset = 1   # por dentro: crema
    pant.data.materials.append(m_cor); pant.data.materials.append(m_crema)
    for p in pant.data.polygons:
        p.use_smooth = True
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.105, location=Cb + boca * 0.47)
    foco = bpy.context.active_object; foco.name = "Bombilla"
    for cc in foco.users_collection:
        cc.objects.unlink(foco)
    col.objects.link(foco); foco.data.materials.append(m_foco)
    # cable negro por el brazo
    tubo([A + Vector((-0.1, 0.08, -0.2)), A + Vector((-0.05, 0.1, 0.1)), (A + B) / 2 + Vector((-0.08, 0.1, 0)), B + Vector((-0.06, 0.08, 0))],
         0.012, m_tinta, col, "Cable")
    piso_sombra(col, (1.8, -1.0, 0.0), (8.0, 7.0))
    camara(col, (1.85, -0.85, 0.0), 3.9, 3.9, inclinacion=24)          # margen para que la sombra no se corte


def main():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    solo = a[a.index("--solo") + 1] if "--solo" in a else None
    calidad = int(a[a.index("--calidad") + 1]) if "--calidad" in a else 80
    info = {}
    if solo in (None, "estuche"):
        sc, col = preparar("Estuche"); estuche(col)
        png = os.path.join(tempfile.gettempdir(), "mesa-estuche.png")
        renderiza(sc, W * 2, H * 2, png)
        info["estuche"] = a_webp(png, os.path.join(SALIDA, "estuche.webp"), calidad)
    if solo in (None, "lampara"):
        sc, col = preparar("Lampara"); lampara(col)
        png = os.path.join(tempfile.gettempdir(), "mesa-lampara.png")
        renderiza(sc, 520, 520, png)
        info["lampara"] = a_webp(png, os.path.join(SALIDA, "lampara.webp"), calidad)
    print("MESA", info)


main()
