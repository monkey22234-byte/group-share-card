import { WeeklyTopic, ActionCommitment } from '../types';

/**
 * Formats weekly group sharing actions into a clean, beautiful LINE group message
 */
export function formatLineGroupMessage(topic: WeeklyTopic | null, actions: ActionCommitment[]): string {
  const dateStr = topic?.date || new Date().toISOString().split('T')[0];
  
  let msg = `🌿【小組生活行動與代禱守望】🌿\n`;
  msg += `📅 日期：${dateStr}\n`;
  if (topic?.title) {
    msg += `📖 主題：${topic.title}\n`;
  }
  if (topic?.mainScripture) {
    msg += `✨ 經文：${topic.mainScripture}\n`;
  }
  if (topic?.summary) {
    msg += `💡 本週核心亮光：${topic.summary}\n`;
  }
  
  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `🎯【夥伴本週具體行動方案】：\n\n`;

  if (actions.length === 0) {
    msg += `（目前尚未登錄行動方案，歡迎大家自由在底下留言接龍本週行動！）\n`;
  } else {
    actions.forEach((act, idx) => {
      const displayName = act.memberName?.trim() || '小組夥伴';
      msg += `${idx + 1}. 【${displayName}】\n`;
      msg += `   📌 行動：${act.actionText || '具體實踐生活中活出真理'}\n`;
      if (act.prayerNeeds && act.prayerNeeds.trim()) {
        msg += `   🙏 代禱：${act.prayerNeeds.trim()}\n`;
      }
      if (act.targetDate) {
        msg += `   ⏰ 目標日期：${act.targetDate}\n`;
      }
      msg += `\n`;
    });
  }

  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `🙌「我們相愛，不要只在言語和舌頭上，總要在行為和誠實上。」(約壹 3:18)\n`;
  msg += `💪 本週讓我們一起在生活中活出真理，彼此代禱加油！`;

  return msg;
}

/**
 * Creates LINE direct share URL schema
 */
export function getLineShareUrl(formattedText: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(formattedText)}`;
}

/**
 * Copies text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
}
