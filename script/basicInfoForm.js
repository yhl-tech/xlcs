import { getEmptyBasicInfoDraft, state } from "./appState.js"

const BASIC_INFO_FIELDS = ["sex", "age", "education", "occupation", "mood"]
const BASIC_INFO_LABELS = Object.freeze({
  sex: "性别",
  age: "年龄",
  education: "学历",
  occupation: "职业",
  mood: "当前心情",
})
const VALID_SEX_OPTIONS = Object.freeze(["男", "女"])
const basicInfoErrorElements = BASIC_INFO_FIELDS.reduce((acc, field) => {
  acc[field] = document.getElementById(`${field}-error`)
  return acc
}, {})

export function getBasicInfoInputMap() {
  return BASIC_INFO_FIELDS.reduce((acc, field) => {
    acc[field] = document.getElementById(field)
    return acc
  }, {})
}

export function applyBasicInfoDraftToInputs(draft = state.basicInfoDraft) {
  const inputs = getBasicInfoInputMap()
  BASIC_INFO_FIELDS.forEach((field) => {
    if (inputs[field]) {
      inputs[field].value = draft?.[field] ?? ""
    }
  })
}

export function syncBasicInfoDraftFromInputs() {
  const inputs = getBasicInfoInputMap()
  const nextDraft = getEmptyBasicInfoDraft()
  BASIC_INFO_FIELDS.forEach((field) => {
    if (inputs[field]) {
      const rawValue =
        typeof inputs[field].value === "string" ? inputs[field].value : ""
      nextDraft[field] = rawValue.trim()
    }
  })
  state.basicInfoDraft = nextDraft
  return nextDraft
}

export function setupBasicInfoDraftListeners(saveSessionSnapshot) {
  const inputs = getBasicInfoInputMap()
  BASIC_INFO_FIELDS.forEach((field) => {
    const input = inputs[field]
    if (!input) {
      return
    }
    input.addEventListener("input", () => {
      const rawValue = typeof input.value === "string" ? input.value : ""
      state.basicInfoDraft[field] = rawValue.trim()
      clearInputValidationState(input)
      saveSessionSnapshot("basic_info")
    })
  })
}

function getFieldErrorElement(field) {
  if (!field) {
    return null
  }
  if (!basicInfoErrorElements[field]) {
    basicInfoErrorElements[field] = document.getElementById(`${field}-error`)
  }
  return basicInfoErrorElements[field]
}

function setFieldErrorMessage(field, message = "") {
  const errorElement = getFieldErrorElement(field)
  if (!errorElement) {
    return
  }
  errorElement.textContent = message
  if (message) {
    errorElement.classList.add("visible")
  } else {
    errorElement.classList.remove("visible")
  }
}

export function clearFieldErrorMessage(field) {
  setFieldErrorMessage(field, "")
}

export function clearInputValidationState(input, fieldId = input?.id) {
  if (input) {
    input.classList.remove("input-invalid")
    input.removeAttribute("aria-invalid")
  }
  if (fieldId) {
    clearFieldErrorMessage(fieldId)
  }
}

export function clearBasicInfoValidationState() {
  BASIC_INFO_FIELDS.forEach((field) => {
    const input = document.getElementById(field)
    clearInputValidationState(input, field)
  })
}

function markFieldInvalid(input, message, errors) {
  const fieldId = input?.id
  if (input) {
    input.classList.add("input-invalid")
    input.setAttribute("aria-invalid", "true")
  }
  if (fieldId) {
    if (message) {
      setFieldErrorMessage(fieldId, message)
    } else {
      clearFieldErrorMessage(fieldId)
    }
  }
  if (message) {
    errors.push(message)
  }
}

export function validateBasicInfoForm() {
  const inputs = getBasicInfoInputMap()
  const errors = []
  const sanitizedValues = {}
  clearBasicInfoValidationState()

  const sexInput = inputs.sex
  const sexValue = (sexInput?.value || "").trim()
  if (!sexValue || !VALID_SEX_OPTIONS.includes(sexValue)) {
    markFieldInvalid(sexInput, `${BASIC_INFO_LABELS.sex}为必填项`, errors)
  } else {
    sanitizedValues.sex = sexValue
  }

  const ageInput = inputs.age
  const ageValue = (ageInput?.value || "").trim()
  const hasInvalidNumberInput = ageInput && ageInput.validity.badInput

  if (hasInvalidNumberInput || (ageValue && !/^-?\d+$/.test(ageValue))) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}只能填写数字`, errors)
  } else if (!ageValue) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}为必填项`, errors)
  } else if (Number(ageValue) < 0) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}不能小于 0`, errors)
  } else {
    sanitizedValues.age = ageValue
  }

  ;["education", "occupation", "mood"].forEach((field) => {
    const input = inputs[field]
    const value = (input?.value || "").trim()
    if (!value) {
      markFieldInvalid(input, `${BASIC_INFO_LABELS[field]}为必填项`, errors)
    } else {
      sanitizedValues[field] = value
    }
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, values: sanitizedValues }
}


