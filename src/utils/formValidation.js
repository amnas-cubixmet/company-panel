/** Shared form validation helpers for all company-panel routes.
 * Keeps errors near the field and focuses the first field that needs attention.
 */
let errorSequence = 0;
const FIELD_SELECTOR = 'input:not([type="hidden"]), select, textarea';
const EMPTY_ERROR = 'This field is required.';

const isField = (element) =>
  element instanceof HTMLElement
  && element.matches(FIELD_SELECTOR)
  && !element.disabled;

const normalizeKey = (key) => String(key || '')
  .replace(/([a-z])([A-Z])/g, '$1_$2')
  .replace(/[^a-z0-9]/gi, '').toLowerCase();

const getFieldContainer = (field) =>
  field.closest('[data-cg-input-wrapper], label:not([class*="checkbox"]), .crud-field, .ui-field, .form-field, .form-group')
  || field.closest('[data-field]')
  || field.parentElement;

export const focusField = (field) => {
  if (!isField(field) || !field.isConnected) return false;
  try {
    field.focus({ preventScroll: true });
    field.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  } catch {
    field.focus();
  }
  return true;
};

export const clearFieldValidation = (field) => {
  if (!isField(field) || field.dataset.cgErrorActive !== 'true') return;
  const element = document.getElementById(field.dataset.cgErrorId || '');
  if (element?.dataset.cgGeneratedError === 'true') element.remove();
  const original = field.dataset.cgOldDescription || '';
  if (original) field.setAttribute('aria-describedby', original);
  else field.removeAttribute('aria-describedby');
  field.removeAttribute('data-cg-error-active');
  field.removeAttribute('data-cg-error-id');
  field.removeAttribute('data-cg-old-description');
  field.removeAttribute('aria-invalid');
  field.closest('[data-cg-field-error]')?.removeAttribute('data-cg-field-error');
};

export const setFieldValidation = (field, message, shouldFocus = true) => {
  if (!isField(field) || !field.isConnected) return false;
  const container = getFieldContainer(field);
  if (!container) return false;
  const previous = field.dataset.cgErrorActive === 'true';
  const previousId = field.dataset.cgErrorId;
  const oldDescription = previous
    ? (field.dataset.cgOldDescription || '')
    : (field.getAttribute('aria-describedby') || '');
  let messageElement = previousId ? document.getElementById(previousId) : null;
  if (!messageElement) {
    messageElement = document.createElement('span');
    messageElement.id = `cg-field-error-${++errorSequence}`;
    messageElement.dataset.cgGeneratedError = 'true';
    messageElement.className = 'cg-inline-field-error';
    messageElement.setAttribute('role', 'alert');
    container.appendChild(messageElement);
  }
  messageElement.textContent = String(message || EMPTY_ERROR);
  container.setAttribute('data-cg-field-error', 'true');
  field.dataset.cgErrorActive = 'true';
  field.dataset.cgErrorId = messageElement.id;
  field.dataset.cgOldDescription = oldDescription;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute(
    'aria-describedby',
    [oldDescription, messageElement.id].filter(Boolean).join(' '),
  );
  if (shouldFocus) focusField(field);
  return true;
};

export const findFormField = (form, name) => {
  if (!(form instanceof HTMLElement)) return null;
  const target = normalizeKey(name);
  return [...form.querySelectorAll(FIELD_SELECTOR)]
    .find((element) =>
      isField(element)
      && [element.name, element.id, element.dataset.field, element.getAttribute('aria-label')]
        .some((key) => normalizeKey(key) === target))
    || null;
};

export const focusFirstInvalidField = (form) => {
  if (!(form instanceof HTMLElement)) return false;
  const invalid = [...form.querySelectorAll(FIELD_SELECTOR)]
    .find((field) => isField(field) && !field.validity.valid);
  if (!invalid) return false;
  return setFieldValidation(invalid, invalid.validationMessage || EMPTY_ERROR);
};

/** Show a known field error (including business-rule errors not expressible in HTML). */
export const showFormFieldError = (form, name, message) => {
  const field = findFormField(form, name);
  return field ? setFieldValidation(field, message) : false;
};

/** DRF/Axios field errors: match backend snake_case and frontend camelCase. */
export const showServerFormErrors = (form, error, aliases = {}) => {
  const data = error?.response?.data || error?.data;
  if (!data || Array.isArray(data) || typeof data !== 'object') return false;
  const invalidFields = [];
  for (const [key, raw] of Object.entries(data)) {
    if (['detail', 'message', 'error', 'non_field_errors'].includes(key)) continue;
    const field = findFormField(form, aliases[key] || key);
    if (!field) continue;
    const message = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : '';
    if (!message) continue;
    setFieldValidation(field, message, false);
    invalidFields.push(field);
  }
  // DRF response field order need not equal the visual form order.
  const visualFields = [...form.querySelectorAll(FIELD_SELECTOR)];
  invalidFields.sort((left, right) => visualFields.indexOf(left) - visualFields.indexOf(right));
  if (invalidFields[0]) focusField(invalidFields[0]);
  return invalidFields.length > 0;
};
