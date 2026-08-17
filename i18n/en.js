// מילון התרגום לאנגלית — נטען גם ב-index.html וגם ב-background.html.
// המפתחות הם מחרוזות המקור בעברית (כמצוין ב-API_REFERENCE § תוסף רב-לשוני);
// מחרוזת שאין לה מפתח כאן נשארת בעברית באופן טבעי.
// {n} / {q} / {v} / {msg} / {total} הם מצייני מקום שממולאים ב-t().
window.TRANSLATIONS = window.TRANSLATIONS || {};
window.TRANSLATIONS.en = {
  // ── סרגל הכותרת והפילטרים ──
  'חנות תוספים': 'Plugin Store',
  'רענן רשימה': 'Refresh list',
  'חיפוש לפי שם, תיאור או תגית...': 'Search by name, description or tag…',
  'כל הסטטוסים': 'All statuses',
  'יציב': 'Stable',
  'בטא': 'Beta',
  'ניסיוני': 'Experimental',
  'הסתרת תוספים שכבר מותקנים אצלך (למעט כאלה עם עדכון זמין)':
    'Hide plugins you already have installed (except those with an available update)',
  'הסתר מותקנים': 'Hide installed',

  // ── מצבים ומונים ──
  'טוען תוספים...': 'Loading plugins…',
  'לא נמצאו תוספים לפי הסינון.': 'No plugins match the current filter.',
  'שגיאת רשת': 'Network error',
  'שגיאה בטעינת התוספים: {msg}': 'Failed to load plugins: {msg}',
  '{n} תוספים': '{n} plugins',
  '{n} מתוך {total}': '{n} of {total}',

  // ── ניווט ותצוגות ──
  'בית': 'Home',
  'כל התוספים ({n})': 'All plugins ({n})',
  'תוספים נבחרים': 'Featured',
  'לכל הקטגוריה ({n}) ←': 'See all ({n}) →',
  'לא מצאתם את מה שחיפשתם? ': 'Didn’t find what you were looking for? ',
  'עיינו בכל התוספים ({n}) ←': 'Browse all plugins ({n}) →',
  'קטגוריה': 'Category',
  'שגיאה בטעינת הקטגוריה — נסו לרענן': 'Failed to load the category — try refreshing',
  'נמצאו {n} תוצאות עבור „{q}"': 'Found {n} results for “{q}”',
  'לא נמצאו התאמות מדויקות — מוצגות תוצאות קרובות': 'No exact matches — showing close results',
  'כל התגיות': 'All tags',
  'הצג עוד': 'Show more',
  'הצג פחות': 'Show less',

  // ── כרטיס ותגיות ──
  'גרסה {v}': 'Version {v}',
  '{n} הורדות': '{n} downloads',
  'כמות הורדות': 'Download count',
  // סוגריים סביב מספר המדרגים בתגית הדירוג
  '({n})': '({n})',
  'דירוג ממוצע מתוך {n} מדרגים': 'Average rating from {n} ratings',

  // ── דף פרטים ──
  // חץ החזרה — מצביע לכיוון הפוך בין rtl ל-ltr
  '→': '←',
  'חזרה לחנות': 'Back to store',
  'מידע כללי': 'General info',
  'גרסה': 'Version',
  'סטטוס': 'Status',
  'הורדות': 'Downloads',
  'גודל': 'Size',
  'מפתח': 'Developer',
  'עודכן': 'Updated',
  'תאימות': 'Compatibility',
  'חיבור אינטרנט': 'Internet connection',
  'נדרש': 'Required',
  '✓ לא נדרש': '✓ Not required',
  'שים לב': 'Note',
  'מוצגת הגרסה התואמת לגרסת אוצריא שלך. קיימת גרסה חדשה יותר ({v}) הדורשת גרסת אוצריא מתקדמת יותר.':
    'Showing the version compatible with your Otzaria build. A newer version ({v}) exists but requires a newer Otzaria.',
  'תגיות': 'Tags',
  // ── דירוגים (תצוגה בלבד; הדירוג עצמו נעשה באתר) ──
  'דירוג המשתמשים': 'User ratings',
  '{n} מדרגים': '{n} ratings',
  '{n} דירוגים מאומתים': '{n} verified ratings',
  'מדרגים שהתקנת התוסף אצלם נרשמה בפועל': 'raters whose installation was actually recorded',
  'הדירוג נאסף בדף התוסף באתר החנות': 'Ratings are collected on the plugin page at the store website',
  'התוסף עדיין לא דורג': 'This plugin has no ratings yet',
  'צילומי מסך': 'Screenshots',
  'צילום מסך': 'Screenshot',

  // ── התקנה ועדכון ──
  'מותקן ✓': 'Installed ✓',
  'עדכון': 'Update',
  'התקנה': 'Install',
  'מתקין...': 'Installing…',
  'מעדכן...': 'Updating…',
  'הותקן בהצלחה!': 'Installed successfully!',
  'עודכן בהצלחה!': 'Updated successfully!',
  'ההתקנה נכשלה - לחץ שוב לנסיון נוסף': 'Installation failed — click again to retry',
  'העדכון נכשל - לחץ שוב לנסיון נוסף': 'Update failed — click again to retry',
  'שגיאה': 'Error',
  'נשלח ✓': 'Sent ✓',

  // ── חלונית העדכונים ──
  'עדכונים זמינים ({n})': 'Updates available ({n})',
  '{from} ← {to}': '{from} → {to}',
  'עדכן': 'Update',
  'עדכן הכל': 'Update all',
  'הושלם ✓': 'Done ✓',
  'נסה שוב את מה שנכשל': 'Retry the ones that failed',

  // ── הודעת תוסף חדש ──
  'תוסף חדש בחנות!': 'A new plugin is in the store!',
  '{n} תוספים חדשים בחנות!': '{n} new plugins are in the store!',
  'צפה': 'View',
  'סגור': 'Close',

  // ── הודעות מופע הרקע ──
  'יש עדכונים זמינים לתוספים שברשותך וגם תוספים חדשים בחנות. לחצו כאן לפתיחת חנות התוספים.':
    'Updates are available for your plugins, and there are new plugins in the store. Click here to open the Plugin Store.',
  'יש עדכונים זמינים לתוספים שברשותך. לחצו כאן לפתיחת חנות התוספים.':
    'Updates are available for your plugins. Click here to open the Plugin Store.',
  'יש תוסף חדש בחנות התוספים. לחצו כאן לפתיחה.':
    'A new plugin is available in the Plugin Store. Click here to open it.',
  'יש {n} תוספים חדשים בחנות התוספים. לחצו כאן לפתיחה.':
    '{n} new plugins are available in the Plugin Store. Click here to open it.',
};
