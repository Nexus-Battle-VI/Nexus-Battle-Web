export interface CardForm {
  readonly holder: string
  readonly number: string
  readonly expiry: string
  readonly securityCode: string
}

export const EMPTY_CARD: CardForm = {
  holder: '',
  number: '',
  expiry: '',
  securityCode: '',
}

export type CardField = keyof CardForm

export type CardErrors = Partial<Record<CardField, string>>

/**
 * Validacion del formulario de pago simulado.
 *
 * Comprueba **solo** que los cuatro datos documentados esten y tengan una
 * forma reconocible. HU-59 dice de forma expresa que la historia «no establece
 * marcas de tarjeta, longitudes exactas, algoritmos de validacion, bancos,
 * cobros ni tecnologias financieras», asi que aqui **no se valida Luhn, ni
 * marca, ni caducidad real**: hacerlo seria inventar reglas que nadie pidio y
 * que rechazarian tarjetas de prueba legitimas.
 *
 * Las mismas reglas viven en el contrato del servicio. Se repiten aqui para
 * poder avisar antes de enviar, no para sustituirlas: quien decide si el pago
 * procede es Commerce.
 */
export const validateCard = (card: CardForm): CardErrors => {
  const errors: CardErrors = {}

  if (card.holder.trim().length < 2) {
    errors.holder = 'Escribe el nombre del titular.'
  }

  if (!/^[0-9][0-9 -]{10,24}$/.test(card.number.trim())) {
    errors.number = 'El numero de tarjeta solo admite digitos, espacios o guiones.'
  }

  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry.trim())) {
    errors.expiry = 'La fecha de vencimiento tiene el formato MM/AA.'
  }

  if (!/^\d{3,4}$/.test(card.securityCode.trim())) {
    errors.securityCode = 'El codigo de seguridad tiene tres o cuatro digitos.'
  }

  return errors
}

export const isCardValid = (card: CardForm): boolean => Object.keys(validateCard(card)).length === 0
