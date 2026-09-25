import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { localizedMessages } from '@/shared/i18n/messages'

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

const COMPATIBILITY_LABELS: Readonly<Record<CompatibilityScope, string>> = localizedMessages({
  ALL_HEROES: 'admin:products.attrs.compatibility.ALL_HEROES',
  SELECTED_SUBTYPES: 'admin:products.attrs.compatibility.SELECTED_SUBTYPES',
})

/**
 * Paso 2: lo que distingue a un tipo de producto de otro.
 *
 * Es el paso que justifica que esto sea un asistente y no un formulario largo:
 * un heroe y una armadura no comparten ni un solo atributo especifico, asi que
 * pedirlos todos en la misma pantalla obligaria a ignorar cuatro quintas
 * partes de lo que se ve.
 */
export const AttributesStep = ({ draft, onChange, errors }: StepProps): React.JSX.Element => {
  const { t } = useTranslation()
  const subtypeHint = t('admin:products.attrs.subtypeHint')

  if (draft.type === '') {
    return (
      <p role="alert" className="text-sm text-muted">
        {t('admin:products.attrs.pickType')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-md border border-border bg-surface/40 px-4 py-3 text-sm text-muted">
        {t('admin:products.attrs.configuring')}{' '}
        <strong className="text-ink">{PRODUCT_TYPE_LABELS[draft.type]}</strong>.
      </p>

      {draft.type === 'HEROE' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <TextField
              label={t('admin:products.attrs.heroSubtype')}
              required
              value={draft.heroSubtype}
              error={errors.heroSubtype}
              hint={t('admin:products.attrs.codeHint')}
              onChange={(event) => {
                onChange({ heroSubtype: event.target.value })
              }}
            />
            <TextField
              label={t('admin:products.attrs.basePower')}
              required
              inputMode="numeric"
              value={draft.basePower}
              error={errors.basePower}
              onChange={(event) => {
                onChange({ basePower: event.target.value })
              }}
            />
            <TextField
              label={t('admin:products.attrs.baseHealth')}
              required
              inputMode="numeric"
              value={draft.baseHealth}
              error={errors.baseHealth}
              hint={t('admin:products.attrs.min1')}
              onChange={(event) => {
                onChange({ baseHealth: event.target.value })
              }}
            />
            <TextField
              label={t('admin:products.attrs.baseDefense')}
              required
              inputMode="numeric"
              value={draft.baseDefense}
              error={errors.baseDefense}
              onChange={(event) => {
                onChange({ baseDefense: event.target.value })
              }}
            />
            <SelectField
              label={t('admin:products.attrs.profile')}
              value={draft.heroProfile}
              hint={t('admin:products.attrs.profileHint')}
              options={[
                { value: 'OFFENSIVE', label: t('admin:products.attrs.offensive') },
                { value: 'HEALING', label: t('admin:products.attrs.healer') },
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
                <p className="mb-2 text-sm font-medium text-ink">
                  {t('admin:products.attrs.baseAttack')}
                </p>
                <MagnitudeFields
                  legend={t('admin:products.attrs.baseAttack')}
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
                <p className="mb-2 text-sm font-medium text-ink">
                  {t('admin:products.attrs.baseDamage')}
                </p>
                <MagnitudeFields
                  legend={t('admin:products.attrs.baseDamage')}
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
              <p className="mb-2 text-sm font-medium text-ink">
                {t('admin:products.attrs.baseHealing')}
              </p>
              <MagnitudeFields
                legend={t('admin:products.attrs.baseHealing')}
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
                label={t('admin:products.attrs.ability', { index: String(index + 1) })}
                required
                value={ability}
                error={errors[`abilities.${String(index)}`]}
                {...(index === 0 ? { hint: t('admin:products.attrs.abilityHint') } : {})}
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
            label={t('admin:products.attrs.compatibleSubtypes')}
            required
            value={draft.compatibleHeroSubtypes}
            error={errors.compatibleHeroSubtypes}
            hint={subtypeHint}
            onChange={(event) => {
              onChange({ compatibleHeroSubtypes: event.target.value })
            }}
          />
          <SelectField
            label={t('admin:products.attrs.powerCost')}
            value={draft.powerCostMode}
            options={[
              { value: 'FIXED', label: t('admin:products.attrs.powerFixed') },
              { value: 'ALL_AVAILABLE', label: t('admin:products.attrs.powerAll') },
            ]}
            onChange={(event) => {
              onChange({
                powerCostMode: event.target.value === 'ALL_AVAILABLE' ? 'ALL_AVAILABLE' : 'FIXED',
              })
            }}
          />
          {draft.powerCostMode === 'FIXED' && (
            <TextField
              label={t('admin:products.attrs.powerConsumed')}
              required
              inputMode="numeric"
              value={draft.powerCost}
              error={errors.powerCost}
              hint={t('admin:products.attrs.min1')}
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
            label={t('admin:products.attrs.compatibilityLabel')}
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
              label={t('admin:products.attrs.compatibleSubtypesShort')}
              required
              value={draft.compatibleHeroSubtypes}
              error={errors.compatibleHeroSubtypes}
              hint={subtypeHint}
              onChange={(event) => {
                onChange({ compatibleHeroSubtypes: event.target.value })
              }}
            />
          )}

          {draft.type === 'ARMADURA' && (
            <SelectField
              label={t('admin:products.attrs.slot')}
              value={draft.armorSlot}
              options={ARMOR_SLOTS.map((slot) => ({ value: slot, label: ARMOR_SLOT_LABELS[slot] }))}
              onChange={(event) => {
                onChange({ armorSlot: event.target.value as ArmorSlot })
              }}
            />
          )}

          {draft.type !== 'ITEM' && (
            <TextField
              label={t('admin:products.attrs.setCode')}
              value={draft.setCode}
              error={errors.setCode}
              hint={t('admin:products.attrs.setCodeHint')}
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
              label={t('admin:products.attrs.compatibleSubtype')}
              required
              value={draft.compatibleHeroSubtype}
              error={errors.compatibleHeroSubtype}
              hint={t('admin:products.attrs.codeHint')}
              onChange={(event) => {
                onChange({ compatibleHeroSubtype: event.target.value })
              }}
            />
          </div>

          <EffectEditor
            title={t('admin:products.attrs.specificEffect')}
            value={draft.specificEffect}
            errors={errors}
            prefix="specificEffect"
            onChange={(specificEffect) => {
              onChange({ specificEffect })
            }}
          />

          <CheckboxField
            label={t('admin:products.attrs.addGeneral')}
            hint={t('admin:products.attrs.addGeneralHint')}
            checked={draft.generalEffectEnabled}
            onChange={(event) => {
              onChange({ generalEffectEnabled: event.target.checked })
            }}
          />

          {draft.generalEffectEnabled && (
            <EffectEditor
              title={t('admin:products.attrs.generalEffect')}
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
            <h3 className="text-sm font-semibold text-ink">{t('admin:products.attrs.effects')}</h3>
            <Button
              variant="secondary"
              onClick={() => {
                onChange({ effects: [...draft.effects, emptyEffect()] })
              }}
            >
              {t('admin:products.attrs.addEffect')}
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
              title={t('admin:products.attrs.effect', { index: String(index + 1) })}
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
