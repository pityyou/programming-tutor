import api from './index'

export interface PracticeRecord {
  id: string
  language: string
  difficulty: string
  topic: string
  exercise: string
  userCode?: string
  passed: boolean
  /** 是否经过测试用例判题（列表接口返回） */
  hasTests?: boolean
  feedback?: string
  results?: { index: number; input: string; expected: string; actual: string; passed: boolean; error?: string }[]
  created_at: string
}

export function savePractice(data: {
  language: string
  difficulty: string
  topic: string
  exercise: string
  userCode: string
  results?: PracticeRecord['results']
  passed: boolean
  feedback?: string
}) {
  return api.post<{ id: string }>('/practice', data)
}

export function updatePractice(id: string, data: {
  userCode: string
  results?: PracticeRecord['results']
  passed: boolean
  feedback?: string
}) {
  return api.put<{ success: boolean }>(`/practice/${id}`, data)
}

export function getPractices(limit = 20) {
  return api.get<{ records: PracticeRecord[] }>(`/practice?limit=${limit}`)
}

export function getPractice(id: string) {
  return api.get<PracticeRecord>(`/practice/${id}`)
}

export function deletePractice(id: string) {
  return api.delete(`/practice/${id}`)
}
