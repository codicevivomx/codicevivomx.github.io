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
    "metal": "9AA0AA", "metal_oscuro": "5E636D",
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


# ---------------------------------------------------------------- estuche (hondo, con tapa abierta)
# Dos acomodos: «h» (PC, 560 × 440) y «v» (celular, 400 × 560, instrumentos más grandes). Medidas en px CSS
# de la caja a 1×; la tapa abierta asoma arriba TAPA px (la página la pone sobre la caja con un ::before).
TAPA = 180
LAYOUTS = {
    "h": (560, 440, {
        "crono": ("circulo", 114, 214, 76), "crono_corona": ("caja", 114, 128, 34, 26),
        "velo": ("circulo", 286, 214, 78),
        "alti": ("caja", 458, 208, 106, 118), "alti_correa_a": ("caja", 458, 130, 60, 46), "alti_correa_b": ("caja", 458, 286, 60, 46),
        "regla": ("caja", 280, 352, 492, 30), "lapiz": ("caja", 280, 394, 300, 22)}),
    "v": (400, 560, {
        "crono": ("circulo", 105, 140, 76), "crono_corona": ("caja", 105, 54, 34, 26),
        "velo": ("circulo", 295, 140, 78),
        "alti": ("caja", 150, 350, 106, 118), "alti_correa_a": ("caja", 150, 272, 60, 46), "alti_correa_b": ("caja", 150, 428, 60, 46),
        "regla": ("caja", 200, 486, 360, 30), "lapiz": ("caja", 200, 526, 260, 22)}),
}
ALTO, TOPE_ESPUMA, HONDO = 0.90, 0.80, 0.50        # carcasa, espuma y profundidad de los huecos (m; 1 px = 1 cm)


def espuma_ondulada(c, w, h, z, col, mat, n=(44, 34), amp=0.035, paso=0.36):
    """Espuma de huevera para la tapa: rejilla con ondas suaves."""
    bm = bmesh.new()
    nx, ny = n
    vs = [[bm.verts.new((c.x - w / 2 + w * i / nx, c.y - h / 2 + h * j / ny,
                         z + amp * sin(2 * pi * (w * i / nx) / paso) * sin(2 * pi * (h * j / ny) / paso)))
           for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    me = bpy.data.meshes.new("Huevera"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("Huevera", me); ob.data.materials.append(mat)
    # colección aparte, excluida del contorno (Freestyle rayaba cada onda)
    sinc = bpy.data.collections.new("SinContorno"); bpy.context.scene.collection.children.link(sinc); sinc.objects.link(ob)
    ls = bpy.context.scene.view_layers[0].freestyle_settings.linesets[0]
    ls.select_by_collection = True; ls.collection = sinc; ls.collection_negation = "EXCLUSIVE"
    for p in me.polygons:
        p.use_smooth = True
    return ob


def estuche(col, clave):
    W_, H_, huecos = LAYOUTS[clave]
    m_carc, m_borde = material("carcasa", .45), material("carcasa_borde", .5)
    m_esp, m_fondo = material("espuma", .95), material("espuma_fondo", .95)
    m_menta, m_cromo = material("menta", .4), material("cromo", .25, .8)
    x0, y0, x1, y1 = 14, 34, W_ - 14, H_ - 14
    cx, cy, w, h = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0), (y1 - y0)
    carc = caja_bm(px(cx, cy, ALTO / 2), (w * .01, h * .01, ALTO), m_carc, col, "Carcasa", bisel=0.07, seg=4)
    hueco = caja_bm(px(cx, cy, ALTO), ((w - 18) * .01, (h - 18) * .01, 2 * (ALTO - TOPE_ESPUMA + .6)), m_borde, col, "HuecoCarcasa", bisel=0.03)
    restar(carc, [hueco])
    esp_alto = 0.6
    esp = caja_bm(px(cx, cy, TOPE_ESPUMA - esp_alto / 2), ((w - 20) * .01, (h - 20) * .01, esp_alto), m_esp, col, "Espuma", bisel=0.015, seg=2, suave=False)
    cortes = []
    for nombre, hh in huecos.items():
        hondo = HONDO if nombre in ("crono", "velo", "alti", "crono_corona", "alti_correa_a", "alti_correa_b") else 0.3
        zc = TOPE_ESPUMA - hondo + 0.3
        if hh[0] == "circulo":
            _, x, y, r = hh
            cortes.append(cilindro(px(x, y, zc), r * .01, 0.6, m_fondo, col, "c_" + nombre, 72))
        else:
            _, x, y, a, b = hh
            cortes.append(caja_bm(px(x, y, zc), (a * .01, b * .01, 0.6), m_fondo, col, "c_" + nombre, bisel=0.06 if nombre.startswith("alti") else 0.02))
    restar(esp, cortes)
    for x in (cx - w * .3, cx, cx + w * .3):                     # bisagras arriba, broches menta abajo
        cilindro(px(x, y0 - 2, ALTO - .02), 0.055, 0.8, m_cromo, col, "Bisagra").rotation_euler = (0, radians(90), 0)
    for x in (cx - w * .25, cx + w * .25):
        caja_bm(px(x, y1 - 2, ALTO * .6), (0.6, 0.14, 0.3), m_menta, col, "Broche", bisel=0.03)
        caja_bm(px(x, y1 - 10, ALTO - .01), (0.36, 0.1, 0.04), m_cromo, col, "Pestillo", bisel=0.01)
    # Tapa: concha con espuma de huevera, abierta 110° sobre las bisagras (se ve su interior, en escorzo).
    bisagra = bpy.data.objects.new("Bisagra_eje", None); col.objects.link(bisagra)
    bisagra.location = px(cx, y0, ALTO)
    hl = h * .01                                                  # la tapa mide lo mismo que la caja
    tapa = caja_bm(Vector((0, hl / 2, -0.15)), (w * .01, hl, 0.30), m_carc, col, "Tapa", bisel=0.07, seg=4)
    th = caja_bm(Vector((0, hl / 2, 0.05)), ((w - 18) * .01, hl - .18, 0.5), m_borde, col, "HuecoTapa", bisel=0.03)
    th.parent = bisagra; tapa.parent = bisagra
    restar(tapa, [th])
    hue = espuma_ondulada(Vector((0, hl / 2, 0)), (w - 22) * .01, hl - .22, -0.1, col, m_esp)
    hue.parent = bisagra
    hornear([carc, esp, tapa])
    bisagra.rotation_euler = (radians(70), 0, 0)
    bpy.context.view_layer.update()
    alto_total = H_ + TAPA
    piso_sombra(col, px(W_ / 2, H_ / 2 - TAPA / 2, 0.0), (W_ * .01 + 4, alto_total * .01 + 4))
    camara(col, px(W_ / 2, (H_ - TAPA) / 2, 0.0), W_ * .01, alto_total * .01)
    return W_, alto_total


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


# ---------------------------------------------------------------- lámpara articulada (metal) y su charco de luz
# Encuadre 6.0 × 4.2 m (la página lo pone al ancho de la mesa): base arriba a la izquierda, brazo sobre la bandeja.
LAMP_W, LAMP_H = 6.0, 4.2


def lampara(col):
    m_met = material("metal", .28, .95)
    m_metO, m_tinta = material("metal_oscuro", .35, .9), material("tinta", .5)
    m_crema, m_foco = material("crema", .6), material("foco", .3, 0, 8.0)
    piezas = []
    def P(o):
        piezas.append(o); return o
    # Base ancha y pesada: cilindro grueso con canto y bisel, tapa escalonada y pivote.
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.58, depth=0.26, location=(0.9, -0.95, 0.13))
    base = P(bpy.context.active_object); base.name = "Base"
    for cc in base.users_collection: cc.objects.unlink(base)
    col.objects.link(base); base.data.materials.append(m_met)
    bv = base.modifiers.new("Bisel", "BEVEL"); bv.width = 0.05; bv.segments = 5; bv.limit_method = "ANGLE"
    for p in base.data.polygons: p.use_smooth = True
    P(cilindro((0.9, -0.95, 0.29), 0.36, 0.06, m_metO, col, "BaseTapa", 96))
    P(cilindro((0.9, -0.95, 0.40), 0.09, 0.22, m_tinta, col, "Pivote", 32))
    A, B, Cb = Vector((0.9, -0.95, 0.5)), Vector((2.0, -1.35, 1.85)), Vector((3.3, -1.75, 1.75))
    for off in (Vector((0.05, 0.06, 0)), Vector((-0.05, -0.06, 0))):
        P(tubo([A + off, B + off], 0.042, m_met, col, "Varilla"))
    P(resorte(A + Vector((0.16, -0.1, 0.12)), B + Vector((0.06, -0.16, -0.16)), 0.05, 16, 0.011, m_metO, col, "Resorte1"))
    P(cilindro(B, 0.11, 0.24, m_tinta, col, "Codo", 32)).rotation_euler = (radians(90), 0, radians(5))
    P(cilindro(B + Vector((0.01, -0.14, 0)), 0.065, 0.08, m_met, col, "Perilla", 32)).rotation_euler = (radians(90), 0, radians(5))
    for off in (Vector((0.04, 0.05, 0)), Vector((-0.04, -0.05, 0))):
        P(tubo([B + off, Cb + off], 0.038, m_met, col, "Varilla2"))
    P(resorte(B + Vector((0.14, -0.1, 0.06)), Cb + Vector((-0.16, -0.1, 0.05)), 0.045, 14, 0.010, m_metO, col, "Resorte2"))
    P(cilindro(Cb, 0.10, 0.22, m_tinta, col, "Cabeza", 32)).rotation_euler = (radians(90), 0, radians(15))
    P(cilindro(Cb + Vector((0, -0.13, 0)), 0.06, 0.07, m_met, col, "Perilla2", 32)).rotation_euler = (radians(90), 0, radians(15))
    boca = Vector((0.36, -0.40, -0.84)).normalized()           # hacia la mesa, un poco a la cámara: se ve la bombilla
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=0.56, radius2=0.15, depth=0.72, end_fill_type="NOTHING", location=Cb + boca * 0.40)
    pant = P(bpy.context.active_object); pant.name = "Pantalla"
    for cc in pant.users_collection: cc.objects.unlink(pant)
    col.objects.link(pant)
    pant.rotation_mode = "QUATERNION"; pant.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(boca)
    so = pant.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.025; so.material_offset = 1
    bvp = pant.modifiers.new("Bisel", "BEVEL"); bvp.width = 0.012; bvp.segments = 2
    pant.data.materials.append(m_met); pant.data.materials.append(m_crema)
    for p in pant.data.polygons: p.use_smooth = True
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.14, location=Cb + boca * 0.62)
    foco = P(bpy.context.active_object); foco.name = "Bombilla"
    for cc in foco.users_collection: cc.objects.unlink(foco)
    col.objects.link(foco); foco.data.materials.append(m_foco)
    P(tubo([A + Vector((-0.2, 0.1, -0.3)), A + Vector((-0.08, 0.14, 0.1)), (A + B) / 2 + Vector((-0.1, 0.14, 0)), B + Vector((-0.08, 0.1, 0))],
           0.016, m_tinta, col, "Cable"))
    # Luz cálida dentro de la pantalla (para el charco de luz; en el render de la lámpara va apagada).
    spot = bpy.data.objects.new("Foco", bpy.data.lights.new("Foco", "SPOT")); col.objects.link(spot)
    spot.data.energy = 140; spot.data.color = (1.0, 0.82, 0.58); spot.data.spot_size = radians(125); spot.data.spot_blend = 1.0   # cono ancho: el charco se desvanece desde el centro
    spot.data.shadow_soft_size = 0.12
    spot.location = Cb + boca * 0.55
    spot.rotation_mode = "QUATERNION"; spot.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(boca)
    # Caja de luz de estudio arriba a la izquierda: da los reflejos del metal.
    caja_luz = bpy.data.objects.new("Softbox", bpy.data.lights.new("Softbox", "AREA")); col.objects.link(caja_luz)
    caja_luz.data.energy = 1500; caja_luz.data.size = 3.0; caja_luz.location = (-1.5, 2.0, 6.0)
    caja_luz.rotation_euler = (radians(-25), radians(-20), 0)
    piso = piso_sombra(col, (LAMP_W / 2, -LAMP_H / 2, 0.0), (LAMP_W + 4, LAMP_H + 4))
    cam = camara(col, (LAMP_W / 2, -LAMP_H / 2 + 0.55, 0.0), LAMP_W, LAMP_H, inclinacion=26)   # se ven el canto de la base y la pantalla
    sc = bpy.context.scene
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.35, 0.37, 0.42, 1); bg.inputs["Strength"].default_value = 1.6   # el metal refleja gris; más ambiente = sombra suave sobre las hojas
    sc.objects["Sol"].data.energy = 2.0
    return piezas, spot, caja_luz, piso


def charco(sc, piezas, spot, caja_luz, piso, ruta_png, ruta_webp, ancho, alto, calidad):
    """Solo la luz de la lámpara sobre un piso blanco → capa cálida con alfa = intensidad."""
    import numpy as np
    for o in piezas:
        o.visible_camera = False                                  # no se ven, pero el brazo sí hace sombra en el charco
        if o.name in ("Bombilla", "Pantalla", "Cabeza", "Perilla2"):
            o.visible_shadow = False                              # la luz sale de la boca: estas no tapan el charco
    caja_luz.data.energy = 0; sc.objects["Sol"].data.energy = 0
    for m in bpy.data.materials:                                  # solo el foco: la bombilla no emite aquí
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.node_tree else None
        if b: b.inputs["Emission Strength"].default_value = 0
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND"); bg.inputs["Strength"].default_value = 0
    piso.is_shadow_catcher = False
    blanco = bpy.data.materials.new("PisoBlanco"); blanco.use_nodes = True
    next(n for n in blanco.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
    piso.data.materials.clear(); piso.data.materials.append(blanco)
    spot.data.energy = 140                                        # sin saturar el PNG: el charco conserva el degradado
    sc.render.film_transparent = False; sc.render.use_freestyle = False
    renderiza(sc, ancho, alto, ruta_png)
    img = bpy.data.images.load(ruta_png)
    px_ = np.empty(len(img.pixels), dtype=np.float32); img.pixels.foreach_get(px_)
    px_ = px_.reshape(-1, 4)
    lum = px_[:, :3].max(axis=1)
    a = np.clip(lum / max(1e-6, np.percentile(lum, 99.7)), 0, 1) ** 1.2 * 0.85
    px_[:, 0], px_[:, 1], px_[:, 2], px_[:, 3] = 1.0, 0.80, 0.52, a
    img.pixels.foreach_set(px_.ravel())
    sc.render.image_settings.file_format = "WEBP"; sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = calidad
    img.save_render(ruta_webp, scene=sc)
    return os.path.getsize(ruta_webp)


def main():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    solo = a[a.index("--solo") + 1] if "--solo" in a else None
    calidad = int(a[a.index("--calidad") + 1]) if "--calidad" in a else 80
    info = {}
    tmp = tempfile.gettempdir()
    if solo in (None, "estuche"):
        for clave, nombre in (("h", "estuche"), ("v", "estuche-v")):
            sc, col = preparar("Estuche")
            sc.objects["Sol"].rotation_euler = (radians(36), radians(-26), radians(-40))   # más rasante: huecos hondos
            ancho, alto = estuche(col, clave)
            png = os.path.join(tmp, f"mesa-{nombre}.png")
            renderiza(sc, ancho * 2, alto * 2, png)
            info[nombre] = a_webp(png, os.path.join(SALIDA, nombre + ".webp"), calidad)
    if solo in (None, "lampara"):
        sc, col = preparar("Lampara")
        piezas, spot, caja_luz, piso = lampara(col)
        spot.data.energy = 0
        for o in piezas:                                          # la pantalla no sombrea su propio charco de luz
            if o.name in ("Bombilla", "Pantalla", "Cabeza", "Perilla2"):
                o.visible_shadow = False
        png = os.path.join(tmp, "mesa-lampara.png")
        renderiza(sc, 1200, 840, png)
        info["lampara"] = a_webp(png, os.path.join(SALIDA, "lampara.webp"), min(calidad, 60))   # tope ~80 KB
        info["luz"] = charco(sc, piezas, spot, caja_luz, piso, os.path.join(tmp, "mesa-luz.png"),
                             os.path.join(SALIDA, "lampara-luz.webp"), 600, 420, calidad)
    print("MESA", info)


main()
