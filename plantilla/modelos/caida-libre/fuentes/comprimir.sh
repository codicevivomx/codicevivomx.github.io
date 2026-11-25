#!/usr/bin/env bash
# Comprime los .glb de caída libre con meshopt (gltfpack 1.3.0, MIT, de meshoptimizer).
# Correr DESPUÉS de regenerar con Blender (los .py exportan sin comprimir):
#     bash plantilla/modelos/caida-libre/fuentes/comprimir.sh
# -cc: compresión meshopt alta · -kn: conserva nombres de nodos (Helice, Puerta, enganche)
# -km: conserva materiales (la lámina los busca por nombre: vela_1, luz_roja…) · -ke: conserva extras.
# Las páginas los leen con GLTFLoader.setMeshoptDecoder (assets/js/vendor/three-r187/addons/libs/).
set -e
cd "$(dirname "$0")/.."
for m in avioneta paracaidas paracaidista tandem; do
  npx --yes gltfpack@1.3.0 -i "$m.glb" -o "$m.glb" -cc -kn -km -ke
  echo "$m.glb: $(wc -c < "$m.glb") B"
done
