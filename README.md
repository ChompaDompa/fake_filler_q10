# Random Filler

## Descripcion general
- `popup.js`: Script de la extension de Chrome que inyecta un autocompletador en la pestana activa. Obtiene datos aleatorios de usuarios, los normaliza y rellena los formularios visibles analizando etiquetas y metadatos cercanos en lugar de depender de selectores fragiles.

## Comportamiento clave
- Genera datos personales de respaldo (nombres, identificaciones, telefonos, direcciones, fechas de nacimiento) en ASCII cuando la API no responde o algun campo esta vacio.
- Detecta campos a partir de texto normalizado en etiquetas, placeholders y elementos relacionados; ignora entradas no editables y permite rellenar selects con opciones disponibles.
- Escenarios especiales:
  - El campo de sexo respeta el genero devuelto por la API y evita selecciones genericas.
  - El tipo de identificacion siempre usa la primera opcion valida del select.
  - Los selectores relacionados con el lugar de nacimiento quedan sin autocompletar, y los matchers de pais/departamento/ciudad omiten etiquetas que mencionen "nacimiento" o "birth".
- Lanza eventos `input` y `change` despues de establecer valores para activar validaciones o listeners personalizados.

## Extensibilidad
- Amplia el comportamiento editando `createMatchers` en `popup.js`; agrega nuevas palabras clave o estrategias de seleccion (`{ firstSelectable: true }`, arrays de candidatos, etc.).
- Ajusta la normalizacion de texto o las reglas de exclusion si los formularios reales usan vocabulario distinto.
- Utilidades como `stripDiacritics`, `collectTexts` y `setSelectValue` centralizan la sanitizacion y la logica de seleccion para reutilizarlas en nuevos casos.
