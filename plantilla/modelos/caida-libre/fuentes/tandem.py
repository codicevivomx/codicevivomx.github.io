"""
tandem.py — Fuente de verdad del modelo «tándem» (lámina caída libre · El salto).

Regenerar (modelo + tandem.glb + tandem.png):
    blender -b --factory-startup -P plantilla/modelos/caida-libre/fuentes/tandem.py
Opción: -- --sin-exportar

Instructor (traje menta, casco gris, mochila grande azul) detrás y arriba; alumna (traje #E3B95A)
enganchada delante con cuatro conectores (hombros y cadera). Un solo esqueleto:
  - huesos del instructor con los mismos nombres que la paracaidista (incluye «enganche»),
  - huesos de la alumna con prefijo «alu_»; su cadera cuelga de la cadera del instructor,
    así en el arco gira rígida con él y queda debajo-delante.
Acciones «arco» y «vertical» (las mismas poses de persona.py). Origen = centro de masa de los dos.
"""
import bpy, os, sys, importlib
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
NOMBRE = "tandem"
ALU = "alu_"
DY, DZ = -0.34, -0.10      # alumna: 34 cm delante y 10 cm más abajo que el instructor


def leer_args():
    exportar = globals().get("EXPORTAR", True)
    if "--" in sys.argv and "--sin-exportar" in sys.argv[sys.argv.index("--"):]:
        exportar = False
    return exportar


def conectores(P):
    """Ganchos del arnés de la alumna al del instructor (hombros y cadera)."""
    for s, _ in persona.LADOS:
        persona.tubo(P, [(s * .11, -.15, 1.40), (s * .10, DY + .15, 1.40 + DZ)], .018, 6, "gris_oscuro",
                     lambda p: {"pecho": 1})
        persona.tubo(P, [(s * .12, -.13, .95), (s * .12, DY + .13, .95 + DZ)], .018, 6, "gris_oscuro",
                     lambda p: {"cadera": 1})


CM = Vector((0, DY / 2, persona.Z0 + DZ / 2))   # centro de masa aproximado de los dos


def juego_poses():
    """Mismas poses que la paracaidista. El giro de cuerpo entero (el de la cadera) pasa al hueso
    «centro», en el centro de masa de los dos; la alumna lo hereda a través del instructor."""
    base = persona.poses()
    juego = {}
    for nombre in ("arco", "vertical"):
        cuerpo = {k: v for k, v in base[nombre].items() if k != "cadera"}
        inst = dict(cuerpo, centro=base[nombre].get("cadera", []))
        alu = dict(cuerpo)
        if nombre == "arco":
            # En el arco las piernas de la alumna van juntas y pasan entre las del instructor (abiertas 18°);
            # con las mismas piernas que la paracaidista se atravesarían.
            for s, l in persona.LADOS:
                inst[f"muslo_{l}"] = [("Y", -s * 18), ("X", 15)]
                alu[f"muslo_{l}"] = [("Y", s * 2), ("X", 10)]
                alu[f"pierna_{l}"] = [("X", 40)]
        if nombre == "vertical":
            # La alumna sujeta la pechera con las dos manos; los mandos los lleva el instructor.
            for s, l in persona.LADOS:
                alu[f"brazo_{l}"] = [("dir", (s * 0.35, -0.45, -0.82))]
                alu[f"antebrazo_{l}"] = [("dir", (-s * 0.90, -0.25, 0.35))]
        juego[nombre] = [("", inst), (ALU, alu)]
    return juego


def main():
    exportar = leer_args()
    sc = persona.preparar_escena("Tandem")
    vl = sc.view_layers[0]
    col = persona.coleccion(sc, "Tandem")

    lista = ([("centro", CM, CM + Vector((0, 0, 0.1)), None)] + persona.huesos(padre_raiz="centro")
             + persona.huesos(DY, DZ, ALU, padre_raiz="cadera", enganche=False))
    arm = persona.crear_esqueleto(col, "Esqueleto", lista)
    grupos = persona.huesos_def() + [ALU + g for g in persona.huesos_def()]
    P = persona.Pieza(grupos)
    persona.cuerpo(P, traje="menta", acento="menta_oscuro", mochila="azul", casco="gris", mochila_escala=1.3)
    conectores(P)
    P.prefijo = ALU
    persona.cuerpo(P, traje="traje_alumna", acento="coral_oscuro", mochila=None, casco="blanco", dy=DY, dz=DZ)
    P.prefijo = ""
    malla = P.objeto("Tandem_malla", col)
    malla.parent = arm
    mod = malla.modifiers.new("Esqueleto", "ARMATURE")
    mod.object = arm
    juego = juego_poses()
    persona.crear_acciones(arm, juego)

    # Raíz en el centro de masa de los dos: el esqueleto se mueve para que «centro» quede en el origen.
    raiz = bpy.data.objects.new("Tandem", None)
    col.objects.link(raiz)
    arm.parent = raiz
    arm.location = -CM

    vl.update()
    info = {"triangulos": persona.triangulos(malla, vl.depsgraph), "huesos": len(arm.data.bones),
            "acciones": [t.name for t in arm.animation_data.nla_tracks]}
    if exportar:
        persona.exportar_glb(sc, raiz, os.path.join(SALIDA, NOMBRE + ".glb"))
    # Las dos poses lado a lado (copias de revisión: no se exportan).
    copias = []
    vista = persona.coleccion(sc, "Tandem_vista")
    for k, nombre in enumerate(("arco", "vertical")):
        a2 = arm.copy()
        a2.parent = None
        a2.location = (2.2 + k * 1.9, 0, 0)
        vista.objects.link(a2)
        for t in list(a2.animation_data.nla_tracks):
            a2.animation_data.nla_tracks.remove(t)
        for pr, g in juego[nombre]:
            persona.aplicar_pose(a2, g, pr, (ALU,))
        m2 = malla.copy()
        m2.parent = a2
        m2.modifiers["Esqueleto"].object = a2
        vista.objects.link(m2)
        copias.append(m2)
    if exportar:
        malla.hide_render = True
        persona.vista_previa(sc, copias, os.path.join(SALIDA, NOMBRE + ".png"))
        malla.hide_render = False
        info["exportado"] = SALIDA
    print("TANDEM", info)
    return info


RESULTADO = main()
