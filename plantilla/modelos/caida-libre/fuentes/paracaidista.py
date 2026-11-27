"""
paracaidista.py — Fuente de verdad del modelo «paracaidista» (lámina caída libre · El salto).

Regenerar (modelo + paracaidista.glb + paracaidista.png):
    blender -b --factory-startup -P plantilla/modelos/caida-libre/fuentes/paracaidista.py
Opción: -- --sin-exportar

Traje coral, mochila azul, casco blanco con goggles. Esqueleto y poses en persona.py:
acciones «parada» (en el estribo), «arco» (boca abajo) y «vertical» (colgando del paracaídas).
El hueso «enganche» (sobre la mochila, entre los hombros) es donde se cuelga el paracaídas.
Origen = cadera = centro de masa aproximado.
"""
import bpy, os, sys, importlib

sys.dont_write_bytecode = True     # sin __pycache__ junto a las fuentes
try:
    AQUI = os.path.dirname(os.path.abspath(__file__))
except NameError:
    AQUI = os.getcwd()
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)
import persona
importlib.reload(persona)   # en vivo: toma siempre la versión del disco

SALIDA = os.path.dirname(AQUI)
NOMBRE = "paracaidista"


def leer_args():
    exportar = globals().get("EXPORTAR", True)
    if "--" in sys.argv and "--sin-exportar" in sys.argv[sys.argv.index("--"):]:
        exportar = False
    return exportar


def main():
    exportar = leer_args()
    sc = persona.preparar_escena("Paracaidista")
    vl = sc.view_layers[0]
    col = persona.coleccion(sc, "Paracaidista")

    arm = persona.crear_esqueleto(col, "Esqueleto", persona.huesos())
    P = persona.Pieza(persona.huesos_def())
    persona.cuerpo(P, traje="coral", acento="coral_oscuro", mochila="azul")
    malla = P.objeto("Paracaidista_malla", col)
    malla.parent = arm
    mod = malla.modifiers.new("Esqueleto", "ARMATURE")
    mod.object = arm
    persona.crear_acciones(arm, persona.poses())

    # Raíz en el centro de masa: el esqueleto baja Z0 para que la cadera quede en el origen.
    raiz = bpy.data.objects.new("Paracaidista", None)
    col.objects.link(raiz)
    arm.parent = raiz
    arm.location = (0, 0, -persona.Z0)

    vl.update()
    info = {"triangulos": persona.triangulos(malla, vl.depsgraph),
            "huesos": len(arm.data.bones), "acciones": [t.name for t in arm.animation_data.nla_tracks]}
    if exportar:
        persona.exportar_glb(sc, raiz, os.path.join(SALIDA, NOMBRE + ".glb"))
    # Las tres poses lado a lado, a la derecha del modelo (copias de revisión: no se exportan).
    copias = []
    vista = persona.coleccion(sc, "Paracaidista_vista")
    for k, nombre in enumerate(("parada", "arco", "vertical")):
        a2 = arm.copy()
        a2.parent = None
        a2.location = (2.0 + k * 1.6, 0, 0)
        vista.objects.link(a2)
        for t in list(a2.animation_data.nla_tracks):
            a2.animation_data.nla_tracks.remove(t)
        persona.aplicar_pose(a2, persona.poses()[nombre])
        m2 = malla.copy()
        m2.parent = a2
        m2.modifiers["Esqueleto"].object = a2
        vista.objects.link(m2)
        copias.append(m2)
    if exportar:
        malla.hide_render = True            # en el PNG solo las tres poses
        persona.vista_previa(sc, copias, os.path.join(SALIDA, NOMBRE + ".png"))
        malla.hide_render = False
        info["exportado"] = SALIDA
    print("PARACAIDISTA", info)
    return info


RESULTADO = main()
