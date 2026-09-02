/**
 * Estilos de los campos de "Mi cuenta".
 *
 * Las definiciones se mudaron a `@/components/ui/form/fieldStyles` cuando el
 * alta de producto (HU-33) necesito la misma familia visual. Este modulo se
 * conserva como reexportacion para no tocar las pantallas que ya lo importan:
 * el aspecto es el mismo porque la fuente es la misma, no porque dos copias
 * coincidan hoy.
 */
export {
  FIELD_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HINT_CLASS,
  FIELD_LABEL_CLASS,
  READONLY_FIELD_CLASS,
} from '@/components/ui/form/fieldStyles'
