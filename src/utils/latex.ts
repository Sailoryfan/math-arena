import katex from 'katex'

export function renderLatex(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: false,
      })
    } catch {
      return formula
    }
  })
}

export function renderLatexBlock(text: string): string {
  return text.replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: true,
      })
    } catch {
      return formula
    }
  })
}

/**
 * 从答案中提取纯数值
 * 处理 $-5°C$、$3$、$100m$ 等格式
 */
function extractNumber(s: string): string {
  // 去除 $ 符号
  s = s.replace(/\$/g, '')
  // 去除常见单位
  s = s.replace(/°[CcFf]?/g, '').replace(/[mM元]/g, '').replace(/个/g, '')
  // 去除空格
  s = s.trim()
  return s
}

/**
 * 比较用户答案和正确答案是否匹配
 * 处理空格、数字格式、LaTeX格式等差异
 */
export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  // 去除前后空格
  let user = userAnswer.trim()
  let correct = correctAnswer.trim()

  // 完全匹配
  if (user === correct) return true

  // 从答案中提取纯数值
  user = extractNumber(user)
  correct = extractNumber(correct)

  // 再次比较
  if (user === correct) return true

  // 统一数字格式后比较
  const normalizeNumber = (s: string): string => {
    // 去除千位分隔符
    s = s.replace(/,/g, '')
    // 如果是数字，统一格式
    const num = Number(s)
    if (!isNaN(num) && s !== '') {
      return Number.isInteger(num) ? num.toString() : num.toString()
    }
    return s
  }

  const normalizedUser = normalizeNumber(user)
  const normalizedCorrect = normalizeNumber(correct)

  if (normalizedUser === normalizedCorrect) return true

  // 处理分数形式，如 "1/2" 和 "0.5"
  const parseFraction = (s: string): number | null => {
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 2) {
        const num = Number(parts[0])
        const den = Number(parts[1])
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          return num / den
        }
      }
    }
    return null
  }

  const userFrac = parseFraction(user)
  const correctFrac = parseFraction(correct)
  if (userFrac !== null && correctFrac !== null && Math.abs(userFrac - correctFrac) < 0.0001) {
    return true
  }

  // 用户输入分数，答案是小数
  if (userFrac !== null) {
    const correctNum = Number(correct)
    if (!isNaN(correctNum) && Math.abs(userFrac - correctNum) < 0.0001) {
      return true
    }
  }

  // 用户输入小数，答案是分数
  if (correctFrac !== null) {
    const userNum = Number(user)
    if (!isNaN(userNum) && Math.abs(userNum - correctFrac) < 0.0001) {
      return true
    }
  }

  return false
}
