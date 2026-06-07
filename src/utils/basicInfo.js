/**
 * 解析 get_basic_info 接口响应，统一为 testStore 使用的英文字段格式
 */
export function normalizeBasicInfoResponse(response) {
  if (!response || response.code !== 0) return null

  const payload = response.data?.basic_info ?? response.data
  if (!payload || typeof payload !== 'object') return null

  const sex = payload.sex ?? payload.性别 ?? ''
  const age = payload.age ?? payload.年龄 ?? ''
  const education = payload.education ?? payload.学历 ?? ''
  const occupation = payload.occupation ?? payload.职业 ?? ''
  const mood = payload.mood ?? payload.当前心情 ?? ''

  if (!sex && !age && !education && !occupation && !mood) return null

  return {
    sex: String(sex || ''),
    age: String(age || ''),
    education: String(education || ''),
    occupation: String(occupation || ''),
    mood: String(mood || '')
  }
}

export function parseAgeFromBasicInfo(source) {
  if (!source) return null

  const payload = source.basic_info ?? source
  if (!payload || typeof payload !== 'object') return null

  const raw = payload.age ?? payload.年龄
  if (raw === null || raw === undefined || raw === '') return null

  const match = String(raw).match(/\d+/)
  const age = match ? parseInt(match[0], 10) : parseInt(raw, 10)
  return Number.isFinite(age) ? age : null
}
