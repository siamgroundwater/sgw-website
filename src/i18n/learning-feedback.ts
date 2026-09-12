export const learningFeedback = {
  th: { incomplete: 'กรอกตัวเลขให้ครบและแก้ช่องที่มีข้อความเตือนเพื่อดูผล', pumpingLevel: 'ระดับน้ำขณะสูบต้องไม่น้อยกว่าระดับน้ำก่อนสูบ เมื่อวัดความลึกจากจุดอ้างอิงเดียวกัน', copyFailed: 'คัดลอกไม่สำเร็จ โปรดลองอีกครั้ง หรือใช้ปุ่มดาวน์โหลดถ้ามี', markComplete: 'ทำเครื่องหมายว่าเตรียมพร้อมแล้ว', markIncomplete: 'ยกเลิกเครื่องหมายพร้อม' },
  en: { incomplete: 'Complete the numbers and correct the highlighted fields to see results.', pumpingLevel: 'Pumping water depth must be at least the static water depth, measured from the same reference point.', copyFailed: 'Could not copy. Please try again, or use Download if available.', markComplete: 'Mark as ready', markIncomplete: 'Mark as not ready' },
  zh: { incomplete: '请填写数字并修正提示的输入项，以查看结果。', pumpingLevel: '从同一基准点测量时，抽水水位埋深不得小于静水位埋深。', copyFailed: '复制失败，请重试；如有下载按钮，也可下载。', markComplete: '标记为已准备', markIncomplete: '标记为未准备' },
  ja: { incomplete: '数値を入力し、指摘された欄を修正すると結果が表示されます。', pumpingLevel: '同じ基準点から測る動水位の深さは、静水位の深さ以上にしてください。', copyFailed: 'コピーできませんでした。再試行するか、ダウンロードボタンがあればご利用ください。', markComplete: '準備済みにする', markIncomplete: '未準備に戻す' },
} as const
