// 모의고사 채점 로직. 기존 온라인_OMR 시스템(Grading.gs / Constants.gs)의 동작을 그대로 옮긴 것.
// 원본은 1-based 배열을 썼지만 여기서는 JSON 저장에 자연스럽도록 0-based 배열(index 0 = 1번 문항)을 쓴다.

export const TOTAL_QUESTIONS = 45
export const LISTENING_RANGE = { start: 1, end: 17 }

// 문항번호(1~45) -> 표준 유형. 듣기 문항(1~17)은 세부 구분 없이 "듣기"로 통일.
const NON_LISTENING_TYPES = {
  18: '목적',
  19: '심경·분위기',
  20: '주장',
  21: '함축의미',
  22: '요지',
  23: '주제',
  24: '제목',
  25: '도표',
  26: '내용불일치',
  27: '안내문',
  28: '안내문',
  29: '어법',
  30: '어휘',
  31: '빈칸추론',
  32: '빈칸추론',
  33: '빈칸추론',
  34: '빈칸추론',
  35: '무관한문장',
  36: '순서배열',
  37: '순서배열',
  38: '문장삽입',
  39: '문장삽입',
  40: '요약문',
  41: '장문(1)',
  42: '장문(1)',
  43: '장문(2)',
  44: '장문(2)',
  45: '장문(2)',
}

export function getQuestionType(q) {
  if (q >= LISTENING_RANGE.start && q <= LISTENING_RANGE.end) return '듣기'
  return NON_LISTENING_TYPES[q] ?? '기타'
}

// 유형별 정답률 표시 순서 (모의고사 문항 순서 기준)
export const QUESTION_TYPE_ORDER = [
  '듣기',
  '목적',
  '심경·분위기',
  '주장',
  '함축의미',
  '요지',
  '주제',
  '제목',
  '도표',
  '내용불일치',
  '안내문',
  '어법',
  '어휘',
  '빈칸추론',
  '무관한문장',
  '순서배열',
  '문장삽입',
  '요약문',
  '장문(1)',
  '장문(2)',
]

/**
 * 답안을 채점한다.
 * @param {{ includesListening: boolean, answerKey: (number|null)[], points: number[] }} exam 45개 0-based 배열
 * @param {(number|null)[]} answers 45개 0-based 배열, 무응답은 0 또는 null
 */
export function gradeAnswers(exam, answers) {
  const questionResults = []
  const typeStats = {}
  let totalScore = 0

  for (let q = 1; q <= TOTAL_QUESTIONS; q++) {
    const i = q - 1
    const isListening = q >= LISTENING_RANGE.start && q <= LISTENING_RANGE.end
    const type = getQuestionType(q)
    const points = Number(exam.points?.[i]) || 0
    const correctAnswer = exam.answerKey?.[i] ?? null
    const studentAnswer = answers?.[i] || null

    // 듣기 미포함 시험은 듣기 문항을 자동 만점 처리하고 유형별 통계에서는 제외한다.
    const autoFullScore = isListening && !exam.includesListening
    const isCorrect = autoFullScore ? true : Number(studentAnswer) === Number(correctAnswer)
    const counted = !autoFullScore

    if (isCorrect) totalScore += points

    if (counted) {
      if (!typeStats[type]) typeStats[type] = { correct: 0, total: 0 }
      typeStats[type].total += 1
      if (isCorrect) typeStats[type].correct += 1
    }

    questionResults.push({
      q,
      type,
      studentAnswer: autoFullScore ? null : studentAnswer,
      correctAnswer,
      points,
      isCorrect,
      counted,
    })
  }

  return { totalScore, questionResults, typeStats }
}

/**
 * "5,5,3 5 2" 처럼 쉼표/공백/줄바꿈이 섞인 입력을 45개 숫자 배열로 파싱한다.
 * @returns {{ values: (number|null)[], error: string }}
 */
export function parseNumberList(text, { expected = TOTAL_QUESTIONS, min, max } = {}) {
  const tokens = String(text)
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t !== '')

  if (tokens.length === 0) return { values: [], error: '값을 입력해주세요.' }
  if (tokens.length !== expected) {
    return { values: [], error: `${expected}개가 필요한데 ${tokens.length}개가 입력되었습니다.` }
  }

  const values = []
  for (let i = 0; i < tokens.length; i++) {
    const n = Number(tokens[i])
    if (!Number.isFinite(n)) return { values: [], error: `${i + 1}번 값 "${tokens[i]}"이 숫자가 아닙니다.` }
    if (min != null && n < min) return { values: [], error: `${i + 1}번 값이 ${min} 미만입니다.` }
    if (max != null && n > max) return { values: [], error: `${i + 1}번 값이 ${max} 초과입니다.` }
    values.push(n)
  }
  return { values, error: '' }
}
