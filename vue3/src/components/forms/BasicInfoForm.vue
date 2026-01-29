<template>
  <form class="basic-info-form" @submit.prevent="handleSubmit">
    <!-- 性别 -->
    <div class="form-group">
      <label>性别 <span class="required">*</span></label>
      <div class="radio-group">
        <label class="radio-item" :class="{ selected: form.sex === '男' }">
          <input v-model="form.sex" type="radio" value="男" />
          <span>男</span>
        </label>
        <label class="radio-item" :class="{ selected: form.sex === '女' }">
          <input v-model="form.sex" type="radio" value="女" />
          <span>女</span>
        </label>
      </div>
      <span v-if="errors.sex" class="error">{{ errors.sex }}</span>
    </div>

    <!-- 年龄 -->
    <div class="form-group">
      <label for="age">年龄 <span class="required">*</span></label>
      <input
        id="age"
        v-model="form.age"
        type="number"
        min="1"
        max="120"
        placeholder="请输入年龄"
      />
      <span v-if="errors.age" class="error">{{ errors.age }}</span>
    </div>

    <!-- 学历 -->
    <div class="form-group">
      <label for="education">学历 <span class="required">*</span></label>
      <select id="education" v-model="form.education">
        <option value="">请选择学历</option>
        <option v-for="opt in educationOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <span v-if="errors.education" class="error">{{ errors.education }}</span>
    </div>

    <!-- 职业 -->
    <div class="form-group">
      <label for="occupation">职业 <span class="required">*</span></label>
      <input
        id="occupation"
        v-model="form.occupation"
        type="text"
        placeholder="请输入职业"
        maxlength="50"
      />
      <span v-if="errors.occupation" class="error">{{ errors.occupation }}</span>
    </div>

    <!-- 当前心情 -->
    <div class="form-group">
      <label for="mood">当前心情 <span class="required">*</span></label>
      <input
        id="mood"
        v-model="form.mood"
        type="text"
        placeholder="请描述您当前的心情"
        maxlength="100"
      />
      <span v-if="errors.mood" class="error">{{ errors.mood }}</span>
    </div>

    <BaseButton type="submit" variant="primary" size="large" style="width: 100%; margin-top: 16px">
      开始测试
    </BaseButton>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { EDUCATION_OPTIONS, VALID_SEX_OPTIONS } from '@/utils/constants'
import BaseButton from '@/components/common/BaseButton.vue'

const emit = defineEmits(['submit'])

const educationOptions = EDUCATION_OPTIONS

const form = reactive({
  sex: '',
  age: '',
  education: '',
  occupation: '',
  mood: ''
})

const errors = reactive({
  sex: '',
  age: '',
  education: '',
  occupation: '',
  mood: ''
})

function validate() {
  let isValid = true

  // 清空错误
  Object.keys(errors).forEach(key => { errors[key] = '' })

  // 性别验证
  if (!form.sex || !VALID_SEX_OPTIONS.includes(form.sex)) {
    errors.sex = '请选择性别'
    isValid = false
  }

  // 年龄验证
  const age = parseInt(form.age)
  if (!form.age) {
    errors.age = '请输入年龄'
    isValid = false
  } else if (isNaN(age) || age < 1 || age > 120) {
    errors.age = '请输入有效的年龄（1-120）'
    isValid = false
  }

  // 学历验证
  if (!form.education) {
    errors.education = '请选择学历'
    isValid = false
  }

  // 职业验证
  if (!form.occupation.trim()) {
    errors.occupation = '请输入职业'
    isValid = false
  }

  // 心情验证
  if (!form.mood.trim()) {
    errors.mood = '请描述您当前的心情'
    isValid = false
  }

  return isValid
}

function handleSubmit() {
  if (validate()) {
    emit('submit', {
      sex: form.sex,
      age: form.age,
      education: form.education,
      occupation: form.occupation.trim(),
      mood: form.mood.trim()
    })
  }
}
</script>

<style scoped>
.basic-info-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

.required {
  color: #ef4444;
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #8b5cf6;
  background: rgba(255, 255, 255, 0.15);
}

.form-group select {
  cursor: pointer;
}

.form-group select option {
  background: #1a1a2e;
  color: white;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.radio-item.selected {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
}

.radio-item input {
  display: none;
}

.radio-item span {
  color: white;
  font-size: 14px;
}

.error {
  color: #ef4444;
  font-size: 12px;
}
</style>
