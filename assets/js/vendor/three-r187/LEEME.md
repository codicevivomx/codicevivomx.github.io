# three.js r187 (módulos ES)

Copia local de three.js 0.187.0 para las láminas 3D (GitHub Pages y después Shopify, sin depender de un CDN).
Licencia MIT (`LICENSE`).

| Archivo | Origen (npm `three@0.187.0`) |
|---|---|
| `three.module.min.js` | `build/three.module.js` minificado por jsDelivr (Terser) |
| `three.core.js` | `build/three.core.js` minificado por jsDelivr; se llama así porque `three.module.min.js` lo importa como `./three.core.js` |
| `addons/loaders/GLTFLoader.js` | `examples/jsm/loaders/GLTFLoader.js` |
| `addons/utils/SkeletonUtils.js` | `examples/jsm/utils/SkeletonUtils.js` |
| `addons/utils/BufferGeometryUtils.js` | `examples/jsm/utils/BufferGeometryUtils.js` (lo usa GLTFLoader) |

Uso, con un importmap de rutas relativas a la página:

```html
<script type="importmap">
{ "imports": {
    "three": "../../../../assets/js/vendor/three-r187/three.module.min.js",
    "three/addons/": "../../../../assets/js/vendor/three-r187/addons/"
} }
</script>
```

Para actualizar: bajar los mismos archivos de `https://cdn.jsdelivr.net/npm/three@<versión>/…`, en una carpeta nueva
`three-r<versión>/`, y cambiar el importmap de cada lámina.

Pendiente: `assets/js/vendor/three.min.js` (r187 sin módulos) lo usan las láminas anteriores; unificar con esta copia.
