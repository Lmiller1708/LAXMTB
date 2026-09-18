import type { WeeklyUpdate, Announcement, HubConfig } from '../types/hub'
import { doc, getDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

export const useHubEmail = () => {
  const db = useFirestore()
  const isSending = ref(false)
  const lastSendError = ref<string | null>(null)

  const fetchHubConfig = async (): Promise<HubConfig | null> => {
    if (!db) return null
    try {
      const snap = await getDoc(doc(db, 'settings', 'hubConfig'))
      if (snap.exists()) {
        return snap.data() as HubConfig
      }
    } catch (err) {
      console.warn('[useHubEmail] Could not load hubConfig:', err)
    }
    return null
  }

  const formatWeeklyUpdateEmailHtml = (update: WeeklyUpdate): string => {
    const practiceStatusBadge =
      update.practiceStatus === 'canceled'
        ? '<span style="color:#ef4444;font-weight:bold;">[CANCELED]</span>'
        : update.practiceStatus === 'moved'
        ? '<span style="color:#f59e0b;font-weight:bold;">[LOCATION MOVED]</span>'
        : '<span style="color:#10b981;font-weight:bold;">[SCHEDULED]</span>'

    const practiceNoteHtml = update.practiceNote
      ? `<p style="margin:4px 0 0 0;color:#f59e0b;font-style:italic;">Note: ${escapeHtml(update.practiceNote)}</p>`
      : ''

    const eventsHtml = update.upcomingEvents?.length
      ? `
      <div style="margin-top:20px;">
        <h3 style="color:#dc2626;margin:0 0 8px 0;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;">Upcoming Events</h3>
        <ul style="padding-left:20px;margin:0 0 16px 0;">
          ${update.upcomingEvents
            .map(
              (e) => `
            <li style="margin-bottom:8px;">
              <strong>${escapeHtml(e.title)}</strong>: ${escapeHtml(e.details)}
              ${e.dueDate ? `<br/><span style="color:#ef4444;font-size:13px;">Due: ${escapeHtml(e.dueDate)}</span>` : ''}
              ${e.link ? `<br/><a href="${escapeHtml(e.link)}" style="color:#2563eb;text-decoration:underline;">Link</a>` : ''}
            </li>
          `
            )
            .join('')}
        </ul>
      </div>`
      : ''

    const notesHtml = update.teamNotes?.length
      ? `
      <div style="margin-top:20px;">
        <h3 style="color:#dc2626;margin:0 0 8px 0;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;">Team Notes</h3>
        ${update.teamNotes
          .map(
            (n) => `
          <div style="margin-bottom:14px;background:#f9fafb;padding:12px;border-left:4px solid #dc2626;border-radius:4px;">
            <h4 style="margin:0 0 4px 0;font-size:15px;color:#111827;">${escapeHtml(n.title)}</h4>
            <p style="margin:0 0 6px 0;color:#374151;white-space:pre-wrap;">${escapeHtml(n.body)}</p>
            ${n.link ? `<a href="${escapeHtml(n.link)}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;">${escapeHtml(n.linkLabel || 'View Details')} &rarr;</a>` : ''}
          </div>
        `
          )
          .join('')}
      </div>`
      : ''

    const attachmentsHtml = update.attachments?.length
      ? `
      <div style="margin-top:20px;padding:12px;background:#f3f4f6;border-radius:6px;">
        <strong style="color:#111827;font-size:14px;">Attachments & Shared Links:</strong>
        <ul style="padding-left:20px;margin:6px 0 0 0;">
          ${update.attachments
            .map(
              (a) => `
            <li><a href="${escapeHtml(a.url)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(a.label)}</a></li>
          `
            )
            .join('')}
        </ul>
      </div>`
      : ''

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial, sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:16px;">
        <div style="border-bottom:3px solid #dc2626;padding-bottom:12px;margin-bottom:16px;">
          <h1 style="color:#111827;margin:0;font-size:22px;">LAX MTB // TEAM UPDATE</h1>
          <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">${escapeHtml(update.title)}</p>
        </div>

        <div style="margin-bottom:16px;white-space:pre-wrap;font-size:15px;color:#1f2937;">
          ${escapeHtml(update.greeting)}
        </div>

        <div style="background:#f3f4f6;padding:14px;border-radius:6px;margin-bottom:16px;">
          <h3 style="margin:0 0 8px 0;font-size:15px;color:#111827;text-transform:uppercase;">Practice Details ${practiceStatusBadge}</h3>
          <p style="margin:4px 0;"><strong>Days:</strong> ${escapeHtml(update.practiceDays)}</p>
          <p style="margin:4px 0;"><strong>Time:</strong> ${escapeHtml(update.practiceTime)}</p>
          <p style="margin:4px 0;"><strong>Location:</strong> ${escapeHtml(update.practiceLocation)}</p>
          ${update.weather ? `<p style="margin:4px 0;"><strong>Weather:</strong> ${escapeHtml(update.weather)}</p>` : ''}
          ${practiceNoteHtml}
        </div>

        ${eventsHtml}
        ${notesHtml}
        ${attachmentsHtml}

        <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:14px;">
          <p style="margin:0;font-size:15px;color:#1f2937;white-space:pre-wrap;">${escapeHtml(update.closingMessage || 'Thanks,\nMatt')}</p>
          <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">Sent via LAX MTB Race Central & Team Hub • <a href="https://laxmtb.com" style="color:#dc2626;">laxmtb.com</a></p>
        </div>
      </body>
      </html>
    `
  }

  const formatAnnouncementEmailHtml = (announcement: Announcement): string => {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial, sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:16px;">
        <div style="border-bottom:3px solid #dc2626;padding-bottom:12px;margin-bottom:16px;">
          <h1 style="color:#111827;margin:0;font-size:22px;">LAX MTB // ANNOUNCEMENT</h1>
          <p style="margin:4px 0 0 0;color:#dc2626;font-weight:bold;text-transform:uppercase;font-size:13px;">${escapeHtml(announcement.priority)} Alert</p>
        </div>

        <h2 style="color:#111827;margin:0 0 12px 0;font-size:18px;">${escapeHtml(announcement.title)}</h2>
        <div style="font-size:15px;color:#374151;white-space:pre-wrap;background:#f9fafb;padding:16px;border-left:4px solid #dc2626;border-radius:4px;">
          ${escapeHtml(announcement.message)}
        </div>

        ${
          announcement.attachments?.length
            ? `
          <div style="margin-top:16px;padding:12px;background:#f3f4f6;border-radius:6px;">
            <strong style="color:#111827;font-size:14px;">Links & Attachments:</strong>
            <ul style="padding-left:20px;margin:6px 0 0 0;">
              ${announcement.attachments
                .map(
                  (a) => `
                <li><a href="${escapeHtml(a.url)}" target="_blank" style="color:#2563eb;text-decoration:underline;">${escapeHtml(a.label)}</a></li>
              `
                )
                .join('')}
            </ul>
          </div>`
            : ''
        }

        <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:14px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Sent via LAX MTB Race Central & Team Hub • <a href="https://laxmtb.com" style="color:#dc2626;">laxmtb.com</a></p>
        </div>
      </body>
      </html>
    `
  }

  const sendEmailToGroup = async (payload: {
    subject: string
    htmlBody: string
    textBody?: string
  }): Promise<{ success: boolean; error?: string }> => {
    isSending.value = true
    lastSendError.value = null
    try {
      const config = await fetchHubConfig()
      if (!config?.webhookUrl) {
        return {
          success: false,
          error: 'Google Apps Script Webhook URL not configured. You can configure it in Hub Settings.'
        }
      }

      const recipient = config.googleGroupEmail || 'lax-mtb-team@googlegroups.com'

      // POST to Google Apps Script Webhook
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          to: recipient,
          subject: payload.subject,
          htmlBody: payload.htmlBody,
          textBody: payload.textBody || payload.subject
        }),
        mode: 'no-cors' // Apps Script web app endpoint typically runs no-cors or redirect
      })

      return { success: true }
    } catch (err: any) {
      const msg = err?.message || 'Failed to dispatch email'
      lastSendError.value = msg
      return { success: false, error: msg }
    } finally {
      isSending.value = false
    }
  }

  const escapeHtml = (str?: string): string => {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  return {
    isSending,
    lastSendError,
    fetchHubConfig,
    formatWeeklyUpdateEmailHtml,
    formatAnnouncementEmailHtml,
    sendEmailToGroup
  }
}
