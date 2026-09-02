import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import {
  ARMOR_SLOTS,
  ARMOR_SLOT_LABELS,
  COMPATIBILITY_SCOPES,
  PRODUCT_TYPE_LABELS,
  type ArmorSlot,
  type CompatibilityScope,
} from '../contract'
import { emptyEffect, USES_EFFECT_LIST } from '../draft'
import { EffectEditor } from '../EffectEditor'
import { MagnitudeFields } from '../MagnitudeFields'
import type { StepProps } from './BasicsStep'

const COMPATIBILITY_LABELS: Readonly<Record<CompatibilityScope, string>> = {
  ALL_HEROES: 'Todos los héroes',
  SELECTED_SUBTYPES: 'Solo algunos subtipos',
}

const SUBTYPE_HINT = 'Separa varios con comas. En MAYÚSCULAS y sin espacios. Ej. GUERRERO, MAGO.'

/**
 * Paso 2: lo que distingue a un tipo de producto de otro.
 *
 * Es el paso que justifica que esto sea un asistente y no un formulario largo:
 * un heroe y una armadura no comparten ni un solo atributo especifico, asi que
 * pedirlos todos en la misma pantalla obligaria a ignorar cuatro quintas
 * partes de lo que se ve.
 */
export const AttributesStep = ({ draft, onChange, errors }: StepProps): React.JSX.Element => {
  if (draft.type === '') {
    return (
      <p role="alert" className="text-sm text-muted">
        Vuelve al paso 1 y selecciona un tipo de producto.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-md border border-border bg-surface/40 px-4 py-3 text-sm text-muted">
        Configurando atributos para:{' '}
        <strong className="text-ink">{PRODUCT_TYPE_LABELS[draft.type]}</strong>.
      </p>

      {draft.type === 'HEROE' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <TextField
              label="Subtipo de héroe"
              required
              value={draft.heroSubtype}
              error={errors.heroSubtype}
              hint="En MAYÚSCULAS y sin espacios. Ej. GUERRERO."
              onChange={(event) => {
                onChange({ heroSubtype: event.target.value })
              }}
            />
            <TextField
              label="Poder base"
              required
              inputMode="numeric"
              value={draft.basePower}
              error={errors.basePower}
              onChange={(event) => {
                onChange({ basePower: event.target.value })
              }}
            />
            <TextField
              label="Vida base"
              required
              inputMode="numeric"
              value={draft.baseHealth}
              error={errors.baseHealth}
              hint="Mínimo 1."
              onChange={(event) => {
                onChange({ baseHealth: event.target.value })
              }}
            />
            <TextField
              label="Defensa base"
              required
              inputMode="numeric"
              value={draft.baseDefense}
              error={errors.baseDefense}
              onChange={(event) => {
                onChange({ baseDefense: event.target.value })
              }}
            />
            <SelectField
              label="Perfil"
              value={draft.heroProfile}
              hint="El dominio admite ofensivo o sanador, nunca los dos a la vez."
              options={[
                { value: 'OFFENSIVE', label: 'Ofensivo (ataque y daño)' },
                { value: 'HEALING', label: 'Sanador (curación)' },
              ]}
              onChange={(event) => {
                onChange({
                  heroProfile: event.target.value === 'HEALING' ? 'HEALING' : 'OFFENSIVE',
                })
              }}
            />
          </div>

          {draft.heroProfile === 'OFFENSIVE' ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Ataque base</p>
                <MagnitudeFields
                  legend="Ataque base"
                  value={draft.baseAttack}
                  errors={errors}
                  prefix="baseAttack"
                  allowedModes={['FIXED', 'DICE']}
                  onChange={(baseAttack) => {
                    onChange({ baseAttack })
                  }}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Daño base</p>
                <MagnitudeFields
                  legend="Daño base"
                  value={draft.baseDamage}
                  errors={errors}
                  prefix="baseDamage"
                  allowedModes={['FIXED', 'DICE']}
                  onChange={(baseDamage) => {
                    onChange({ baseDamage })
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Curación base</p>
              <MagnitudeFields
                legend="Curación base"
                value={draft.baseHealing}
                errors={errors}
                prefix="baseHealing"
                allowedModes={['FIXED', 'DICE']}
                onChange={(baseHealing) => {
                  onChange({ baseHealing })
                }}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {draft.abilities.map((ability, index) => (
              <TextField
                // El indice ES la identidad aqui: son tres ranuras fijas, no
                // una lista que se reordene.
                key={`ability-${String(index)}`}
                label={`Habilidad ${String(index + 1)}`}
                required
                value={ability}
                error={errors[`abilities.${String(index)}`]}
                {...(index === 0
                  ? { hint: 'Identificador (UUID) de una habilidad ya creada.' }
                  : {})}
                onChange={(event) => {
                  const abilities: [string, string, string] = [...draft.abilities]
                  abilities[index] = event.target.value
                  onChange({ abilities })
                }}
              />
            ))}
          </div>
        </>
      )}

      {draft.type === 'HABILIDAD' && (
        <div className="grid gap-6 md:grid-cols-3">
          <TextField
            label="Subtipos de héroe compatibles"
            required
            value={draft.compatibleHeroSubtypes}
            error={errors.compatibleHeroSubtypes}
            hint={SUBTYPE_HINT}
            onChange={(event) => {
              onChange({ compatibleHeroSubtypes: event.target.value })
            }}
          />
          <SelectField
            label="Coste de poder"
            value={draft.powerCostMode}
            options={[
              { value: 'FIXED', label: 'Cantidad fija' },
              { value: 'ALL_AVAILABLE', label: 'Todo el poder disponible' },
            ]}
            onChange={(event) => {
              onChange({
                powerCostMode: event.target.value === 'ALL_AVAILABLE' ? 'ALL_AVAILABLE' : 'FIXED',
              })
            }}
          />
          {draft.powerCostMode === 'FIXED' && (
            <TextField
              label="Poder consumido"
              required
              inputMode="numeric"
              value={draft.powerCost}
              error={errors.powerCost}
              hint="Mínimo 1."
              onChange={(event) => {
                onChange({ powerCost: event.target.value })
              }}
            />
          )}
        </div>
      )}

      {(draft.type === 'ARMA' || draft.type === 'ARMADURA' || draft.type === 'ITEM') && (
        <div className="grid gap-6 md:grid-cols-3">
          <SelectField
            label="Compatibilidad"
            value={draft.compatibilityScope}
            options={COMPATIBILITY_SCOPES.map((scope) => ({
              value: scope,
              label: COMPATIBILITY_LABELS[scope],
            }))}
            onChange={(event) => {
              onChange({ compatibilityScope: event.target.value as CompatibilityScope })
            }}
          />

          {draft.compatibilityScope === 'SELECTED_SUBTYPES' && (
            <TextField
              label="Subtipos compatibles"
              required
              value={draft.compatibleHeroSubtypes}
              error={errors.compatibleHeroSubtypes}
              hint={SUBTYPE_HINT}
              onChange={(event) => {
                onChange({ compatibleHeroSubtypes: event.target.value })
              }}
            />
          )}

          {draft.type === 'ARMADURA' && (
            <SelectField
              label="Ranura"
              value={draft.armorSlot}
              options={ARMOR_SLOTS.map((slot) => ({ value: slot, label: ARMOR_SLOT_LABELS[slot] }))}
              onChange={(event) => {
                onChange({ armorSlot: event.target.value as ArmorSlot })
              }}
            />
          )}

          {draft.type !== 'ITEM' && (
            <TextField
              label="Código de conjunto (opcional)"
              value={draft.setCode}
              error={errors.setCode}
              hint="En MAYÚSCULAS, o vacío si no pertenece a un conjunto."
              onChange={(event) => {
                onChange({ setCode: event.target.value })
              }}
            />
          )}
        </div>
      )}

      {draft.type === 'EPICA' && (
        <>
          <div className="md:max-w-sm">
            <TextField
              label="Subtipo de héroe compatible"
              required
              value={draft.compatibleHeroSubtype}
              error={errors.compatibleHeroSubtype}
              hint="En MAYÚSCULAS y sin espacios. Ej. GUERRERO."
              onChange={(event) => {
                onChange({ compatibleHeroSubtype: event.target.value })
              }}
            />
          </div>

          <EffectEditor
            title="Efecto específico"
            value={draft.specificEffect}
            errors={errors}
            prefix="specificEffect"
            onChange={(specificEffect) => {
              onChange({ specificEffect })
            }}
          />

          <CheckboxField
            label="Agregar efecto general opcional"
            hint="Se aplica a cualquier héroe que use la Épica; el específico solo al subtipo compatible."
            checked={draft.generalEffectEnabled}
            onChange={(event) => {
              onChange({ generalEffectEnabled: event.target.checked })
            }}
          />

          {draft.generalEffectEnabled && (
            <EffectEditor
              title="Efecto general"
              value={draft.generalEffect}
              errors={errors}
              prefix="generalEffect"
              onChange={(generalEffect) => {
                onChange({ generalEffect })
              }}
            />
          )}
        </>
      )}

      {USES_EFFECT_LIST.has(draft.type) && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Efectos</h3>
            <Button
              variant="secondary"
              onClick={() => {
                onChange({ effects: [...draft.effects, emptyEffect()] })
              }}
            >
              Añadir efecto
            </Button>
          </div>

          {errors.effects !== undefined && (
            <p role="alert" className="text-xs text-danger">
              {errors.effects}
            </p>
          )}

          {draft.effects.map((effect, index) => (
            <EffectEditor
              key={`effect-${String(index)}`}
              title={`Efecto ${String(index + 1)}`}
              value={effect}
              errors={errors}
              prefix={`effects.${String(index)}`}
              onChange={(next) => {
                onChange({
                  effects: draft.effects.map((current, position) =>
                    position === index ? next : current,
                  ),
                })
              }}
              {...(draft.effects.length > 1
                ? {
                    onRemove: (): void => {
                      onChange({
                        effects: draft.effects.filter((_, position) => position !== index),
                      })
                    },
                  }
                : {})}
            />
          ))}
        </div>
      )}
    </div>
  )
}
