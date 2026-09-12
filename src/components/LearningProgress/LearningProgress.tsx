'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { LocalizedLocale } from '@/i18n/config'
import { createLearningProgressStore, learningChecklistDefinitions, type LearningChecklist } from '@/lib/learning-progress'
import './LearningProgress.css'

const copyByLocale = {
  en: {
    save: 'Save on this device', reset: 'Reset checklist', forget: 'Forget saved progress',
    privacy: 'Optional. Saves only this checklist’s checkmarks in this browser. No account or project details are saved or sent. Anyone using this browser can see them. Quiz answers and calculation inputs are not saved.',
    loading: 'Checking for saved progress…', session: 'Not saved. Checks last only while this page is open.', saved: 'Saved on this device. Your checks will return when you revisit.',
    unavailable: 'Browser storage is unavailable or full. Current checks still work, but the latest changes may not survive a refresh.',
    forgotten: 'Saved progress removed. This checklist is no longer saved.',
    'forget-error': 'Could not remove saved progress. Saving is off and your current checks are kept. Try Forget saved progress again, or clear this site’s browser data to remove older checks.',
    'external-change': 'Saved progress changed or was removed in another tab. Saving is off here; your current checks remain on this page. Select Save on this device again to save these checks.',
  },
  th: {
    save: 'บันทึกไว้ในอุปกรณ์นี้', reset: 'ล้างรายการที่เลือก', forget: 'ลบความคืบหน้าที่บันทึก',
    privacy: 'เลือกได้ตามต้องการ บันทึกเฉพาะเครื่องหมายถูกของรายการนี้ในเบราว์เซอร์ ไม่บันทึกหรือส่งข้อมูลบัญชีและโครงการ ผู้ที่ใช้เบราว์เซอร์นี้ดูรายการได้ ไม่บันทึกคำตอบแบบทดสอบหรือค่าที่ใช้คำนวณ',
    loading: 'กำลังตรวจรายการที่บันทึก…', session: 'ยังไม่บันทึก รายการที่เลือกอยู่เฉพาะขณะเปิดหน้านี้', saved: 'บันทึกในอุปกรณ์นี้แล้ว กลับมาครั้งต่อไปจะเห็นรายการที่เลือกไว้',
    unavailable: 'เบราว์เซอร์ไม่อนุญาตให้บันทึกหรือพื้นที่เต็ม ยังเลือกรายการได้ แต่การเปลี่ยนแปลงล่าสุดอาจหายเมื่อโหลดหน้าใหม่',
    forgotten: 'ลบความคืบหน้าที่บันทึกแล้ว รายการนี้จะไม่ถูกบันทึกต่อ',
    'forget-error': 'ลบข้อมูลที่บันทึกไม่สำเร็จ ปิดการบันทึกแล้วและยังเก็บรายการที่เลือกไว้ในหน้านี้ ลองกดลบอีกครั้ง หรือล้างข้อมูลเว็บไซต์ในเบราว์เซอร์เพื่อลบรายการเก่า',
    'external-change': 'ข้อมูลที่บันทึกถูกเปลี่ยนหรือลบในแท็บอื่น ปิดการบันทึกในหน้านี้แล้ว แต่ยังเก็บรายการที่เลือกไว้ หากต้องการบันทึกอีกครั้ง ให้เลือกบันทึกไว้ในอุปกรณ์นี้',
  },
  zh: {
    save: '保存在此设备', reset: '重置清单', forget: '删除已保存进度',
    privacy: '可选。仅在此浏览器保存本清单的勾选状态，不保存或发送账户和项目资料。使用此浏览器的人都能查看。测验答案和计算输入不会保存。',
    loading: '正在检查已保存进度…', session: '未保存。勾选状态仅在本页面打开时保留。', saved: '已保存在此设备，下次访问时会恢复勾选状态。',
    unavailable: '浏览器存储不可用或已满。仍可勾选，但最新更改可能在刷新后丢失。',
    forgotten: '已删除保存的进度，本清单将不再保存。',
    'forget-error': '无法删除已保存进度。已关闭保存，当前勾选仍保留。请重试删除，或清除此网站的浏览器数据以移除旧记录。',
    'external-change': '其他标签页更改或删除了保存的进度。本页已关闭保存，但保留当前勾选。若要保存这些勾选，请重新选择保存在此设备。',
  },
  ja: {
    save: 'この端末に保存', reset: 'チェックをリセット', forget: '保存した進捗を削除',
    privacy: '任意です。このチェックリストのチェック状態だけをブラウザーに保存します。アカウントや案件情報は保存・送信しません。同じブラウザーを使う人も閲覧できます。クイズの回答や計算の入力値は保存しません。',
    loading: '保存した進捗を確認中…', session: '未保存です。このページを開いている間だけチェックを保持します。', saved: 'この端末に保存しました。次回の閲覧時にチェックが戻ります。',
    unavailable: 'ブラウザーの保存領域が利用できないか、満杯です。チェックは使えますが、最新の変更は再読み込みで失われる場合があります。',
    forgotten: '保存した進捗を削除しました。このリストは今後保存しません。',
    'forget-error': '保存した進捗を削除できませんでした。保存を停止し、現在のチェックは保持しています。削除を再試行するか、このサイトのブラウザーデータを消去してください。',
    'external-change': '別のタブで保存した進捗が変更または削除されました。このページの保存を停止し、現在のチェックは保持しています。保存するには、この端末に保存をもう一度選択してください。',
  },
}

export function useLearningProgress(checklist: LearningChecklist) {
  const [store] = useState(() => createLearningProgressStore(checklist, () => window.localStorage))
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      try {
        if (event.storageArea === window.localStorage) store.syncFromStorage(event.key)
      } catch { /* The next interaction will report unavailable browser storage. */ }
    }
    window.addEventListener('storage', synchronize)
    return () => window.removeEventListener('storage', synchronize)
  }, [store])
  return { ...snapshot, toggle: store.toggle, setSaving: store.setSaving, reset: store.reset, forget: store.forget, ids: learningChecklistDefinitions[checklist].ids }
}

export default function LearningProgress({ locale, checklist, progress }: { locale: LocalizedLocale; checklist: LearningChecklist; progress: ReturnType<typeof useLearningProgress> }) {
  const copy = copyByLocale[locale]
  const id = `learning-progress-${checklist}`
  return <div className="learning-progress" data-checklist={checklist}>
    <label className="learning-progress-save" htmlFor={`${id}-save`}><input id={`${id}-save`} type="checkbox" checked={progress.saveOnDevice} disabled={!progress.ready} aria-describedby={`${id}-privacy ${id}-status`} onChange={(event) => progress.setSaving(event.currentTarget.checked)} /><span>{copy.save}</span></label>
    <p id={`${id}-privacy`}>{copy.privacy}</p>
    <p id={`${id}-status`} className="learning-progress-status" role="status" aria-live="polite">{copy[progress.status]}</p>
    <div className="learning-progress-actions"><button type="button" onClick={progress.reset} disabled={!progress.ready || progress.checked.length === 0}>{copy.reset}</button><button type="button" onClick={progress.forget} disabled={!progress.ready}>{copy.forget}</button></div>
  </div>
}
